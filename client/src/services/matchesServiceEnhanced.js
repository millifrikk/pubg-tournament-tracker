import axios from 'axios';
import authService from './authService';

// Import the cache service if available
let cacheService;
try {
  cacheService = require('./cacheService').default;
} catch (e) {
  // Create a simple cache if the service doesn't exist
  cacheService = {
    getMatch: () => null,
    storeMatch: () => {},
    clearOldCache: () => {}
  };
  console.warn('CacheService not available, using fallback cache');
}

class MatchesServiceEnhanced {
  /**
   * Search for matches with enhanced error handling and retry logic
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
          
          // If it's a 404 or other specific error, don't retry
          if (error.response && error.response.status === 404) {
            throw error;
          }
          
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
        throw new Error('Request timed out. The server might be overloaded or try a more specific search.');
      } else if (lastError.code === 'ECONNRESET') {
        // Connection reset by server
        throw new Error('Connection reset by server. Please try a more specific search with fewer results.');
      } else if (lastError.request) {
        // No response received
        throw new Error('No response from server. Please check your connection and try again.');
      } else {
        // Something else went wrong
        throw lastError;
      }
    } catch (error) {
      console.error('Error in searchMatches:', error);
      throw error;
    }
  }

  /**
   * Get match details by ID with enhanced error handling, retry logic and caching
   * @param {string} matchId - PUBG match ID
   * @param {string} platform - Platform (default: steam)
   * @param {boolean} bypassCache - Force refresh from API even if cached
   * @returns {Promise<Object>} Match data
   */
  async getMatchDetails(matchId, platform = 'steam', bypassCache = false) {
    try {
      // First, check if we have this match cached (unless bypass requested)
      if (!bypassCache && cacheService) {
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

      // Implement retry logic with exponential backoff
      let retries = 2;
      let lastError = null;
      
      while (retries >= 0) {
        try {
          console.log(`Fetching match data from API: ${matchId} (attempt ${2 - retries + 1}/3)`);
          
          // Make API request with timeout
          const response = await axios.get(`/api/matches/${matchId}?platform=${platform}`, { 
            headers,
            timeout: 30000 // 30 second timeout
          });
          
          // If response is empty or missing key attributes, throw an error
          if (!response.data || !response.data.data) {
            throw new Error('Invalid response format from API');
          }
          
          // Cache the successful response
          if (cacheService) {
            cacheService.storeMatch(matchId, platform, response.data);
          }
          
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
          
          // For rate limiting, wait longer
          if (error.response && error.response.status === 429) {
            // Check cache as fallback for rate limiting
            if (cacheService) {
              const cachedMatch = cacheService.getMatch(matchId, platform);
              if (cachedMatch) {
                console.log('Using cached data due to rate limiting');
                return cachedMatch;
              }
            }
            
            const delay = 5000; // 5 seconds for rate limit
            console.log(`Rate limit hit. Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Regular exponential backoff for other errors
            const delay = (3 - retries) * 2000;
            console.log(`Request failed. Retrying after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          retries--;
        }
      }
      
      // If we reach here, all retries failed
      console.error('All match detail requests failed:', lastError);
      
      // Check if we have any cached data as fallback
      if (cacheService) {
        const cachedMatch = cacheService.getMatch(matchId, platform);
        if (cachedMatch) {
          console.log('Using cached data after all retries failed');
          return cachedMatch;
        }
      }
      
      // Handle specific error cases
      if (lastError.response) {
        if (lastError.response.status === 404) {
          throw new Error('Match not found');
        } else if (lastError.response.status === 429) {
          throw new Error('API rate limit exceeded and no cached data available. Please try again later.');
        } else if (lastError.response.status === 401) {
          throw new Error('Authentication required');
        } else {
          throw new Error(`API error: ${lastError.response.data?.error || 'Unknown error'}`);
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
      console.error('Error in getMatchDetails:', error);
      throw error;
    }
  }
  
  /**
   * Get telemetry data for a match with enhanced error handling and caching
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

      // Implement retry logic with exponential backoff
      let retries = 2;
      let lastError = null;
      
      while (retries >= 0) {
        try {
          console.log(`Fetching telemetry data from URL: ${telemetryUrl} (attempt ${2 - retries + 1}/3)`);
          
          // Make API request with extended timeout for large telemetry files
          const response = await axios.get(telemetryUrl, { 
            headers,
            timeout: 60000 // 60 second timeout for telemetry
          });
          
          // Cache the telemetry data
          try {
            localStorage.setItem(cacheKey, JSON.stringify(response.data));
            console.log(`Cached telemetry data for match: ${matchId}`);
          } catch (e) {
            // Local storage might be full - telemetry can be very large
            console.warn('Could not cache telemetry data - likely too large for localStorage');
            // Try to clear some space
            if (cacheService && cacheService.clearOldCache) {
              cacheService.clearOldCache();
            }
          }
          
          return response.data;
        } catch (error) {
          lastError = error;
          
          // If it's a 404, don't retry
          if (error.response && error.response.status === 404) {
            throw new Error('Telemetry data not found');
          }
          
          // Don't retry if we've exhausted retries
          if (retries <= 0) {
            break;
          }
          
          // Wait before retry (5s, then 10s) - telemetry is large so we wait longer
          const delay = (3 - retries) * 5000;
          console.log(`Telemetry request failed. Retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          retries--;
        }
      }
      
      // Handle specific error cases after all retries failed
      if (lastError.response) {
        if (lastError.response.status === 404) {
          throw new Error('Telemetry data not found');
        } else if (lastError.response.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`API error: ${lastError.response.data?.error || 'Unknown error'}`);
        }
      } else if (lastError.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Telemetry data might be too large.');
      } else if (lastError.code === 'ECONNRESET') {
        throw new Error('Connection reset while fetching telemetry. Please try again later.');
      } else if (lastError.request) {
        throw new Error('No response from server. Please check your connection.');
      } else {
        throw lastError;
      }
    } catch (error) {
      console.error('Error in getTelemetry:', error);
      throw error;
    }
  }
  
  /**
   * Register a match to a tournament with enhanced error handling
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

      // Implement retry logic with exponential backoff
      let retries = 1; // Fewer retries for write operations
      let lastError = null;
      
      while (retries >= 0) {
        try {
          console.log(`Registering match (attempt ${1 - retries + 1}/2)`);
          
          // Make API request
          const response = await axios.post('/api/matches/register', matchData, { 
            headers,
            timeout: 30000 // 30 second timeout
          });
          
          return response.data;
        } catch (error) {
          lastError = error;
          
          // If it's a 404, 401, or 409, don't retry
          if (error.response && [404, 401, 409].includes(error.response.status)) {
            throw error;
          }
          
          // Don't retry if we've exhausted retries
          if (retries <= 0) {
            break;
          }
          
          // Wait before retry (3s)
          const delay = 3000;
          console.log(`Registration failed. Retrying after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          retries--;
        }
      }
      
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
      console.error('Error in registerMatch:', error);
      throw error;
    }
  }
}

export default new MatchesServiceEnhanced();