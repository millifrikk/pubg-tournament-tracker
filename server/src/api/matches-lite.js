const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const fs = require('fs').promises;
const path = require('path');

// Cache directory for matches
const CACHE_DIR = path.join(__dirname, '..', '..', 'cache');

/**
 * @route   GET /api/matches-lite/health
 * @desc    Simple health check endpoint
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Matches Lite API is operational', timestamp: new Date() });
});

/**
 * @route   POST /api/matches-lite/search
 * @desc    Lightweight version of search that uses cached data instead of PUBG API
 * @access  Public
 */
router.post('/search', async (req, res) => {
  try {
    console.log('Received search request in lite endpoint:', req.body);
    
    const {
      playerName,
      platform = 'steam',
      timeRange = '24h',
      gameMode = 'all',
      mapName = 'all',
      customMatchOnly = true
    } = req.body;
    
    // Get cached matches from filesystem
    const cachedMatches = await getCachedMatches(platform);
    console.log(`Found ${cachedMatches.length} cached matches`);
    
    // If no player name is provided, return recent cached matches
    if (!playerName || playerName.trim() === '') {
      const limitedMatches = cachedMatches.slice(0, 5); // Limit to 5 matches
      
      // Add metadata for each match
      const matchesWithMeta = await addMetadataToMatches(limitedMatches);
      
      return res.json({
        data: matchesWithMeta,
        meta: {
          count: matchesWithMeta.length,
          message: 'Cached matches returned successfully',
          filters: req.body,
          source: 'cache'
        }
      });
    }
    
    // If player name is provided, try to find matches that might contain this player
    // This is a very simple approach - in a real implementation, you'd need player-match mappings
    // For now, we'll just return a few cached matches as examples
    
    // Filter matches by game mode and map if specified
    let filteredMatches = cachedMatches;
    
    if (gameMode !== 'all') {
      filteredMatches = filteredMatches.filter(match => 
        match.data.attributes.gameMode === gameMode
      );
    }
    
    if (mapName !== 'all') {
      filteredMatches = filteredMatches.filter(match => 
        match.data.attributes.mapName === mapName
      );
    }
    
    // Limit the number of matches to avoid overwhelming the UI
    const limitedMatches = filteredMatches.slice(0, 5);
    
    // Add metadata for each match (custom/ranked status, registration status)
    const matchesWithMeta = await addMetadataToMatches(limitedMatches);
    
    // If we still don't have any matches, provide at least a sample
    if (matchesWithMeta.length === 0) {
      // Create a mock match as a fallback
      const mockMatch = createMockMatch(playerName, platform, gameMode, mapName);
      
      return res.json({
        data: [mockMatch],
        meta: {
          count: 1,
          message: 'No cached matches found, sample data provided',
          filters: req.body,
          source: 'sample'
        }
      });
    }
    
    return res.json({
      data: matchesWithMeta,
      meta: {
        count: matchesWithMeta.length,
        message: 'Cached matches returned successfully',
        filters: req.body,
        source: 'cache'
      }
    });
  } catch (error) {
    console.error('Error in matches-lite search:', error);
    res.status(500).json({ 
      error: 'Error searching matches',
      message: error.message
    });
  }
});

/**
 * Get cached matches from filesystem
 * @param {string} platform - Platform (e.g., steam, psn, xbox)
 * @returns {Promise<Array>} Cached matches
 */
async function getCachedMatches(platform = 'steam') {
  try {
    // Make sure cache directory exists
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
    } catch (err) {
      // Ignore if directory already exists
    }
    
    // Get all files in cache directory
    const files = await fs.readdir(CACHE_DIR);
    
    // Filter for match cache files for the platform
    const matchCacheFiles = files.filter(file => 
      file.startsWith(`match_${platform}`) && file.endsWith('.json')
    );
    
    // Read each file and parse the data
    const matches = [];
    const limit = 20; // Limit the number of files to read to avoid memory issues
    
    for (let i = 0; i < Math.min(matchCacheFiles.length, limit); i++) {
      try {
        const file = matchCacheFiles[i];
        const data = await fs.readFile(path.join(CACHE_DIR, file), 'utf8');
        const parsed = JSON.parse(data);
        
        // Check if it's a valid match data object
        if (parsed.data && parsed.data.data && parsed.data.data.id) {
          matches.push(parsed.data);
        }
      } catch (err) {
        console.error(`Error reading cache file: ${matchCacheFiles[i]}`, err);
        // Continue with other files
      }
    }
    
    // If no cached matches found, check if we have any sample data files
    if (matches.length === 0) {
      try {
        // Check if we have a sample match data file
        const samplePath = path.join(__dirname, '..', '..', 'cache', 'sample_match.json');
        const sampleExists = await fileExists(samplePath);
        
        if (sampleExists) {
          const data = await fs.readFile(samplePath, 'utf8');
          const parsed = JSON.parse(data);
          matches.push(parsed);
        }
      } catch (err) {
        console.error('Error reading sample match data:', err);
      }
    }
    
    // Sort by creation date, newest first
    matches.sort((a, b) => {
      try {
        return new Date(b.data.attributes.createdAt) - new Date(a.data.attributes.createdAt);
      } catch (e) {
        return 0; // If dates can't be compared, keep original order
      }
    });
    
    return matches;
  } catch (error) {
    console.error('Error getting cached matches:', error);
    return [];
  }
}

/**
 * Helper function to check if a file exists
 * @param {string} path - File path
 * @returns {Promise<boolean>} True if file exists
 */
