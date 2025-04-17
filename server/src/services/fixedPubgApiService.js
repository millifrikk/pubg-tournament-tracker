const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  API_KEY: process.env.PUBG_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI4NDEzNDM5MC05NTBhLTAxM2QtZmZlMC0wMmQ1ZjFjNWQ0YzEiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzMzMzg0NTk3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6ImdhbWUtc3RhdHMtcHViIn0.fj4j3RSoYSvqV0i8TeCGJFN3dmh3W1iwzWO5zCi6SZU',
  BASE_URL: 'https://api.pubg.com/shards',
  TELEMETRY_URL: 'https://telemetry-cdn.pubg.com',
  CACHE_ENABLED: true,
  PLAYER_CACHE_TTL: 3600, // 1 hour
  MATCH_CACHE_TTL: 604800, // 1 week
};

// For tracking rate limits
const rateLimits = {
  lastRequest: 0,
  requestWindow: [],
  maxRequestsPerMinute: 10, // PUBG API standard limit
  windowDuration: 60000 // 1 minute in milliseconds
};

// For fallback file-based caching
const fileCacheEnabled = true;
const fileCacheDir = path.join(__dirname, '..', '..', 'cache');

// Ensure cache directory exists
async function ensureCacheDirExists() {
  try {
    await fs.mkdir(fileCacheDir, { recursive: true });
    console.log(`Cache directory created: ${fileCacheDir}`);
  } catch (error) {
    console.error('Error creating cache directory:', error);
  }
}

// Setup file-based cache
if (fileCacheEnabled) {
  ensureCacheDirExists();
}

// Create axios instance for PUBG API requests
const pubgApi = axios.create({
  baseURL: config.BASE_URL,
  headers: {
    'Authorization': `Bearer ${config.API_KEY}`,
    'Accept': 'application/vnd.api+json'
  },
  timeout: 10000 // 10 second timeout
});

// Add response interceptor for rate limit handling
pubgApi.interceptors.response.use(
  response => response,
  async error => {
    if (error.response && error.response.status === 429) {
      // Get retry after value from headers (in seconds)
      const retryAfter = parseInt(error.response.headers['retry-after'], 10) || 10;
      console.log(`Rate limited. Retrying after ${retryAfter} seconds.`);
      
      // Wait for the retry-after time
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      
      // Track this rate limit for future request pacing
      rateLimits.lastRequest = Date.now();
      
      // Retry the request
      return pubgApi.request(error.config);
    }
    return Promise.reject(error);
  }
);

/**
 * Read data from file cache
 * @param {string} cacheKey - Cache key
 * @returns {Promise<Object|null>} Cached data or null
 */
async function readFromFileCache(cacheKey) {
  try {
    if (!fileCacheEnabled) return null;
    
    const sanitizedKey = cacheKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(fileCacheDir, `${sanitizedKey}.json`);
    
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    
    // Check if cache is expired
    if (parsed.expires && parsed.expires < Date.now()) {
      // Cache expired, delete the file
      await fs.unlink(filePath);
      return null;
    }
    
    return parsed.data;
  } catch (error) {
    // File not found or other error
    return null;
  }
}

/**
 * Write data to file cache
 * @param {string} cacheKey - Cache key
 * @param {Object} data - Data to cache
 * @param {number} ttl - Time to live in seconds
 */
async function writeToFileCache(cacheKey, data, ttl = 86400) {
  try {
    if (!fileCacheEnabled) return;
    
    const sanitizedKey = cacheKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(fileCacheDir, `${sanitizedKey}.json`);
    
    const cacheData = {
      data: data,
      timestamp: Date.now(),
      expires: Date.now() + (ttl * 1000)
    };
    
    await fs.writeFile(filePath, JSON.stringify(cacheData, null, 2));
  } catch (error) {
    console.error('Error writing to file cache:', error);
  }
}

/**
 * Fixed PUBG API Service
 */
class FixedPubgApiService {
  constructor() {
    console.log('Fixed PUBG API service initialized');
  }
  
