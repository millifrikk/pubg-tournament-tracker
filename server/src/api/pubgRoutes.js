const express = require('express');
const PUBGApiService = require('../services/pubgApiService');

const router = express.Router();

// Search for a player's matches
router.get('/player-matches', async (req, res) => {
  try {
    const { playerName, platform = 'steam' } = req.query;

    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    const matches = await PUBGApiService.searchPlayerMatches(playerName, platform);
    res.json(matches);
  } catch (error) {
    console.error('Error in player matches route:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve player matches', 
      details: error.message 
    });
  }
});

// Get match details
router.get('/match/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { platform = 'steam' } = req.query;

    if (!matchId) {
      return res.status(400).json({ error: 'Match ID is required' });
    }

    const matchDetails = await PUBGApiService.getMatchDetails(matchId, platform);
    res.json(matchDetails);
  } catch (error) {
    console.error('Error in match details route:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve match details', 
      details: error.message 
    });
  }
});

module.exports = router;