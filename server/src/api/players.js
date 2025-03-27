const express = require('express');
const router = express.Router();
const pubgApiService = require('../services/pubgApiService');

/**
 * @route GET /api/players/search
 * @desc Search for players by name
 * @access Public
 */
router.get('/search', async (req, res) => {
  try {
    const { name, platform = 'steam' } = req.query;
    
    if (!name) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    const playerData = await pubgApiService.getPlayerByName(name, platform);
    
    res.json(playerData);
  } catch (error) {
    console.error('Error searching for player:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.status(500).json({ 
      error: 'Error searching for player',
      details: error.message
    });
  }
});

/**
 * @route GET /api/players/:id
 * @desc Get player by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { platform = 'steam' } = req.query;
    
    const playerData = await pubgApiService.getPlayerById(id, platform);
    
    res.json(playerData);
  } catch (error) {
    console.error(`Error getting player with ID ${req.params.id}:`, error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.status(500).json({ 
      error: 'Error retrieving player',
      details: error.message
    });
  }
});

/**
 * @route GET /api/players/:id/matches
 * @desc Get player's match history
 * @access Public
 */
router.get('/:id/matches', async (req, res) => {
  try {
    const { id } = req.params;
    const { platform = 'steam', limit = 10 } = req.query;
    
    // Get player data which includes match IDs
    const playerData = await pubgApiService.getPlayerById(id, platform);
    
    if (!playerData.data.relationships.matches) {
      return res.json({ data: [] });
    }
    
    // Extract match IDs
    const matchIds = playerData.data.relationships.matches.data
      .slice(0, parseInt(limit, 10))
      .map(match => match.id);
    
    // Fetch match data for each ID
    const matchPromises = matchIds.map(matchId => 
      pubgApiService.getMatch(matchId, platform)
        .catch(error => {
          console.error(`Error fetching match ${matchId}:`, error);
          return null; // Return null for failed matches
        })
    );
    
    const matches = await Promise.all(matchPromises);
    
    // Filter out failed match requests
    const validMatches = matches.filter(match => match !== null);
    
    res.json({
      data: validMatches,
      meta: {
        count: validMatches.length,
        total: playerData.data.relationships.matches.data.length
      }
    });
  } catch (error) {
    console.error(`Error getting matches for player ${req.params.id}:`, error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.status(500).json({ 
      error: 'Error retrieving player matches',
      details: error.message
    });
  }
});

/**
 * @route GET /api/players/:id/season/:seasonId
 * @desc Get player's season stats
 * @access Public
 */
router.get('/:id/season/:seasonId', async (req, res) => {
  try {
    const { id, seasonId } = req.params;
    const { platform = 'steam' } = req.query;
    
    const seasonStats = await pubgApiService.getPlayerSeasonStats(id, seasonId, platform);
    
    res.json(seasonStats);
  } catch (error) {
    console.error(`Error getting season stats for player ${req.params.id}:`, error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Player or season not found' });
    }
    
    res.status(500).json({ 
      error: 'Error retrieving season stats',
      details: error.message
    });
  }
});

module.exports = router;
