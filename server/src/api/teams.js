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
    
    // Get players from both team_players junction AND direct team_id reference
    let players = [];
    
    // Get players with direct team_id reference
    const directPlayers = await db('players')
      .where({ team_id: id });
      
    if (directPlayers.length > 0) {
      players = directPlayers;
    } else {
      // Fall back to team_players junction if no direct players found
      players = await db('team_players')
        .select('team_players.is_active', 'team_players.joined_at', 'players.id', 'players.name', 'players.pubg_id', 'players.platform')
        .join('players', 'team_players.player_id', 'players.id')
        .where({ 'team_players.team_id': id });
    }
    
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
    
    // Get creator ID from authenticated user
    const creatorId = req.user.id;
    
    console.log('Creating team with creator ID:', creatorId);
    console.log('Full user object from token:', req.user);
    
    // Validate that we have a valid UUID
    if (!creatorId) {
      return res.status(400).json({
        error: 'Valid user ID required to create team',
        details: 'Authentication issue: Invalid or missing user ID'
      });
    }
    
    // Prepare team data
    const teamData = {
      name,
      tag: tag || name.substring(0, 4).toUpperCase(),
      logo_url: logoUrl,
      created_by: creatorId  // Track the creator
    };
    
    console.log('Creating team with data:', teamData);
    
    // Create team
    const [team] = await db('teams')
      .insert(teamData)
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
    
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
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
    
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
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
 * @route GET /api/teams/:id/players
 * @desc Get all players for a team with direct relationship
 * @access Public
 */
router.get('/:id/players', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if team exists
    const team = await db('teams')
      .where({ id })
      .first();
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Get players with direct team_id reference
    const players = await db('players')
      .where({ team_id: id });
    
    res.json({
      data: players,
      meta: {
        count: players.length,
        teamId: id,
        teamName: team.name
      }
    });
  } catch (error) {
    console.error(`Error getting players for team ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error retrieving team players',
      details: error.message 
    });
  }
});

/**
 * @route POST /api/teams/:id/players
 * @desc Add a single player to a team with direct relationship
 * @access Private
 */
router.post('/:id/players', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { pubgName, pubgId, platform = 'steam' } = req.body;
    
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!pubgName) {
      return res.status(400).json({ error: 'PUBG name is required' });
    }
    
    // Check if team exists
    const team = await db('teams')
      .where({ id })
      .first();
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if player already exists by pubgName or pubgId
    let player = null;
    
    if (pubgId) {
      player = await db('players')
        .where({ pubg_id: pubgId })
        .orWhere({ name: pubgName })
        .orWhere({ pubg_name: pubgName })
        .first();
    } else {
      player = await db('players')
        .where({ name: pubgName })
        .orWhere({ pubg_name: pubgName })
        .first();
    }
    
    if (player) {
      // Player exists, update their team_id
      console.log(`Player ${pubgName} exists, updating team_id to ${id}`);
      
      // Check if player is already on this team
      if (player.team_id === id) {
        return res.status(400).json({ 
          error: 'Player is already on this team'
        });
      }
      
      // Update player's team
      const [updatedPlayer] = await db('players')
        .where({ id: player.id })
        .update({
          team_id: id,
          updated_at: new Date()
        })
        .returning('*');
      
      return res.json({
        message: 'Existing player added to team successfully',
        data: updatedPlayer
      });
    }
    
    // Player doesn't exist, create new player with team_id reference
    const [newPlayer] = await db('players')
      .insert({
        name: pubgName, // For compatibility with existing schema
        pubg_name: pubgName,
        pubg_id: pubgId || null,
        platform,
        team_id: id,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    
    res.status(201).json({
      message: 'New player added to team successfully',
      data: newPlayer
    });
  } catch (error) {
    console.error(`Error adding player to team ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error adding player to team',
      details: error.message 
    });
  }
});

/**
 * @route POST /api/teams/:id/players/bulk
 * @desc Add multiple players to a team
 * @access Private
 */
router.post('/:id/players/bulk', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { players } = req.body;
    
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
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
    
    // Get user ID from JWT token
    const userId = req.user.id;
    
    // Validate that we have a valid user ID
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        details: 'Valid user ID is needed to remove players'
      });
    }
    
    // Check if team exists
    const team = await db('teams')
      .where({ id })
      .first();
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // First check if player has direct team_id reference
    const player = await db('players')
      .where({ 
        id: playerId,
        team_id: id
      })
      .first();
    
    if (player) {
      // Update player to remove team association (don't delete the player)
      await db('players')
        .where({ id: playerId })
        .update({ 
          team_id: null,
          updated_at: new Date()
        });
        
      return res.json({
        message: 'Player removed from team successfully'
      });
    }
    
    // Fall back to team_players junction if no direct relationship
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
