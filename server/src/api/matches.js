const express = require('express');
const { promisify } = require('util');
const { pipeline } = require('stream');
const jwt = require('jsonwebtoken');
const pipelineAsync = promisify(pipeline);
const router = express.Router();
const pubgApiService = require('../services/pubgApiService');
const { db } = require('../db/connection');
const { authenticateJWT } = require('../middleware/auth');

// Increase timeout for long-running operations
router.use((req, res, next) => {
  req.setTimeout(120000); // 2 minutes
  next();
});

// Modify matches search route with enhanced error handling and proper JWT authentication
router.post('/search', async (req, res) => {
  // Log start of request with timestamp
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Match search request started:`, req.body);

  try {
    // Extract JWT token
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
        userId = decoded.userId;
        console.log(`Request authenticated as user: ${userId}`);
      } catch (authError) {
        console.warn('Authentication error:', authError.message);
        // Continue without authentication - searches can be anonymous
      }
    }

    const {
      playerName,
      platform = 'steam',
      timeRange = '24h',
      startDate,
      endDate,
      gameMode = 'all',
      mapName = 'all',
      customMatchOnly = true
    } = req.body;

    // Validate and sanitize input
    if (!playerName || playerName.trim() === '') {
      console.log('No player name provided');
      return res.status(400).json({
        error: 'Player name is required',
        data: [],
        meta: { count: 0 }
      });
    }

    const limitedCriteria = {
      playerName: playerName.trim().substring(0, 30),
      platform: ['steam', 'psn', 'xbox'].includes(platform) ? platform : 'steam',
      timeRange: ['24h', '48h', '7d', '14d'].includes(timeRange) ? timeRange : '24h',
      startDate,
      endDate,
      gameMode,
      mapName,
      customMatchOnly: Boolean(customMatchOnly),
      userId // Add authenticated user ID to criteria
    };

    console.log('Search criteria:', limitedCriteria);

    // Wrap the entire search in a promise with a timeout
    const searchMatchesWithTimeout = () => {
      return new Promise(async (resolve, reject) => {
        // Set a timeout for the entire operation
        const timeoutId = setTimeout(() => {
          console.log('Search operation timed out');
          reject(new Error('Search operation timed out'));
        }, 60000); // 1 minute timeout

        try {
          const matches = await pubgApiService.searchCustomMatches(limitedCriteria);
          clearTimeout(timeoutId);
          resolve(matches);
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });
    };

    let matches = [];
    try {
      matches = await searchMatchesWithTimeout();
      console.log(`Found ${matches.length} matches`);
    } catch (searchError) {
      console.error('Match search error:', searchError);
      return res.status(500).json({ 
        error: 'Failed to search matches',
        details: searchError.message || 'Unknown search error'
      });
    }

    // If no matches found, return early
    if (!matches || matches.length === 0) {
      const endTime = Date.now();
      console.log(`[${new Date().toISOString()}] No matches found. Total time: ${endTime - startTime}ms`);
      return res.json({
        data: [],
        meta: {
          count: 0,
          message: 'No matches found',
          searchTime: endTime - startTime,
          filters: limitedCriteria
        }
      });
    }

    // Process matches
    const matchesWithMeta = matches.map(match => ({
      ...match,
      meta: {
        matchType: match.data.attributes.matchType || 'UNKNOWN',
        isCustomMatch: match.data.attributes.isCustomMatch || false,
        createdAt: match.data.attributes.createdAt,
        userId: userId // Include authenticated user ID in metadata
      }
    }));

    // Sort matches by creation date
    matchesWithMeta.sort((a, b) => new Date(b.meta.createdAt) - new Date(a.meta.createdAt));

    const endTime = Date.now();
    console.log(`[${new Date().toISOString()}] Search completed. Total time: ${endTime - startTime}ms`);

    return res.json({
      data: matchesWithMeta,
      meta: {
        count: matchesWithMeta.length,
        searchTime: endTime - startTime,
        filters: limitedCriteria,
        authenticated: !!userId
      }
    });

  } catch (error) {
    console.error('Unhandled error in matches search:', error);
    res.status(500).json({ 
      error: 'Unexpected error in match search',
      details: error.message || 'Unknown server error'
    });
  }
});

// Rest of the routes remain the same...

module.exports = router;