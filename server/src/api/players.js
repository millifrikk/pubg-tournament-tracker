const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const { authenticateJWT } = require('../middleware/auth');

/**
 * @route GET /api/players
 * @desc Get all players or filter by team
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const { teamId } = req.query;
    
    let query = db('players')
      .select('id', 'pubg_id', 'pubg_name', 'name', 'platform', 'team_id', 'created_at', 'updated_at');
    
    if (teamId) {
      query = query.where({ team_id: teamId });
    }
    
    const players = await query;
    
    res.json({
      data: players,
      meta: {
        count: players.length
      }
    });
  } catch (error) {
    console.error('Error getting players:', error);
    res.status(500).json({ 
      error: 'Error retrieving players',
      details: error.message
    });
  }
});

/**
 * @route POST /api/players
 * @desc Create a new player
 * @access Private
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const { pubgName, pubgId, teamId, platform = 'steam' } = req.body;
    
    if (!pubgName) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    // Create player
    const [player] = await db('players')
      .insert({
        name: pubgName, // For compatibility with existing schema
        pubg_name: pubgName,
        pubg_id: pubgId || null,
        platform,
        team_id: teamId || null,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    
    res.status(201).json({
      message: 'Player created successfully',
      data: player
    });
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ 
      error: 'Error creating player',
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
    
    const player = await db('players')
      .where({ id })
      .first();
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({
      data: player
    });
  } catch (error) {
    console.error(`Error getting player ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error retrieving player',
      details: error.message
    });
  }
});

/**
 * @route PUT /api/players/:id
 * @desc Update player
 * @access Private
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { pubgName, pubgId, teamId, platform } = req.body;
    
    // Build update object
    const updateData = {};
    if (pubgName !== undefined) {
      updateData.pubg_name = pubgName;
      updateData.name = pubgName; // Update name field for backwards compatibility
    }
    if (pubgId !== undefined) updateData.pubg_id = pubgId;
    if (teamId !== undefined) updateData.team_id = teamId;
    if (platform !== undefined) updateData.platform = platform;
    updateData.updated_at = new Date();
    
    // Update player
    const [updatedPlayer] = await db('players')
      .where({ id })
      .update(updateData)
      .returning('*');
    
    if (!updatedPlayer) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({
      message: 'Player updated successfully',
      data: updatedPlayer
    });
  } catch (error) {
    console.error(`Error updating player ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error updating player',
      details: error.message
    });
  }
});

/**
 * @route DELETE /api/players/:id
 * @desc Delete player
 * @access Private
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete player
    const deletedCount = await db('players')
      .where({ id })
      .delete();
    
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({
      message: 'Player deleted successfully'
    });
  } catch (error) {
    console.error(`Error deleting player ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error deleting player',
      details: error.message
    });
  }
});

/**
 * @route GET /api/players/search
 * @desc Search players by pubg name
 * @access Public
 */
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const players = await db('players')
      .where('pubg_name', 'ilike', `%${query}%`)
      .orWhere('name', 'ilike', `%${query}%`)
      .limit(10);
    
    res.json({
      data: players,
      meta: {
        count: players.length,
        query
      }
    });
  } catch (error) {
    console.error('Error searching players:', error);
    res.status(500).json({ 
      error: 'Error searching players',
      details: error.message
    });
  }
});

/**
 * @route POST /api/players/assign-to-teams
 * @desc Assign multiple players to teams
 * @access Private
 */
router.post('/assign-to-teams', authenticateJWT, async (req, res) => {
  try {
    const { assignments } = req.body;
    
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ error: 'Player assignments are required' });
    }
    
    // Validate assignments
    const validAssignments = assignments.filter(assignment => 
      assignment.pubg_id && assignment.team_id
    );
    
    if (validAssignments.length === 0) {
      return res.status(400).json({ error: 'No valid player assignments provided' });
    }
    
    // Process assignments
    const results = {
      assigned: [],
      errors: []
    };
    
    // Process each assignment
    for (const assignment of validAssignments) {
      try {
        // Check if player exists
        const existingPlayer = await db('players')
          .where({ pubg_id: assignment.pubg_id })
          .first();
        
        if (existingPlayer) {
          // Update existing player
          const [updatedPlayer] = await db('players')
            .where({ pubg_id: assignment.pubg_id })
            .update({ 
              team_id: assignment.team_id,
              updated_at: new Date()
            })
            .returning('*');
          
          results.assigned.push(updatedPlayer.pubg_id);
        } else {
          // Create new player
          const [newPlayer] = await db('players')
            .insert({
              pubg_id: assignment.pubg_id,
              pubg_name: assignment.pubg_name || `Player_${assignment.pubg_id.substring(0, 8)}`,
              name: assignment.pubg_name || `Player_${assignment.pubg_id.substring(0, 8)}`,
              team_id: assignment.team_id,
              platform: assignment.platform || 'steam',
              created_at: new Date(),
              updated_at: new Date()
            })
            .returning('*');
          
          results.assigned.push(newPlayer.pubg_id);
        }
      } catch (error) {
        console.error(`Error processing assignment for player ${assignment.pubg_id}:`, error);
        results.errors.push({
          pubg_id: assignment.pubg_id,
          error: error.message
        });
      }
    }
    
    res.json({
      message: `${results.assigned.length} players assigned to teams`,
      assigned: results.assigned,
      errors: results.errors
    });
  } catch (error) {
    console.error('Error assigning players to teams:', error);
    res.status(500).json({ 
      error: 'Error assigning players to teams',
      details: error.message
    });
  }
});

/**
 * @route POST /api/players/extract-from-match
 * @desc Extract player data from a match
 * @access Private
 */
router.post('/extract-from-match', authenticateJWT, async (req, res) => {
  try {
    const { matchId, platform = 'steam' } = req.body;
    
    if (!matchId) {
      return res.status(400).json({ error: 'Match ID is required' });
    }
    
    // Get match data (this would use pubgApiService in a real implementation)
    // For now, we'll return a mock response
    const extractedPlayers = {
      new: [
        {
          pubg_id: 'account.1234567890',
          pubg_name: 'Player1',
          platform: 'steam'
        },
        {
          pubg_id: 'account.0987654321',
          pubg_name: 'Player2',
          platform: 'steam'
        }
      ],
      updated: [
        {
          pubg_id: 'account.1111111111',
          pubg_name: 'Player3',
          platform: 'steam'
        }
      ]
    };
    
    res.json({
      message: `Extracted ${extractedPlayers.new.length + extractedPlayers.updated.length} players from match`,
      data: extractedPlayers
    });
  } catch (error) {
    console.error('Error extracting players from match:', error);
    res.status(500).json({ 
      error: 'Error extracting players from match',
      details: error.message
    });
  }
});

module.exports = router;