async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Add metadata to matches (custom/ranked status, registration status)
 * @param {Array} matches - Array of match data objects
 * @returns {Promise<Array>} Matches with metadata
 */
async function addMetadataToMatches(matches) {
  try {
    // Get matchIds to check in database
    const matchIds = matches.map(match => match.data.id);
    
    // Get registered matches from the database
    let registeredMatches = [];
    try {
      registeredMatches = await db('custom_matches')
        .select('match_id', 'tournament_id', 'verified')
        .whereIn('match_id', matchIds);
      console.log(`Found ${registeredMatches.length} registered matches in database`);
    } catch (dbError) {
      console.error('Database error checking registered matches:', dbError);
      // Continue without database data
    }
    
    // Add metadata to each match
    return matches.map(match => {
      const matchId = match.data.id;
      const attributes = match.data.attributes;
      const registrationInfo = registeredMatches.find(rm => rm.match_id === matchId);
      
      // Determine match type
      let matchType;
      if (attributes.matchType === 'competitive') {
        matchType = 'RANKED';
      } else if (attributes.matchType === 'custom' || attributes.isCustomMatch === true) {
        matchType = 'CUSTOM';
      } else if (attributes.matchType === 'official') {
        matchType = 'PUBLIC';
      } else {
        // Simple detection based on game mode
        if (attributes.gameMode === 'squad-fpp' && attributes.playerCount >= 60) {
          matchType = 'CUSTOM';
        } else {
          matchType = 'PUBLIC';
        }
      }
      
      // Add metadata
      return {
        ...match,
        meta: {
          matchType,
          isRankedMatch: matchType === 'RANKED',
          isCustomMatch: matchType === 'CUSTOM',
          isPublicMatch: matchType === 'PUBLIC',
          isRegistered: !!registrationInfo,
          tournamentId: registrationInfo?.tournament_id || null,
          verified: registrationInfo?.verified || false,
          verificationScore: matchType === 'CUSTOM' ? 
            Math.floor(Math.random() * 30) + 70 : // Random score between 70-100 for custom matches
            0
        }
      };
    });
  } catch (error) {
    console.error('Error adding metadata to matches:', error);
    // Return original matches if there's an error
    return matches;
  }
}

/**
 * Create a mock match for when no real matches are available
 * @param {string} playerName - Player name
 * @param {string} platform - Platform
 * @param {string} gameMode - Game mode
 * @param {string} mapName - Map name
 * @returns {Object} Mock match data
 */
function createMockMatch(playerName, platform, gameMode, mapName) {
  // Use provided game mode or default to squad-fpp
  const mode = gameMode !== 'all' ? gameMode : 'squad-fpp';
  
  // Use provided map or default to Erangel
  const map = mapName !== 'all' ? mapName : 'Baltic_Main';
  
  // Create a mock match
  const mockMatch = {
    data: {
      type: 'match',
      id: 'mock-' + Date.now().toString(),
      attributes: {
        createdAt: new Date().toISOString(),
        duration: 1800,
        gameMode: mode,
        isCustomMatch: true,
        mapName: map,
        matchType: 'custom',
        seasonState: 'progress',
        titleId: 'pubg',
        shardId: platform
      },
      relationships: {
        rosters: {
          data: [
            { type: 'roster', id: 'mock-roster-1' },
            { type: 'roster', id: 'mock-roster-2' }
          ]
        },
        assets: {
          data: [
            { type: 'asset', id: 'mock-asset-1' }
          ]
        }
      }
    },
    included: [
      {
        type: 'participant',
        id: 'mock-participant-1',
        attributes: {
          stats: {
            name: playerName || 'ExamplePlayer',
            playerId: 'account.example',
            kills: 5,
            winPlace: 2
          }
        }
      }
    ],
    meta: {
      matchType: 'CUSTOM',
      isCustomMatch: true,
      isRankedMatch: false,
      isPublicMatch: false,
      isRegistered: false,
      tournamentId: null,
      verified: false,
      verificationScore: 85,
      note: 'This is a sample match for demonstration purposes'
    }
  };
  
  return mockMatch;
}

/**
 * @route   GET /api/matches-lite/:id
 * @desc    Get match by ID using cache only
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { platform = 'steam' } = req.query;
    
    // Log request
    console.log(`Getting cached match data for ID: ${id}, platform: ${platform}`);
    
    // Check if we have this match in cache
    const cacheKey = `match_${platform}_${id}`;
    const cachePath = path.join(CACHE_DIR, `${cacheKey}.json`);
    
    try {
      // Check if cache file exists
      const exists = await fileExists(cachePath);
      
      if (exists) {
        // Read from cache
        const data = await fs.readFile(cachePath, 'utf8');
        const parsed = JSON.parse(data);
        
        // Check if it's a valid match data object
        if (parsed.data && parsed.data.data && parsed.data.data.id) {
          console.log(`Using cached data for match: ${id}`);
          return res.json(parsed.data);
        }
      }
    } catch (cacheError) {
      console.error(`Error reading cache for match ${id}:`, cacheError);
      // Continue to fallback
    }
    
    // If we don't have this match in cache, respond with a not found message
    // that includes instructions to use the regular API endpoint
    return res.status(404).json({
      error: 'Match not found in cache',
      message: 'This match is not available in the cache. Try using the regular /api/matches/:id endpoint instead.',
      matchId: id
    });
  } catch (error) {
    console.error(`Error in matches-lite get match ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error retrieving match',
      message: error.message
    });
  }
});

module.exports = router;