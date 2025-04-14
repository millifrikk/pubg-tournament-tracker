const axios = require('axios');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

class PubgApiServiceEnhanced {
  constructor() {
    this.apiKey = process.env.PUBG_API_KEY;
    this.baseUrl = 'https://api.pubg.com';
    this.maxRetries = 3;
    this.retryDelay = 2000; // Base delay in ms
    
    console.log('Enhanced PUBG API service initialized');
  }

  // Helper method to make API calls with retry logic
  async makeApiCall(url, options = {}) {
    let retries = 0;
    let lastError = null;

    // Add default headers
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Accept': 'application/vnd.api+json',
      ...options.headers
    };

    while (retries < this.maxRetries) {
      try {
        console.log(`Attempt ${retries + 1}/${this.maxRetries} for API call to ${url}`);
        
        // Make the request with a timeout
        const response = await axios({
          url,
          method: options.method || 'GET',
          headers,
          data: options.data,
          timeout: options.timeout || 30000, // 30 seconds timeout
          ...options
        });
        
        console.log(`API call successful: ${url}`);
        return response.data;
      } catch (error) {
        lastError = error;
        
        // Don't retry for certain status codes
        if (error.response && [400, 401, 403, 404].includes(error.response.status)) {
          console.error(`API Error (${error.response.status}):`, error.response.data);
          throw error;
        }
        
        // For rate limiting, wait longer
        if (error.response && error.response.status === 429) {
          console.warn('Rate limit hit, waiting longer before retry');
          await sleep(this.retryDelay * 5); // Wait 5 times longer for rate limits
          retries++;
          continue;
        }
        
        // For network errors like ECONNRESET, retry
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
          console.warn(`Network error (${error.code}), retrying...`);
          
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, retries);
          console.log(`Waiting ${delay}ms before retry ${retries + 1}/${this.maxRetries}`);
          await sleep(delay);
          
          retries++;
          continue;
        }
        
        // For other errors, log and throw
        console.error('API call error:', error.message);
        throw error;
      }
    }
    
    // If we get here, all retries failed
    console.error(`All ${this.maxRetries} attempts failed for ${url}`);
    
    // Enhance error message based on error type
    if (lastError.code === 'ECONNRESET') {
      throw new Error(`Connection reset by server after ${this.maxRetries} attempts. The PUBG API might be experiencing issues.`);
    } else if (lastError.code === 'ETIMEDOUT' || lastError.code === 'ECONNABORTED') {
      throw new Error(`Request timed out after ${this.maxRetries} attempts. The PUBG API might be overloaded.`);
    } else if (lastError.response && lastError.response.status === 429) {
      throw new Error('API rate limit exceeded. Please try again later.');
    } else {
      throw lastError;
    }
  }

  // Method to search for matches
  async searchCustomMatches(criteria) {
    console.log('Searching for custom matches with criteria:', criteria);
    
    try {
      const { playerName, platform = 'steam', timeRange = '24h' } = criteria;
      
      if (!playerName) {
        console.error('Player name is required');
        return { data: [], meta: { count: 0 } };
      }
      
      // Step 1: Find the player ID
      const playersUrl = `${this.baseUrl}/shards/${platform}/players?filter[playerNames]=${encodeURIComponent(playerName)}`;
      const playersData = await this.makeApiCall(playersUrl);
      
      if (!playersData.data || playersData.data.length === 0) {
        console.log('No player found with name:', playerName);
        return { data: [], meta: { count: 0, message: 'Player not found' } };
      }
      
      const playerId = playersData.data[0].id;
      console.log(`Found player ID: ${playerId}`);
      
      // Step 2: Get player's match history
      const playerUrl = `${this.baseUrl}/shards/${platform}/players/${playerId}`;
      const playerData = await this.makeApiCall(playerUrl);
      
      if (!playerData.data.relationships || !playerData.data.relationships.matches || !playerData.data.relationships.matches.data) {
        console.log('No matches found for player:', playerName);
        return { data: [], meta: { count: 0, message: 'No matches found' } };
      }
      
      const matchReferences = playerData.data.relationships.matches.data;
      console.log(`Found ${matchReferences.length} matches for player`);
      
      // Apply time range filter if needed
      // (time filtering logic would go here)
      
      // Step 3: Get match details with rate limiting
      const matchPromises = [];
      let count = 0;
      
      // Process in batches to avoid rate limiting
      for (const matchRef of matchReferences) {
        // Limit to first 5 matches to avoid overloading
        if (count >= 5) break;
        
        const matchId = matchRef.id;
        
        // Add a small delay between requests to avoid rate limiting
        const promise = (async () => {
          // Stagger requests to avoid overwhelming the API
          await sleep(count * 500); // 500ms between requests
          
          const matchUrl = `${this.baseUrl}/shards/${platform}/matches/${matchId}`;
          return this.makeApiCall(matchUrl);
        })();
        
        matchPromises.push(promise);
        count++;
      }
      
      console.log(`Fetching details for ${matchPromises.length} matches...`);
      
      // Wait for all match details to be fetched
      const matches = await Promise.all(matchPromises.map(p => p.catch(e => {
        console.error('Error fetching match:', e.message);
        return null; // Return null for failed requests
      })));
      
      // Filter out failed requests
      const validMatches = matches.filter(m => m !== null);
      
      // Filter for custom matches if needed
      const filteredMatches = criteria.customMatchOnly
        ? validMatches.filter(match => match.data && match.data.attributes && match.data.attributes.isCustomMatch)
        : validMatches;
      
      console.log(`Found ${filteredMatches.length} matches that meet criteria`);
      
      return { 
        data: filteredMatches,
        meta: {
          count: filteredMatches.length,
          totalMatches: matchReferences.length,
          fetchedMatches: validMatches.length,
          criteria
        }
      };
      
    } catch (error) {
      console.error('Error searching custom matches:', error.message);
      throw error;
    }
  }

  // Add other methods as needed...
}

module.exports = new PubgApiServiceEnhanced();