import axios from 'axios';
import authService from './authService';
import cacheService from './cacheService';

// Create a service for handling match-related API calls with enhanced error handling
const matchesServiceEnhanced = {
  /**
   * Get match details by ID with caching support and better error handling
   * @param {string} matchId - PUBG match ID
   * @param {string} platform - Platform (default: steam)
   * @param {boolean} bypassCache - Force refresh from API even if cached
   * @returns {Promise<Object>} Match data
   */
  async getMatchDetails(matchId, platform = 'steam', bypassCache = false) {
    try {
      // First, check if we have this match cached (unless bypass requested)
      if (!bypassCache) {
        const cachedMatch = cacheService.getMatch(matchId, platform);
        if (cachedMatch) {
          console.log(`Using cached data for match: ${matchId}`);
          return cachedMatch;
        }
      }
      
      // Get auth token if available
      const token = authService.getToken();
      
      // Request headers
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Make API request with retry logic
      console.log(`Fetching match data from API: ${matchId}`);
      let retries = 2;
      let lastError = null;
      
      while (retries >= 0) {
        try {
          const response = await axios.get(`/api/matches/${matchId}?platform=${platform}`, { 
            headers,
            timeout: 15000 // 15 second timeout
          });
          
          // If response is empty or missing key attributes, throw an error
          if (!response.data || !response.data.data) {
            throw new Error('Invalid response format from API');
          }
          
          // Cache the successful response
          cacheService.storeMatch(matchId, platform, response.data);
          
          return response.data;
        } catch (error) {
          lastError = error;
          
          // If it's a 404, don't retry
          if (error.response && error.response.status === 404) {
            throw new Error('Match not found');
          }
          
          // Don't retry if we've exhausted retries
          if (retries <= 0) {
            break;
          }
          
          // Wait before retry (1s, then 2s)
          const delay = (2 - retries) * 1000 + 1000;
          console.log(`Retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          retries--;
        }
      }
      
      // If we reach here, all retries failed
      
      // Handle specific error cases
      if (lastError.response) {
        // Handle rate limit specifically
        if (lastError.response.status === 429) {
          console.warn('Rate limit reached for PUBG API, checking cache for fallback');
          
          // Check if we have any cached data as fallback
          const cachedMatch = cacheService.getMatch(matchId, platform);
          if (cachedMatch) {
            console.log('Using cached data due to rate limiting');
            return cachedMatch;
          }
          
          throw new Error('API rate limit exceeded and no cached data available. Please try again later.');
        } 
        else if (lastError.response.status === 401) {
          throw new Error('Authentication required');
        } else {
          throw new Error(`API error: ${lastError.response.data?.error || 'Unknown error'}`);
        }
      } else if (lastError.code === 'ECONNABORTED') {
        console.warn('Request timeout, checking cache for fallback');
        // Check cache as fallback
        const cachedMatch = cacheService.getMatch(matchId, platform);
        if (cachedMatch) {
          console.log('Using cached data due to timeout');
          return cachedMatch;
        }
        throw new Error('Request timed out. The server might be overloaded.');
      } else if (lastError.code === 'ECONNRESET') {
        console.warn('Connection reset by server, checking cache for fallback');
        // Check cache as fallback
        const cachedMatch = cacheService.getMatch(matchId, platform);
        if (cachedMatch) {
          console.log('Using cached data due to connection reset');
          return cachedMatch;
        }
        throw new Error('Connection reset by server. Please try again later.');
      } else if (lastError.request) {
        // No response received, check cache as fallback
        const cachedMatch = cacheService.getMatch(matchId, platform);
        if (cachedMatch) {
          console.log('Using cached data due to connection issue');
          return cachedMatch;
        }
        
        throw new Error('No response from server. Please check your connection.');
      } else {
        // Something else went wrong
        throw lastError;
      }
    } catch (error) {
      console.error(`Error getting match details: ${matchId}`, error);
      throw error;
    }
  },
  
  /**
   * Get telemetry data for a match with caching
   * @param {string} matchId - PUBG match ID
   * @param {string} telemetryUrl - URL to telemetry data (if known)
   * @param {string} platform - Platform (default: steam)
   * @param {boolean} bypassCache - Force refresh from API
   * @returns {Promise<Object>} Telemetry data
   */
  async getTelemetry(matchId, telemetryUrl = null, platform = 'steam', bypassCache = false) {
    const cacheKey = `telemetry_${matchId}`;
    
    try {
      // Check cache first
      if (!bypassCache) {
        // We use the regular localStorage for telemetry due to its large size
        const cachedTelemetry = localStorage.getItem(cacheKey);
        if (cachedTelemetry) {
          try {
            const parsed = JSON.parse(cachedTelemetry);
            console.log(`Using cached telemetry data for match: ${matchId}`);
            return parsed;
          } catch (e) {
            // Invalid cache, remove it
            localStorage.removeItem(cacheKey);
          }
        }
      }
      
      // Get auth token if available
      const token = authService.getToken();
      
      // Request headers
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // We need to get the telemetry URL first if not provided
      if (!telemetryUrl) {
        console.log(`Fetching match data to get telemetry URL: ${matchId}`);
        // Try to get from cache first
        let matchData = null;
        
        try {
          matchData = await this.getMatchDetails(matchId, platform, bypassCache);
          
          // Extract telemetry URL from match data
          if (matchData.data && matchData.included) {
            const assets = matchData.included.filter(item => item.type === 'asset');
            if (assets.length > 0) {
              telemetryUrl = assets[0]?.attributes?.URL;
            }
          }
        } catch (error) {
          console.error('Error getting match data for telemetry:', error);
        }
        
        if (!telemetryUrl) {
          throw new Error('Could not find telemetry URL for this match');
        }
      }

      // Make API request to get telemetry data
      console.log(`Fetching telemetry data for match: ${matchId}`);
      
      // Use our server endpoint instead of direct telemetry URL
      // This helps avoid CORS issues and provides better error handling
      const response = await axios.get(`/api/telemetry/${matchId}?platform=${platform}`, { 
        headers,
        timeout: 45000 // Extended timeout for large telemetry files
      });
      
      // Cache the telemetry data
      try {
        localStorage.setItem(cacheKey, JSON.stringify(response.data));
        console.log(`Cached telemetry data for match: ${matchId}`);
      } catch (e) {
        // Local storage might be full - telemetry can be very large
        console.warn('Could not cache telemetry data - likely too large for localStorage');
        // Try to clear some space
        cacheService.clearOldCache();
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching telemetry:', error);
      
      // Handle specific error cases
      if (error.response) {
        if (error.response.status === 404) {
          throw new Error('Telemetry data not found');
        } else if (error.response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`API error: ${error.response.data?.error || 'Unknown error'}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Telemetry data is large and may take time to load.');
      } else if (error.code === 'ECONNRESET') {
        throw new Error('Connection reset by server. Please try again later.');
      } else if (error.request) {
        throw new Error('No response from server. Please check your connection.');
      } else {
        throw error;
      }
    }
  },
  
  /**
   * Search for matches based on criteria with improved reliability
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object>} Search results
   */
  async searchMatches(criteria) {
    try {
      // Get auth token if available
      const token = authService.getToken();
      
      // Request headers
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Implement retry logic with exponential backoff
      let retries = 2;
      let lastError = null;
      
      while (retries >= 0) {
        try {
          console.log(`Searching for matches (attempt ${2 - retries + 1}/3)`);
          
          // Add a timeout to prevent hanging requests
          const response = await axios.post('/api/matches/search', criteria, { 
            headers,
            timeout: 30000 // 30 second timeout for search
          });
          
          // Make sure we return the data in the expected format
          return response.data;
        } catch (error) {
          lastError = error;
          
          // Don't retry if we've exhausted retries
          if (retries <= 0) {
            break;
          }
          
          // Wait before retry (2s, then 4s)
          const delay = (3 - retries) * 2000;
          console.log(`Search failed. Retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          retries--;
        }
      }
      
      // If we reach here, all retries failed
      console.error('All search attempts failed:', lastError);
      
      // Handle specific error cases
      if (lastError.response) {
        // Server responded with an error status
        if (lastError.response.status === 401) {
          throw new Error('Authentication required');
        } else if (lastError.response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`API error: ${lastError.response.data?.error || lastError.response.statusText || 'Unknown error'}`);
        }
      } else if (lastError.code === 'ECONNABORTED') {
        // Request timed out
        throw new Error('Request timed out. The server might be overloaded.');
      } else if (lastError.code === 'ECONNRESET') {
        // Connection reset by server
        throw new Error('Connection reset by server. Please try again later.');
      } else if (lastError.request) {
        // No response received
        throw new Error('No response from server. Please check your connection.');
      } else {
        // Something else went wrong
        throw lastError;
      }
    } catch (error) {
      console.error('Error in searchMatches:', error);
      throw error;
    }
  },
  
  /**
   * Register a match to a tournament
   * @param {Object} matchData - Match registration data
   * @returns {Promise<Object>} Registration result
   */
  async registerMatch(matchData) {
    try {
      // Get auth token (required for this operation)
      const token = authService.getToken();
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Request headers
      const headers = {
        Authorization: `Bearer ${token}`
      };

      // Make API request with retry logic
      let retries = 2;
      let lastError = null;
      
      while (retries >= 0) {
        try {
          const response = await axios.post('/api/matches/register', matchData, { 
            headers,
            timeout: 10000 // 10 second timeout
          });
          
          return response.data;
        } catch (error) {
          lastError = error;
          
          // If it's a 404 or 409, don't retry (match not found or already registered)
          if (error.response && (error.response.status === 404 || error.response.status === 409)) {
            throw error;
          }
          
          // Don't retry if we've exhausted retries
          if (retries <= 0) {
            break;
          }
          
          // Wait before retry (1s, then 2s)
          const delay = (2 - retries) * 1000 + 1000;
          console.log(`Retrying match registration after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          retries--;
        }
      }
      
      // If we reach here, all retries failed
      // Handle specific error cases
      if (lastError.response) {
        // Server responded with an error status
        if (lastError.response.status === 401) {
          throw new Error('Authentication required');
        } else if (lastError.response.status === 404) {
          throw new Error('Match not found');
        } else if (lastError.response.status === 409) {
          throw new Error('Match is already registered to a tournament');
        } else if (lastError.response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`API error: ${lastError.response.data?.error || 'Unknown error'}`);
        }
      } else if (lastError.request) {
        // No response received
        throw new Error('No response from server. Please check your connection.');
      } else {
        // Something else went wrong
        throw lastError;
      }
    } catch (error) {
      console.error('Error registering match:', error);
      throw error;
    }
  }
};

export default matchesServiceEnhanced;