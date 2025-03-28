const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const pubgApiService = require('../services/pubgApiService');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');

/**
 * @route GET /api/teams
 * @desc Get all teams
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 20, offset = 0, search } = req.query;
    
    // Build query
    let query = db('teams')
      .select('id', 'name', 'tag', 'logo_url', 'created_at', 'updated_at')
      .orderBy('name', 'asc')
      .limit(parseInt(limit, 10))
      .offset(parseInt(offset, 10));
    
    // Add search filter if provided
    if (search) {
      query = query.where('name', 'ilike', `%${search}%`)
        .orWhere('tag', 'ilike', `%${search}%`);
    }
    
    const teams = await query;
    
    res.json({
      data: teams,
      meta: {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        count: teams.length
      }
    });
  } catch (error) {
    console.error('Error getting teams:', error);
    res.status(500).json({ 
      error: 'Error retrieving teams',
      details: error.message
    });
  }
});

/**
 * @route GET /api/teams/:id
 * @desc Get team by ID
 * @access Public
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get team
    const team = await db('teams')
      .where({ id })
      .first();
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Get players for this team
    const players = await db('team_players')
      .select('team_players.is_active', 'team_players.joined_at', 'players.id', 'players.name', 'players.pubg_id', 'players.platform')
      .join('players', 'team_players.player_id', 'players.id')
      .where({ 'team_players.team_id': id });
    
    // Get tournaments this team has participated in
    const tournaments = await db('tournament_teams')
      .select('tournament_teams.seed_number', 'tournament_teams.is_active', 'tournaments.id', 'tournaments.name', 'tournaments.start_date', 'tournaments.end_date', 'tournaments.format')
      .join('tournaments', 'tournament_teams.tournament_id', 'tournaments.id')
      .where({ 'tournament_teams.team_id': id })
      .orderBy('tournaments.start_date', 'desc');
    
    res.json({
      data: {
        ...team,
        players,
        tournaments
      }
    });
  } catch (error) {
    console.error(`Error getting team with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error retrieving team',
      details: error.message
    });
  }
});

/**
 * @route POST /api/teams
 * @desc Create a new team
 * @access Private
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const {
      name,
      tag,
      logoUrl
    } = req.body;
    
    // TODO: Get user ID from JWT token
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    
    // Check if team name already exists
    const existingTeam = await db('teams')
      .where({ name })
      .first();
    
    if (existingTeam) {
      return res.status(409).json({ error: 'Team name already exists' });
    }
    
    // Create team
    const [team] = await db('teams')
      .insert({
        name,
        tag: tag || name.substring(0, 4).toUpperCase(),
        logo_url: logoUrl
      })
      .returning('*');
    
    res.status(201).json({
      message: 'Team created successfully',
      data: team
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ 
      error: 'Error creating team',
      details: error.message
    });
  }
});

/**
 * @route PUT /api/teams/:id
 * @desc Update a team
 * @access Private
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      tag,
      logoUrl
    } = req.body;
    
    // TODO: Get user ID from JWT token and check permissions
    
    // Check if team exists
    const team = await db('teams')
      .where({ id })
      .first();
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (tag !== undefined) updateData.tag = tag;
    if (logoUrl !== undefined) updateData.logo_url = logoUrl;
    
    // If updating name, check if it already exists
    if (name && name !== team.name) {
      const existingTeam = await db('teams')
        .where({ name })
        .whereNot({ id })
        .first();
      
      if (existingTeam) {
        return res.status(409).json({ error: 'Team name already exists' });
      }
    }
    
    // Update team
    const [updatedTeam] = await db('teams')
      .where({ id })
      .update(updateData)
      .returning('*');
    
    res.json({
      message: 'Team updated successfully',
      data: updatedTeam
    });
  } catch (error) {
    console.error(`Error updating team with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error updating team',
      details: error.message
    });
  }
});

/**
 * @route DELETE /api/teams/:id
 * @desc Delete a team
 * @access Private
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // TODO: Get user ID from JWT token and check permissions
    
    // Check if team exists
    const team = await db('teams')
      .where({ id })
      .first();
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if team is associated with any tournaments
    const tournamentTeams = await db('tournament_teams')
      .where({ team_id: id })
      .first();
    
    if (tournamentTeams) {
      return res.status(409).json({ 
        error: 'Cannot delete team that is associated with tournaments' 
      });
    }
    
    // Delete team
    await db('teams')
      .where({ id })
      .delete();
    
    res.json({
      message: 'Team deleted successfully'
    });
  } catch (error) {
    console.error(`Error deleting team with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error deleting team',
      details: error.message
    });
  }
});

/**
 * @route POST /api/teams/:id/players
 * @desc Add players to a team
 * @access Private
 */
