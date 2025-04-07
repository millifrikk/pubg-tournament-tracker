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

module.exports = router;
