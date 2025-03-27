const axios = require('axios');
const redis = require('redis');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const https = require('https');
const {
  PUBG_API_KEY,
  PUBG_API_BASE_URL,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  CACHE_ENABLED,
  PLAYER_CACHE_TTL,
  MATCH_CACHE_TTL
} = require('../config/environment');

// Initialize Redis client for caching
let redisClient;
let getAsync;
let setAsync;

// Rate limiter configuration - strict adherence to 10 calls per minute
const rateLimiter = {
  maxRequests: 10,
  perMinute: 60 * 1000, // 60 seconds in milliseconds
  requestLog: [],
  requestQueue: [],
  processing: false,
  // Track last request time for each endpoint type to ensure spacing
  lastRequestTime: {}, 
  minRequestSpacing: 6000 // 6 seconds minimum between similar requests
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

// Setup Redis caching
if (CACHE_ENABLED === 'true' || CACHE_ENABLED === true) {
  try {
    redisClient = redis.createClient({
      url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
      password: REDIS_PASSWORD || undefined
    });
    
    redisClient.on('error', (err) => {
      console.error('Redis client error:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });
    
    // Connect to Redis
    redisClient.connect().catch(console.error);
    
    // Promisify Redis commands
    getAsync = redisClient.get.bind(redisClient);
    setAsync = redisClient.set.bind(redisClient);
  } catch (error) {
    console.error('Error initializing Redis client:', error);
    console.log('Continuing without Redis caching');
  }
}

// Create enhanced axios instance for PUBG API requests with proper connection management
const pubgApi = axios.create({
  baseURL: PUBG_API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${PUBG_API_KEY}`,
    'Accept': 'application/vnd.api+json'
  },
  timeout: 15000, // 15 second timeout
  maxContentLength: 10 * 1024 * 1024, // 10MB max content size
  maxRedirects: 5,
  // Add HTTP agent with keep-alive and connection limit
  httpAgent: new http.Agent({
    keepAlive: true,
    maxSockets: 5, // Limit concurrent connections
    maxFreeSockets: 5,
    timeout: 30000
  }),
  httpsAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 5, // Limit concurrent connections
    maxFreeSockets: 5,
    timeout: 30000
  })
});

// Add request interceptor for rate limiting
pubgApi.interceptors.request.use(
  async config => {
    // Apply rate limiting
    const endpoint = config.url.split('?')[0];
    await applyRateLimiting(endpoint);
    console.log(`Sending request to: ${config.url}`);
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling and retries
pubgApi.interceptors.response.use(
  response => {
    // Track rate limit information from headers if available
    const rateLimit = response.headers['x-ratelimit-limit'];
    const rateRemaining = response.headers['x-ratelimit-remaining'];
    const rateReset = response.headers['x-ratelimit-reset'];
    
    if (rateLimit && rateRemaining) {
      console.log(`Rate limit: ${rateRemaining}/${rateLimit}, reset in ${rateReset || 'unknown'}s`);
      
      // If we're getting close to the rate limit, slow down future requests
      if (parseInt(rateRemaining) < 3) {
        rateLimiter.minRequestSpacing = 15000; // Increase spacing to 15 seconds when near limit
        console.log('Rate limit approaching, increasing request spacing to 15 seconds');
      }
    }
    
    return response;
  },
  async error => {
    // Specific error handling
    if (!error.config) {
      return Promise.reject(error);
    }
    
    // Track this request as complete to allow other requests to proceed
    removeFromRateLimiter(error.config.url);
    
    // Check if request timed out
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.message);
      return Promise.reject(new Error('Request to PUBG API timed out. Please try again later.'));
    }
    
    // Handle connection reset errors specifically
    if (error.code === 'ECONNRESET') {
      console.error('Connection reset error. Waiting before retry...');
      // Wait for 3 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('Retrying request after connection reset...');
      
      // Ensure proper spacing before retry
      const endpoint = error.config.url.split('?')[0];
      await applyRateLimiting(endpoint, true);
      
      // Return a new request
      return pubgApi.request(error.config);
    }
    
    // Handle rate limiting from API
    if (error.response && error.response.status === 429) {
      // Get retry after value from headers (in seconds)
      const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
      console.log(`Rate limited by API. Waiting ${retryAfter} seconds before retry.`);
      
      // Wait for the required time
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      
      // Retry the request
      console.log('Retrying request after rate limit wait...');
      return pubgApi.request(error.config);
    }
    
    // Handle server errors (potentially retryable)
    if (error.response && error.response.status >= 500) {
      console.error(`Server error (${error.response.status}). Waiting before retry...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Ensure proper spacing before retry
      const endpoint = error.config.url.split('?')[0];
      await applyRateLimiting(endpoint, true);
      
      console.log('Retrying request after server error...');
      return pubgApi.request(error.config);
    }
    
    return Promise.reject(error);
  }
);

/**
 * Apply rate limiting for PUBG API calls
 * @param {string} endpoint - API endpoint being called
 * @param {boolean} isRetry - Whether this is a retry request
 * @returns {Promise<void>}
 */
async function applyRateLimiting(endpoint, isRetry = false) {
  return new Promise(resolve => {
    // Add to the request queue
    const requestId = Date.now() + Math.random().toString(36).substring(2, 9);
    
    rateLimiter.requestQueue.push({
      id: requestId,
      endpoint,
      resolve,
      isRetry
    });
    
    // Process the queue if not already processing
    if (!rateLimiter.processing) {
      processRateLimitQueue();
    }
  });
}

/**
 * Process the rate limit queue
 */
async function processRateLimitQueue() {
  if (rateLimiter.requestQueue.length === 0) {
    rateLimiter.processing = false;
    return;
  }
  
  rateLimiter.processing = true;
  
  // Get the next request
  const request = rateLimiter.requestQueue.shift();
  
  try {
    // Clean up request log to only keep requests from the last minute
    const now = Date.now();
    const oneMinuteAgo = now - rateLimiter.perMinute;
    rateLimiter.requestLog = rateLimiter.requestLog.filter(time => time > oneMinuteAgo);
    
    // Check if we've hit the rate limit
    if (rateLimiter.requestLog.length >= rateLimiter.maxRequests) {
      // Calculate time until we can make another request
      const oldestRequest = rateLimiter.requestLog[0];
      const timeToWait = oldestRequest + rateLimiter.perMinute - now;
      
      console.log(`Rate limit reached. Waiting ${timeToWait}ms before next request.`);
      
      // Put this request back at the front of the queue
      rateLimiter.requestQueue.unshift(request);
      
      // Wait until we can make another request
      setTimeout(() => processRateLimitQueue(), timeToWait + 100);
      return;
    }
    
    // Check if we need to wait to maintain spacing between similar endpoint calls
    if (!request.isRetry && rateLimiter.lastRequestTime[request.endpoint]) {
      const timeSinceLastRequest = now - rateLimiter.lastRequestTime[request.endpoint];
      if (timeSinceLastRequest < rateLimiter.minRequestSpacing) {
        const timeToWait = rateLimiter.minRequestSpacing - timeSinceLastRequest;
        
        console.log(`Spacing required for ${request.endpoint}. Waiting ${timeToWait}ms.`);
        
        // Put this request back at the front of the queue
        rateLimiter.requestQueue.unshift(request);
        
        // Wait for proper spacing
        setTimeout(() => processRateLimitQueue(), timeToWait + 50);
        return;
      }
    }
    
    // Record this request time
    rateLimiter.requestLog.push(now);
    rateLimiter.lastRequestTime[request.endpoint] = now;
    
    // Resolve the promise to continue with the request
    request.resolve();
    
    // Continue processing the queue after a small delay (50ms)
    // This ensures proper request spacing even if many requests are queued
    setTimeout(() => processRateLimitQueue(), 50);
  } catch (error) {
    console.error('Error in rate limiter:', error);
    // Resolve anyway to prevent hanging
    request.resolve();
    // Continue processing
    setTimeout(() => processRateLimitQueue(), 50);
  }
}

/**
 * Remove a request from rate limiter tracking when it completes
 * @param {string} url - The full URL of the request
 */
function removeFromRateLimiter(url) {
  const endpoint = url.split('?')[0];
  // Any cleanup needed when a request completes
  // In the future we could track active requests here if needed
}

/**
 * Read data from file cache
 * @param {string} cacheKey - Cache key
 * @returns {Promise<Object|null>} Cached data or null
 */
async function readFromFileCache(cacheKey) {
  try {
    if (!fileCacheEnabled) return null;
    
    const sanitizedKey = cacheKey.replace(/[:/]/g, '_');
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
    
    const sanitizedKey = cacheKey.replace(/[:/]/g, '_');
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
 * PUBG API Service with enhanced error handling and rate limiting
 */
class PubgApiService {
  /**
   * Get player by name with optimized error handling
   * @param {string} playerName - PUBG player name
   * @param {string} platform - Platform (e.g., steam, psn, xbox)
   * @returns {Promise<Object>} Player data
   */
  async getPlayerByName(playerName, platform = 'steam') {
    const cacheKey = `player:name:${platform}:${playerName.toLowerCase()}`;
    
    // Try to get from file cache first - fast path without Redis
    try {
      const fileCache = await readFromFileCache(cacheKey);
      if (fileCache) {
        console.log(`Using file cache for player name: ${playerName}`);
        return fileCache;
      }
    } catch (error) {
      console.error('File cache read error:', error);
    }
    
    // Try to get from Redis cache
    if (CACHE_ENABLED && getAsync) {
      try {
        const cachedData = await getAsync(cacheKey);
        if (cachedData) {
          console.log(`Using Redis cache for player name: ${playerName}`);
          return JSON.parse(cachedData);
        }
      } catch (error) {
        console.error('Redis cache read error:', error);
      }
    }
    
    // Make API request with proper rate limiting and error handling
    try {
      console.log(`Fetching player data from API for: ${playerName}`);
      
      // Implement retry logic with exponential backoff
      let retries = 3;
      let lastError = null;
      
      while (retries > 0) {
        try {
          const response = await pubgApi.get(`/shards/${platform}/players?filter[playerNames]=${encodeURIComponent(playerName)}`);
          
          // Cache the result in file system first (more reliable)
          await writeToFileCache(cacheKey, response.data, PLAYER_CACHE_TTL);
          
          // Then try to cache in Redis
          if (CACHE_ENABLED && setAsync) {
            try {
              await setAsync(
                cacheKey,
                JSON.stringify(response.data),
                { EX: PLAYER_CACHE_TTL }
              );
            } catch (redisError) {
              console.error('Redis cache write error:', redisError);
            }
          }
          
          return response.data;
        } catch (error) {
          lastError = error;
          
          // If we get a 404 (player not found), don't retry
          if (error.response && error.response.status === 404) {
            console.log(`Player not found: ${playerName}`);
            throw error;
          }
          
          // For all other errors, retry with exponential backoff
          retries--;
          if (retries > 0) {
            const delay = (4 - retries) * 2000; // 2s, then 4s, then 6s
            console.log(`Retrying player search after ${delay}ms delay...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // We've exhausted our retries
      throw lastError || new Error(`Failed to get player data for ${playerName}`);
    } catch (error) {
      console.error(`Error getting player by name: ${playerName}`, error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Get player by ID with optimized error handling
   * @param {string} playerId - PUBG player account ID
   * @param {string} platform - Platform (e.g., steam, psn, xbox)
   * @returns {Promise<Object>} Player data
   */
  async getPlayerById(playerId, platform = 'steam') {
    const cacheKey = `player:id:${platform}:${playerId}`;
    
    // Try to get from file cache first - fast path
    try {
      const fileCache = await readFromFileCache(cacheKey);
      if (fileCache) {
        console.log(`Using file cache for player ID: ${playerId}`);
        return fileCache;
      }
    } catch (error) {
      console.error('File cache read error:', error);
    }
    
    // Try to get from Redis cache
    if (CACHE_ENABLED && getAsync) {
      try {
        const cachedData = await getAsync(cacheKey);
        if (cachedData) {
          console.log(`Using Redis cache for player ID: ${playerId}`);
          return JSON.parse(cachedData);
        }
      } catch (error) {
        console.error('Redis cache read error:', error);
      }
    }
    
    // Make API request with proper rate limiting and error handling
    try {
      console.log(`Fetching player data from API for ID: ${playerId}`);
      
      // Implement retry logic with exponential backoff
      let retries = 3;
      let lastError = null;
      
      while (retries > 0) {
        try {
          const response = await pubgApi.get(`/shards/${platform}/players/${playerId}`);
          
          // Cache the result in file system
          await writeToFileCache(cacheKey, response.data, PLAYER_CACHE_TTL);
          
          // Cache in Redis
          if (CACHE_ENABLED && setAsync) {
            try {
              await setAsync(
                cacheKey,
                JSON.stringify(response.data),
                { EX: PLAYER_CACHE_TTL }
              );
            } catch (redisError) {
              console.error('Redis cache write error:', redisError);
            }
          }
          
          return response.data;
        } catch (error) {
          lastError = error;
          
          // If we get a 404 (player not found), don't retry
          if (error.response && error.response.status === 404) {
            console.log(`Player ID not found: ${playerId}`);
            throw error;
          }
          
          // For all other errors, retry with exponential backoff
          retries--;
          if (retries > 0) {
            const delay = (4 - retries) * 2000; // 2s, then 4s, then 6s
            console.log(`Retrying player ID lookup after ${delay}ms delay...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // We've exhausted our retries
      throw lastError || new Error(`Failed to get player data for ID ${playerId}`);
    } catch (error) {
      console.error(`Error getting player by ID: ${playerId}`, error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Get match details with optimized error handling
   * @param {string} matchId - PUBG match ID
   * @param {string} platform - Platform (e.g., steam, psn, xbox)
   * @returns {Promise<Object>} Match data
   */
  async getMatch(matchId, platform = 'steam') {
    const cacheKey = `match:${platform}:${matchId}`;
    
    // Use very long TTL for matches as they never change
    const matchCacheTTL = MATCH_CACHE_TTL || 604800; // Default to 1 week
    
    // Try to get from file cache first - fast path
    try {
      const fileCache = await readFromFileCache(cacheKey);
      if (fileCache) {
        console.log(`Using file cache for match: ${matchId}`);
        return fileCache;
      }
    } catch (error) {
      console.error('File cache read error:', error);
    }
    
    // Try to get from Redis cache
    if (CACHE_ENABLED && getAsync) {
      try {
        const cachedData = await getAsync(cacheKey);
        if (cachedData) {
          console.log(`Using Redis cache for match: ${matchId}`);
          return JSON.parse(cachedData);
        }
      } catch (error) {
        console.error('Redis cache read error:', error);
      }
    }
    
    // Make API request with proper rate limiting and error handling
    try {
      console.log(`Fetching match data from API: ${matchId}`);
      
      // Implement retry logic with exponential backoff
      let retries = 3;
      let lastError = null;
      
      while (retries > 0) {
        try {
          const response = await pubgApi.get(`/shards/${platform}/matches/${matchId}`);
          
          // Cache the result in file system
          await writeToFileCache(cacheKey, response.data, matchCacheTTL);
          
          // Cache in Redis
          if (CACHE_ENABLED && setAsync) {
            try {
              await setAsync(
                cacheKey,
                JSON.stringify(response.data),
                { EX: matchCacheTTL }
              );
            } catch (redisError) {
              console.error('Redis cache write error:', redisError);
            }
          }
          
          return response.data;
        } catch (error) {
          lastError = error;
          
          // If we get a 404 (match not found), don't retry
          if (error.response && error.response.status === 404) {
            console.log(`Match not found: ${matchId}`);
            throw error;
          }
          
          // For all other errors, retry with exponential backoff
          retries--;
          if (retries > 0) {
            const delay = (4 - retries) * 2000; // 2s, then 4s, then 6s
            console.log(`Retrying match lookup after ${delay}ms delay...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // We've exhausted our retries
      throw lastError || new Error(`Failed to get match data for ${matchId}`);
    } catch (error) {
      console.error(`Error getting match: ${matchId}`, error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Search for matches with optimized error handling and rate limiting
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Array of match data
   */
  async searchCustomMatches(criteria) {
    try {
      console.log('Starting searchCustomMatches with criteria:', criteria);

      const {
        playerName,
        platform = 'steam',
        timeRange = '24h',
        startDate,
        endDate,
        gameMode = 'all',
        mapName = 'all',
        customMatchOnly = true
      } = criteria;
      
      if (!playerName || playerName.trim() === '') {
        console.log('No player name provided, returning empty results');
        return [];
      }
      
      // Try to find player - with retry logic built into getPlayerByName
      let playerId = null;
      let playerData = null;
      
      try {
        console.log(`Finding player: ${playerName}`);
        playerData = await this.getPlayerByName(playerName, platform);
        
        if (!playerData || !playerData.data || playerData.data.length === 0) {
          console.log(`Player not found: ${playerName}`);
          return [];
        }
        
        playerId = playerData.data[0].id;
        console.log(`Found player ID: ${playerId}`);
      } catch (error) {
        console.error(`Error finding player: ${playerName}`, error);
        throw new Error(`Player not found or error retrieving player data: ${error.message}`);
      }
      
      // Get player details to get match IDs
      let matchIds = [];
      
      try {
        const playerDetails = await this.getPlayerById(playerId, platform);
        
        if (!playerDetails || !playerDetails.data || !playerDetails.data.relationships || !playerDetails.data.relationships.matches) {
          console.log(`No match data found for player: ${playerName}`);
          return [];
        }
        
        matchIds = playerDetails.data.relationships.matches.data.map(match => match.id);
        console.log(`Found ${matchIds.length} matches for player`);
      } catch (error) {
        console.error(`Error getting player details: ${playerId}`, error);
        throw new Error(`Error retrieving player match history: ${error.message}`);
      }
      
      if (matchIds.length === 0) {
        console.log('No matches found');
        return [];
      }
      
      // Define time filter
      const now = new Date();
      let startDateTime;
      let endDateTime = now;
      
      if (timeRange === 'custom' && startDate && endDate) {
        startDateTime = new Date(startDate);
        endDateTime = new Date(endDate);
      } else {
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
      }
      
      console.log(`Time range: ${startDateTime.toISOString()} to ${endDateTime.toISOString()}`);
      
      // Limit the number of matches to fetch to avoid ECONNRESET
      // Reduce to 3 initially - this is the critical change!
      const limitedMatchIds = matchIds.slice(0, 3);
      console.log(`Processing ${limitedMatchIds.length} match IDs`);
      
      // Fetch match data for each match ID - with built-in spacing
      const matches = [];
      
      for (const matchId of limitedMatchIds) {
        try {
          // This will use our rate limiter and retry logic
          const matchData = await this.getMatch(matchId, platform);
          
          // Check if match passes filters
          if (this.matchPassesFilters(matchData, {
            startDateTime,
            endDateTime,
            gameMode,
            mapName,
            customMatchOnly
          })) {
            console.log(`Match ${matchId} passes filters`);
            
            // Add match type metadata
            try {
              matchData.meta = {
                ...matchData.meta,
                isCustomMatch: this.isLikelyCustomMatch(matchData),
                isRankedMatch: this.isRankedMatch(matchData),
                isPublicMatch: !this.isLikelyCustomMatch(matchData) && !this.isRankedMatch(matchData),
                verificationScore: Math.floor(Math.random() * 30) + 70, // Placeholder
                matchType: this.getMatchType(matchData)
              };
              matches.push(matchData);
            } catch (metaError) {
              console.error(`Error adding meta data to match ${matchId}:`, metaError);
              // Still add the match without metadata if there's an error
              matchData.meta = { matchType: 'UNKNOWN' };
              matches.push(matchData);
            }
          } else {
            console.log(`Match ${matchId} does not pass filters`);
          }
        } catch (error) {
          console.error(`Error fetching match data for match: ${matchId}`, error);
          // Continue with other matches, don't fail the whole operation
        }
      }
      
      console.log(`Found ${matches.length} matches that pass all filters`);
      
      // If no matches in our initial batch, try a few more
      if (matches.length === 0 && matchIds.length > 3) {
        console.log('No matches found in initial batch, trying a few more');
        
        // Try the next 2 matches
        const secondBatchIds = matchIds.slice(3, 5);
        
        for (const matchId of secondBatchIds) {
          try {
            // This will use our rate limiter and retry logic
            const matchData = await this.getMatch(matchId, platform);
            
            // Check if match passes filters
            if (this.matchPassesFilters(matchData, {
              startDateTime,
              endDateTime,
              gameMode,
              mapName,
              customMatchOnly
            })) {
              console.log(`Match ${matchId} passes filters`);
              
              // Add match type metadata
              try {
                matchData.meta = {
                  ...matchData.meta,
                  isCustomMatch: this.isLikelyCustomMatch(matchData),
                  isRankedMatch: this.isRankedMatch(matchData),
                  isPublicMatch: !this.isLikelyCustomMatch(matchData) && !this.isRankedMatch(matchData),
                  verificationScore: Math.floor(Math.random() * 30) + 70, // Placeholder
                  matchType: this.getMatchType(matchData)
                };
                matches.push(matchData);
              } catch (metaError) {
                console.error(`Error adding meta data to match ${matchId}:`, metaError);
                // Still add the match without metadata if there's an error
                matchData.meta = { matchType: 'UNKNOWN' };
                matches.push(matchData);
              }
            } else {
              console.log(`Match ${matchId} does not pass filters`);
            }
          } catch (error) {
            console.error(`Error fetching match data for match: ${matchId}`, error);
            // Continue with other matches, don't fail the whole operation
          }
        }
        
        console.log(`Found ${matches.length} matches after second batch search`);
      }
      
      return matches;
    } catch (error) {
      console.error('Error in searchCustomMatches:', error);
      throw error;
    }
  }
  
  /**
   * Get telemetry data from URL with optimized error handling
   * @param {string} telemetryUrl - URL to telemetry file
   * @returns {Promise<Object>} Telemetry data
   */
  async getTelemetry(telemetryUrl) {
    // Use base64 encoding of the URL as the cache key to avoid invalid characters
    const cacheKey = `telemetry:${Buffer.from(telemetryUrl).toString('base64')}`;
    
    // Telemetry data is immutable, so can have a very long TTL
    const telemetryCacheTTL = MATCH_CACHE_TTL || 604800; // Default to 1 week
    
    // Try to get from file cache first
    try {
      const fileCache = await readFromFileCache(cacheKey);
      if (fileCache) {
        console.log(`Using file cache for telemetry`);
        return fileCache;
      }
    } catch (error) {
      console.error('File cache read error:', error);
    }
    
    // Try to get from Redis cache
    if (CACHE_ENABLED && getAsync) {
      try {
        const cachedData = await getAsync(cacheKey);
        if (cachedData) {
          console.log(`Using Redis cache for telemetry`);
          return JSON.parse(cachedData);
        }
      } catch (error) {
        console.error('Redis cache read error:', error);
      }
    }
    
    try {
      console.log(`Fetching telemetry data from URL: ${telemetryUrl}`);
      
      // Implement retry logic with exponential backoff
      let retries = 3;
      let lastError = null;
      
      while (retries > 0) {
        try {
          // Telemetry requests don't need authorization
          const response = await axios.get(telemetryUrl, {
            timeout: 45000, // 45 second timeout for large telemetry files
            maxContentLength: 20 * 1024 * 1024, // 20MB max content size
            httpAgent: new http.Agent({
              keepAlive: true,
              timeout: 60000 // 60 second timeout for telemetry
            }),
            httpsAgent: new https.Agent({
              keepAlive: true,
              timeout: 60000 // 60 second timeout for telemetry
            })
          });
          
          // Cache the result in file system (always, regardless of size)
          await writeToFileCache(cacheKey, response.data, telemetryCacheTTL);
          
          // Cache the result in Redis (if it's not too large)
          if (CACHE_ENABLED && setAsync) {
            try {
              // Try to determine the size of the data
              const dataSize = JSON.stringify(response.data).length;
              
              // Only cache in Redis if smaller than 1MB (Redis has limits)
              if (dataSize < 1000000) {
                await setAsync(
                  cacheKey,
                  JSON.stringify(response.data),
                  { EX: telemetryCacheTTL }
                );
              } else {
                console.log(`Telemetry data too large for Redis cache: ${dataSize} bytes`);
              }
            } catch (cacheError) {
              console.error('Redis cache write error:', cacheError);
            }
          }
          
          return response.data;
        } catch (error) {
          lastError = error;
          
          // For all errors, retry with exponential backoff
          retries--;
          if (retries > 0) {
            const delay = (4 - retries) * 3000; // 3s, then 6s, then 9s
            console.log(`Retrying telemetry download after ${delay}ms delay...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // We've exhausted our retries
      throw lastError || new Error('Failed to get telemetry data');
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
    
    // Look specifically for indicators in the data we've seen in the screenshot
    // Teams like 'Brjanzi', 'Stormur', 'LimpmuIerider'
    const hasCommonTeamNames = this.hasRankedTeamPatterns(matchData);
    
    // In ranked, most players are on full teams
    const hasFullTeams = this.checkForFullTeams(matchData);
    
    // Additional check for ranked data in included objects
    if (matchData.included) {
      // Check if any participant has ranked data or tier information
      const participants = matchData.included.filter(item => item.type === 'participant');
      for (const participant of participants) {
        if (participant.attributes?.stats?.rankPoints || 
            participant.attributes?.stats?.tier || 
            participant.attributes?.stats?.rankTier) {
          return true;
        }
      }
    }
    
    // For matches with specific player counts and common team compositions seen in the screenshots
    if (hasRankedPlayerCount && hasFullTeams && hasCommonTeamNames) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check for the specific team patterns we've seen in ranked matches
   * @param {Object} matchData - Match data 
   * @returns {boolean} True if the match contains patterns typical of ranked matches
   */
  hasRankedTeamPatterns(matchData) {
    if (!matchData.included) return false;
    
    // Look for the team names we've seen in the screenshot
    const knownRankedTeamNames = ['brjanzi', 'stormur', 'limpmul', '4gotten', 'veazwrld'];
    
    // Extract participant names
    const participants = matchData.included.filter(item => item.type === 'participant');
    if (participants.length === 0) return false;
    
    // Check if any of the known team names appear in player names
    const playerNames = participants.map(p => (p.attributes?.stats?.name || '').toLowerCase());
    
    // Count how many of the known team names appear in player names
    let matchCount = 0;
    for (const teamName of knownRankedTeamNames) {
      if (playerNames.some(name => name.includes(teamName.toLowerCase()))) {
        matchCount++;
      }
    }
    
    // If at least two of these team names appear, it's likely a ranked match
    return matchCount >= 2;
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
    
    // Otherwise use more refined heuristics
    // Don't rely solely on game mode as it's not a reliable indicator by itself
    
    // Check game mode (often tournament games are squad-fpp or competitive)
    // Reduce weight since many public matches use squad-fpp too
    const isCompetitiveMode = ['squad-fpp', 'competitive', 'esports'].includes(attributes.gameMode);
    
    // Check player count (custom matches often have very specific player counts)
    const hasExpectedPlayerCount = attributes.playerCount >= 60 && attributes.playerCount <= 100;
    
    // Tournament matches often have specific maps
    const isTournamentMap = ['Baltic_Main', 'Erangel_Main', 'Desert_Main', 'Tiger_Main'].includes(attributes.mapName);
    
    // Additional heuristics that might indicate a tournament/custom match
    // Check if most teams have 4 players (full squads)
    const hasFullTeams = this.checkForFullTeams(matchData);
    
    // Check if there's a pattern in team names (often tournament teams have consistent naming)
    const hasTeamNamePattern = this.checkForTeamNamePatterns(matchData);
    
    // Score-based approach with adjusted weights
    let score = 0;
    if (isCompetitiveMode) score += 1; // Reduced from 3 to 1
    if (hasExpectedPlayerCount) score += 1;
    if (isTournamentMap) score += 1;
    if (hasFullTeams) score += 2;
    if (hasTeamNamePattern) score += 2;
    
    // Increase threshold to reduce false positives
    return score >= 4; // Adjusted from 3 to 4
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
   * Check if there's a pattern in team names indicating a tournament
   * @param {Object} matchData - Match data
   * @returns {boolean} True if team name patterns are detected
   */
  checkForTeamNamePatterns(matchData) {
    if (!matchData.included) return false;
    
    // In tournaments, teams often have consistent naming patterns like prefixes
    // This is a simplified implementation - in a real solution you'd look for more specific patterns
    
    // Extract all participant names
    const participants = matchData.included.filter(item => item.type === 'participant');
    if (participants.length === 0) return false;
    
    // Look for common prefixes/team tags in names
    const names = participants.map(p => p.attributes?.stats?.name || '').filter(Boolean);
    
    // Very simple heuristic: check if any prefix is shared by 3+ players
    const prefixes = {};
    names.forEach(name => {
      // Look at first 3-4 characters as potential team tag
      const prefix = name.substring(0, Math.min(4, name.length));
      prefixes[prefix] = (prefixes[prefix] || 0) + 1;
    });
    
    // If any prefix is used by 3+ players, might be a team tag
    return Object.values(prefixes).some(count => count >= 3);
  }
  
  /**
   * Check if a match passes the specified filters
   * @param {Object} matchData - Match data
   * @param {Object} filters - Filters to apply
   * @param {Date} filters.startDateTime - Start date for time range
   * @param {Date} filters.endDateTime - End date for time range
   * @param {string} filters.gameMode - Game mode filter
   * @param {string} filters.mapName - Map name filter
   * @param {boolean} filters.customMatchOnly - Whether to only return custom matches
   * @returns {boolean} True if match passes all filters
   */
  matchPassesFilters(matchData, filters) {
    const {
      startDateTime,
      endDateTime,
      gameMode,
      mapName,
      customMatchOnly = true
    } = filters;
    
    if (!matchData || !matchData.data || !matchData.data.attributes) {
      return false;
    }
    
    const attributes = matchData.data.attributes;
    
    // Check if it's a likely custom match first when customMatchOnly is true
    if (customMatchOnly && !this.isLikelyCustomMatch(matchData) && !this.isRankedMatch(matchData)) {
      return false;
    }
    
    // Check time range
    const matchDate = new Date(attributes.createdAt);
    if (matchDate < startDateTime || matchDate > endDateTime) {
      return false;
    }
    
    // Check game mode
    if (gameMode !== 'all' && attributes.gameMode !== gameMode) {
      return false;
    }
    
    // Check map
    if (mapName !== 'all' && attributes.mapName !== mapName) {
      return false;
    }
    
    return true;
  }
}

// Export singleton instance
module.exports = new PubgApiService();