  /**
   * Rate limiter function to ensure we don't exceed API limits
   * @returns {Promise<void>}
   */
  async rateLimiter() {
    const now = Date.now();
    const minInterval = 8000; // 8 seconds = ~7.5 requests per minute (more conservative)
    
    // Calculate delay needed
    const timeElapsed = now - rateLimits.lastRequest;
    const delay = timeElapsed < minInterval ? minInterval - timeElapsed : 0;
    
    if (delay > 0) {
      console.log(`Rate limiting - waiting ${delay}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Clean up the request window (remove requests older than windowDuration)
    const windowStartTime = now - rateLimits.windowDuration;
    rateLimits.requestWindow = rateLimits.requestWindow.filter(time => time > windowStartTime);
    
    // Check if we've exceeded the rate limit
    if (rateLimits.requestWindow.length >= rateLimits.maxRequestsPerMinute) {
      const oldestRequest = rateLimits.requestWindow[0];
      const timeToWait = oldestRequest + rateLimits.windowDuration - now;
      
      if (timeToWait > 0) {
        console.log(`Rate limit would be exceeded. Waiting ${timeToWait}ms before next request.`);
        await new Promise(resolve => setTimeout(resolve, timeToWait));
      }
    }
    
    // Add the current request to the window
    rateLimits.requestWindow.push(now);
    rateLimits.lastRequest = now;
  }
  
  /**
   * Get player by name
   * @param {string} playerName - PUBG player name
   * @param {string} platform - Platform (e.g., steam, psn, xbox)
   * @returns {Promise<Object>} Player data
   */
  async getPlayerByName(playerName, platform = 'steam') {
    const cacheKey = `player_name_${platform}_${playerName.toLowerCase()}`;
    
    // Try file cache
    try {
      const fileCache = await readFromFileCache(cacheKey);
      if (fileCache) {
        console.log(`Using file cache for player name: ${playerName}`);
        return fileCache;
      }
    } catch (error) {
      console.error('File cache read error:', error);
    }
    
    // Apply rate limiting
    await this.rateLimiter();
    
    try {
      console.log(`Fetching player data from API for: ${playerName}`);
      const response = await pubgApi.get(`/${platform}/players?filter[playerNames]=${playerName}`);
      
      // Cache the result in file system
      await writeToFileCache(cacheKey, response.data, config.PLAYER_CACHE_TTL);
      
      return response.data;
    } catch (error) {
      console.error(`Error getting player by name: ${playerName}`, error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Get player by ID
   * @param {string} playerId - PUBG player account ID
   * @param {string} platform - Platform (e.g., steam, psn, xbox)
   * @returns {Promise<Object>} Player data
   */
  async getPlayerById(playerId, platform = 'steam') {
    const cacheKey = `player_id_${platform}_${playerId}`;
    
    // Try file cache
    try {
      const fileCache = await readFromFileCache(cacheKey);
      if (fileCache) {
        console.log(`Using file cache for player ID: ${playerId}`);
        return fileCache;
      }
    } catch (error) {
      console.error('File cache read error:', error);
    }
    
    // Apply rate limiting
    await this.rateLimiter();
    
    try {
      console.log(`Fetching player data from API for ID: ${playerId}`);
      const response = await pubgApi.get(`/${platform}/players/${playerId}`);
      
      // Cache the result in file system
      await writeToFileCache(cacheKey, response.data, config.PLAYER_CACHE_TTL);
      
      return response.data;
    } catch (error) {
      console.error(`Error getting player by ID: ${playerId}`, error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Get match details
   * @param {string} matchId - PUBG match ID
   * @param {string} platform - Platform (e.g., steam, psn, xbox)
   * @returns {Promise<Object>} Match data
   */
  async getMatch(matchId, platform = 'steam') {
    const cacheKey = `match_${platform}_${matchId}`;
    
    // Use very long TTL for matches as they never change
    const matchCacheTTL = config.MATCH_CACHE_TTL || 604800; // Default to 1 week
    
    // Try file cache
    try {
      const fileCache = await readFromFileCache(cacheKey);
      if (fileCache) {
        console.log(`Using file cache for match: ${matchId}`);
        return fileCache;
      }
    } catch (error) {
      console.error('File cache read error:', error);
    }
    
    // Apply rate limiting
    await this.rateLimiter();
    
    try {
      console.log(`Fetching match data from API: ${matchId}`);
      const response = await pubgApi.get(`/${platform}/matches/${matchId}`);
      
      // Cache the result in file system (matches never change, so can have very long TTL)
      await writeToFileCache(cacheKey, response.data, matchCacheTTL);
      
      return response.data;
    } catch (error) {
      console.error(`Error getting match: ${matchId}`, error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Get telemetry data from URL
   * @param {string} telemetryUrl - URL to telemetry file
   * @returns {Promise<Object>} Telemetry data
   */
  async getTelemetry(telemetryUrl) {
    // Use base64 encoding of the URL as the cache key to avoid invalid characters
    const cacheKey = `telemetry_${Buffer.from(telemetryUrl).toString('base64')}`;
    
    // Telemetry data is immutable, so can have a very long TTL
    const telemetryCacheTTL = config.MATCH_CACHE_TTL || 604800; // Default to 1 week
    
    // Try file cache
    try {
      const fileCache = await readFromFileCache(cacheKey);
      if (fileCache) {
        console.log(`Using file cache for telemetry`);
        return fileCache;
      }
    } catch (error) {
      console.error('File cache read error:', error);
    }
    
    try {
      console.log(`Fetching telemetry data from URL: ${telemetryUrl}`);
      // Telemetry requests don't need authorization
      const response = await axios.get(telemetryUrl, {
        timeout: 30000 // 30 second timeout for potentially large telemetry files
      });
      
      // Cache the result in file system (always, regardless of size)
      await writeToFileCache(cacheKey, response.data, telemetryCacheTTL);
      
      return response.data;
    } catch (error) {
      console.error('Error getting telemetry data', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Extract telemetry URL from match data
   * @param {Object} matchData - Match data from getMatch() method
   * @returns {string|null} Telemetry URL or null if not found
   */
  extractTelemetryUrl(matchData) {
    if (!matchData || !matchData.included) {
      return null;
    }
    
    const assets = matchData.included.filter(item => item.type === 'asset');
    if (assets.length === 0) {
      return null;
    }
    
    return assets[0]?.attributes?.URL || null;
  }
  
  /**
   * Determine if a match is a ranked match
   * @param {Object} matchData - Match data from getMatch() method
   * @returns {boolean} True if it's a ranked match
   */
  isRankedMatch(matchData) {
    if (!matchData || !matchData.data || !matchData.data.attributes) {
      return false;
    }
    
    const attributes = matchData.data.attributes;
    
    // Check for direct indicator from matchType
    if (attributes.matchType === 'competitive') {
      return true;
    }
    
    // Check for other indicators
    if (attributes.matchType === 'ranked' || attributes.isRanked === true) {
      return true;
    }
    
    // Check for ranked mode in gameMode attribute
    if (attributes.gameMode && attributes.gameMode.includes('ranked')) {
      return true;
    }
    
    // Check in the seasonState attribute if it exists
    if (attributes.seasonState && attributes.seasonState.includes('rank')) {
      return true;
    }
    
    // Some ranked matches might be identified by specific player count
    // PUBG ranked matches generally have 64 players (16 teams of 4)
    const hasRankedPlayerCount = attributes.playerCount >= 60 && attributes.playerCount <= 64;
    
    // In ranked, most players are on full teams
    const hasFullTeams = this.checkForFullTeams(matchData);
    
    return hasRankedPlayerCount && hasFullTeams;
  }
  
  /**
   * Get the match type (RANKED, CUSTOM, or PUBLIC)
   * @param {Object} matchData - Match data
   * @returns {string} The match type
   */
  getMatchType(matchData) {
    if (!matchData || !matchData.data || !matchData.data.attributes) {
      return 'PUBLIC';
    }
    
    const attributes = matchData.data.attributes;
    
    // Use the matchType attribute as the primary classification method
    if (attributes.matchType === 'competitive') {
      return 'RANKED';
    } else if (attributes.matchType === 'custom' || attributes.isCustomMatch === true) {
      return 'CUSTOM';
    } else if (attributes.matchType === 'official') {
      return 'PUBLIC';
    }
    
    // Fall back to the heuristic methods if matchType isn't definitive
    if (this.isRankedMatch(matchData)) {
      return 'RANKED';
    } else if (this.isLikelyCustomMatch(matchData)) {
      return 'CUSTOM';
    } else {
      return 'PUBLIC';
    }
  }
  
  /**
   * Determine if a match is likely a custom match based on its attributes
   * @param {Object} matchData - Match data from getMatch() method
   * @returns {boolean} True if likely a custom match
   */
  isLikelyCustomMatch(matchData) {
    if (!matchData || !matchData.data || !matchData.data.attributes) {
      return false;
    }
    
    const attributes = matchData.data.attributes;
    
    // Check if it's a ranked match - if so, it's NOT a custom match
    if (this.isRankedMatch(matchData)) {
      return false;
    }
    
    // Check for the definitive indicators first
    if (attributes.matchType === 'custom') {
      return true;
    }
    
    if (attributes.isCustomMatch === true) {
      return true;
    }
    
    // If matchType is explicitly 'official', then it's definitely a public match
    if (attributes.matchType === 'official') {
      return false;
    }
    
    // Check game mode (often tournament games are squad-fpp or competitive)
    const isCompetitiveMode = ['squad-fpp', 'competitive', 'esports'].includes(attributes.gameMode);
    
    // Check player count (custom matches often have very specific player counts)
    const hasExpectedPlayerCount = attributes.playerCount >= 60 && attributes.playerCount <= 100;
    
    // Tournament matches often have specific maps
    const isTournamentMap = ['Baltic_Main', 'Erangel_Main', 'Desert_Main', 'Tiger_Main'].includes(attributes.mapName);
    
    // Check if most teams have 4 players (full squads)
    const hasFullTeams = this.checkForFullTeams(matchData);
    
    // Score-based approach
    let score = 0;
    if (isCompetitiveMode) score += 1;
    if (hasExpectedPlayerCount) score += 1;
    if (isTournamentMap) score += 1;
    if (hasFullTeams) score += 2;
    
    return score >= 3;
  }
  
  /**
   * Check if most teams in the match have full squads (4 players)
   * @param {Object} matchData - Match data
   * @returns {boolean} True if most teams have 4 players
   */
  checkForFullTeams(matchData) {
    if (!matchData.included) return false;
    
    const rosters = matchData.included.filter(item => item.type === 'roster');
    if (rosters.length === 0) return false;
    
    let fullTeamCount = 0;
    
    rosters.forEach(roster => {
      const playerCount = roster.relationships?.participants?.data?.length || 0;
      if (playerCount === 4) { // A full squad has 4 players
        fullTeamCount++;
      }
    });
    
    // If more than 60% of teams are full squads, likely a custom match
    return (fullTeamCount / rosters.length) > 0.6;
  }
  
  /**
   * Search for custom matches
   * @param {Object} criteria - Search criteria
   * @param {string} criteria.playerName - Player name to search for
   * @param {string} criteria.platform - Platform to search on
   * @param {string} criteria.timeRange - Time range (24h, 48h, 7d, 14d)
   * @param {boolean} criteria.customMatchOnly - Whether to only return custom matches
   * @returns {Promise<Array>} Array of matches
   */
  async searchCustomMatches(criteria) {
    try {
      console.log('Enhanced search for custom matches:', criteria);
      
      const { 
        playerName, 
        platform = 'steam', 
        timeRange = '24h',
        customMatchOnly = true
      } = criteria;
      
      if (!playerName) {
        throw new Error('Player name is required');
      }
      
      // First, get player data to find account ID
      const players = await this.getPlayerByName(playerName, platform);
      
      if (!players || !players.data || players.data.length === 0) {
        return [];
      }
      
      const playerAccount = players.data[0];
      const playerAccountId = playerAccount.id;
      
      // Then, get player match history
      const playerData = await this.getPlayerById(playerAccountId, platform);
      
      if (!playerData || !playerData.data || !playerData.data.relationships || !playerData.data.relationships.matches) {
        return [];
      }
      
      // Get match IDs from player data
      const matchIds = playerData.data.relationships.matches.data.map(match => match.id);
      
      // Define time filter
      const now = new Date();
      let startDateTime;
      
      if (timeRange === '24h') {
        startDateTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      } else if (timeRange === '48h') {
        startDateTime = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      } else if (timeRange === '7d') {
        startDateTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === '14d') {
        startDateTime = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      } else {
        startDateTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default to 24h
      }
      
      console.log(`Time range: ${startDateTime.toISOString()} to ${now.toISOString()}`);
      
      // Limit the number of matches to fetch
      const limitedMatchIds = matchIds.slice(0, 5);
      console.log(`Processing ${limitedMatchIds.length} match IDs`);
      
      // Fetch match data with proper rate limiting
      const matches = [];
      for (const matchId of limitedMatchIds) {
        try {
          console.log(`Fetching match data for: ${matchId}`);
          const matchData = await this.getMatch(matchId, platform);
          
          // Check if match passes filters
          const matchDate = new Date(matchData.data.attributes.createdAt);
          const isInTimeRange = matchDate >= startDateTime;
          const isCustomMatch = customMatchOnly ? this.isLikelyCustomMatch(matchData) : true;
          
          if (isInTimeRange && isCustomMatch) {
            console.log(`Match ${matchId} passes filters`);
            // Add match type metadata
            matchData.meta = {
              isCustomMatch: this.isLikelyCustomMatch(matchData),
              isRankedMatch: this.isRankedMatch(matchData),
              matchType: this.getMatchType(matchData)
            };
            matches.push(matchData);
          } else {
            console.log(`Match ${matchId} does not pass filters`);
          }
        } catch (error) {
          console.error(`Error fetching match data for match: ${matchId}`, error);
          // Continue with other matches
        }
      }
      
      console.log(`Found ${matches.length} matches that pass all filters`);
      return matches;
    } catch (error) {
      console.error('Error in searchCustomMatches:', error);
      throw error;
    }
  }
  
  /**
   * Search for custom matches by team player names
   * @param {Object} criteria - Search criteria
   * @param {Array} criteria.playerNames - Array of player names to search for
   * @param {String} criteria.platform - Platform (steam, xbox, psn)
   * @param {String} criteria.timeRange - Time range to search
   * @returns {Promise<Array>} - Array of matches
   */
  async searchCustomMatchesByTeamPlayers(criteria) {
    try {
      console.log('Searching for custom matches by team players with criteria:', criteria);
      
      // Validate input
      if (!criteria.playerNames || !Array.isArray(criteria.playerNames) || criteria.playerNames.length === 0) {
        throw new Error('At least one player name is required');
      }
      
      // We'll collect all unique matches across all players
      const allMatches = new Map();
      const matchIdToPlayerMap = new Map();
      
      // We'll limit to maximum 5 players to avoid overloading the API
      const playerNames = criteria.playerNames.slice(0, 5);
      console.log(`Processing ${playerNames.length} players (limited from ${criteria.playerNames.length})`);
      
      // Process players in sequence to manage rate limiting
      for (const playerName of playerNames) {
        try {
          console.log(`Searching matches for player: ${playerName}`);
          
          // Use the searchCustomMatches method with the current player
          const playerMatches = await this.searchCustomMatches({
            playerName,
            platform: criteria.platform || 'steam',
            timeRange: criteria.timeRange || '24h',
            customMatchOnly: true
          });
          
          console.log(`Found ${playerMatches.length} matches for player ${playerName}`);
          
          // Add each match to our collection if it's not already there
          playerMatches.forEach(match => {
            const matchId = match.data.id;
            
            if (!allMatches.has(matchId)) {
              allMatches.set(matchId, match);
              matchIdToPlayerMap.set(matchId, [playerName]);
            } else {
              // If match already exists, add this player to the player list
              matchIdToPlayerMap.get(matchId).push(playerName);
            }
          });
        } catch (error) {
          console.error(`Error searching matches for player ${playerName}:`, error);
          // Continue with other players
        }
      }
      
      console.log(`Found ${allMatches.size} unique matches across all players`);
      
      // Convert the Map to an array of matches
      const matchesArray = Array.from(allMatches.values());
      
      // Sort matches by date, newest first
      matchesArray.sort((a, b) => {
        const dateA = new Date(a.data.attributes.createdAt);
        const dateB = new Date(b.data.attributes.createdAt);
        return dateB - dateA;
      });
      
      // Add metadata about which players were in each match
      matchesArray.forEach(match => {
        const matchId = match.data.id;
        const players = matchIdToPlayerMap.get(matchId) || [];
        
        // Add metadata to the match
        match.meta = {
          ...match.meta,
          // Add how many of our searched players were in this match
          searchedPlayerCount: players.length,
          // Add percentage of searched players that were in this match
          playerCoverage: Math.round((players.length / playerNames.length) * 100),
          // Add list of searched players that were in this match
          players: players,
          // Add priority score based on player coverage and match date
          priorityScore: this.calculateMatchPriorityScore(match, players.length, playerNames.length)
        };
      });
      
      // Sort by priority score, highest first
      matchesArray.sort((a, b) => b.meta.priorityScore - a.meta.priorityScore);
      
      // Return the matches
      return matchesArray;
    } catch (error) {
      console.error('Error searching matches by team players:', error);
      throw error;
    }
  }
  
  /**
   * Calculate a priority score for a match based on various factors
   * @param {Object} match - Match data
   * @param {Number} matchedPlayers - Number of searched players found in this match
   * @param {Number} totalPlayers - Total number of players searched for
   * @returns {Number} - Priority score (higher is better)
   */
  calculateMatchPriorityScore(match, matchedPlayers, totalPlayers) {
    // Start with base score of player coverage percentage
    let score = Math.round((matchedPlayers / totalPlayers) * 100);
    
    // Boost score for custom matches
    if (match.data.attributes.isCustomMatch === true) {
      score += 30;
    }
    
    // Boost score based on match type
    if (match.meta && match.meta.matchType) {
      if (match.meta.matchType === 'CUSTOM') {
        score += 50;
      } else if (match.meta.matchType === 'RANKED') {
        score += 20;
      }
    }
    
    // Bonus for very recent matches (within last 24 hours)
    const matchDate = new Date(match.data.attributes.createdAt);
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    if (matchDate > oneDayAgo) {
      score += 20;
    }
    
    return score;
  }
}

// Export singleton instance
module.exports = new FixedPubgApiService();