router.post('/:id/players', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { players } = req.body;
    
    // TODO: Get user ID from JWT token and check permissions
    
    if (!players || !Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ error: 'Players array is required' });
    }
    
    // Check if team exists
    const team = await db('teams')
      .where({ id })
      .first();
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Process each player
    const addedPlayers = [];
    const errors = [];
    
    for (const playerData of players) {
      const { pubgId, platform = 'steam', name } = playerData;
      
      if (!pubgId) {
        errors.push({ playerData, error: 'PUBG ID is required' });
        continue;
      }
      
      try {
        // Check if player already exists in database
        let player = await db('players')
          .where({ pubg_id: pubgId })
          .first();
        
        if (!player) {
          // If player doesn't exist, try to fetch from PUBG API
          try {
            // For this prototype, we'll create the player with provided data
            // In a real implementation, we'd verify with PUBG API first
            [player] = await db('players')
              .insert({
                name: name || `Player ${pubgId.substring(0, 8)}`,
                pubg_id: pubgId,
                platform
              })
              .returning('*');
          } catch (apiError) {
            errors.push({ playerData, error: `Failed to create player: ${apiError.message}` });
            continue;
          }
        }
        
        // Check if player is already on this team
        const existingTeamPlayer = await db('team_players')
          .where({ 
            team_id: id,
            player_id: player.id
          })
          .first();
        
        if (existingTeamPlayer) {
          // If player was inactive, reactivate
          if (!existingTeamPlayer.is_active) {
            await db('team_players')
              .where({ 
                team_id: id,
                player_id: player.id
              })
              .update({ is_active: true });
            
            addedPlayers.push({ ...player, status: 'reactivated' });
          } else {
            errors.push({ playerData, error: 'Player already on this team' });
          }
          continue;
        }
        
        // Add player to team
        await db('team_players')
          .insert({
            team_id: id,
            player_id: player.id,
            is_active: true,
            joined_at: new Date()
          });
        
        addedPlayers.push({ ...player, status: 'added' });
      } catch (error) {
        errors.push({ playerData, error: error.message });
      }
    }
    
    // Get updated players list
    const teamPlayers = await db('team_players')
      .select('team_players.is_active', 'team_players.joined_at', 'players.id', 'players.name', 'players.pubg_id', 'players.platform')
      .join('players', 'team_players.player_id', 'players.id')
      .where({ 'team_players.team_id': id });
    
    res.status(201).json({
      message: `${addedPlayers.length} players added to team, ${errors.length} failures`,
      data: {
        addedPlayers,
        errors,
        teamPlayers
      }
    });
  } catch (error) {
    console.error(`Error adding players to team ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error adding players to team',
      details: error.message
    });
  }
});

/**
 * @route DELETE /api/teams/:id/players/:playerId
 * @desc Remove a player from a team
 * @access Private
 */
router.delete('/:id/players/:playerId', authenticateJWT, async (req, res) => {
  try {
    const { id, playerId } = req.params;
    
    // TODO: Get user ID from JWT token and check permissions
    
    // Check if team exists
    const team = await db('teams')
      .where({ id })
      .first();
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if player is on this team
    const teamPlayer = await db('team_players')
      .where({ 
        team_id: id,
        player_id: playerId
      })
      .first();
    
    if (!teamPlayer) {
      return res.status(404).json({ error: 'Player not found on this team' });
    }
    
    // Remove player from team
    await db('team_players')
      .where({ 
        team_id: id,
        player_id: playerId
      })
      .delete();
    
    res.json({
      message: 'Player removed from team successfully'
    });
  } catch (error) {
    console.error(`Error removing player ${req.params.playerId} from team ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error removing player from team',
      details: error.message
    });
  }
});

module.exports = router;
