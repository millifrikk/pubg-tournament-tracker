const { db } = require('../db/connection');

const tournamentsController = {
  /**
   * Get teams with player counts for a tournament
   */
  getTournamentTeamsWithPlayers: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if tournament exists
      const tournament = await db('tournaments')
        .where({ id })
        .first();
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Get teams with player counts
      const teams = await db('tournament_teams')
        .select(
          'teams.id', 
          'teams.name', 
          'teams.tag',
          'teams.logo_url',
          'tournament_teams.seed_number',
          'tournament_teams.points',
          db.raw('COUNT(DISTINCT players.id) as player_count')
        )
        .join('teams', 'tournament_teams.team_id', 'teams.id')
        .leftJoin('players', 'players.team_id', 'teams.id')
        .where({ 'tournament_teams.tournament_id': id })
        .groupBy(
          'teams.id', 
          'teams.name', 
          'teams.tag', 
          'teams.logo_url',
          'tournament_teams.seed_number',
          'tournament_teams.points'
        )
        .orderBy('tournament_teams.points', 'desc');
      
      res.json({ 
        data: teams,
        meta: {
          count: teams.length,
          tournamentId: id
        }
      });
    } catch (error) {
      console.error(`Error getting teams for tournament ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get tournament teams' });
    }
  },

  /**
   * Get all tournaments
   */
  getAllTournaments: async (req, res) => {
    try {
      const { limit = 20, offset = 0, active, public } = req.query;
      
      // Build query
      let query = db('tournaments')
        .select('id', 'name', 'description', 'start_date', 'end_date', 'format', 'scoring_system', 'is_active', 'is_public', 'created_at')
        .orderBy('created_at', 'desc')
        .limit(parseInt(limit, 10))
        .offset(parseInt(offset, 10));
      
      // Add filters if provided
      if (active !== undefined) {
        query = query.where('is_active', active === 'true');
      }
      
      if (public !== undefined) {
        query = query.where('is_public', public === 'true');
      }
      
      const tournaments = await query;
      
      res.json({
        data: tournaments,
        meta: {
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          count: tournaments.length
        }
      });
    } catch (error) {
      console.error('Error getting tournaments:', error);
      res.status(500).json({ 
        error: 'Error retrieving tournaments',
        details: error.message
      });
    }
  },

  /**
   * Get tournament by ID
   */
  getTournamentById: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get tournament
      const tournament = await db('tournaments')
        .where({ id })
        .first();
      
      if (!tournament) {
        return res.status(404).json({ 
          error: 'Tournament not found',
          data: { message: 'The requested tournament could not be found' }
        });
      }
      
      // Get teams for this tournament
      const teams = await db('tournament_teams')
        .select(
          'tournament_teams.seed_number', 
          'tournament_teams.is_active', 
          'tournament_teams.points',
          'teams.id', 
          'teams.name', 
          'teams.tag', 
          'teams.logo_url'
        )
        .join('teams', 'tournament_teams.team_id', 'teams.id')
        .where({ 'tournament_teams.tournament_id': id });
      
      // Get matches for this tournament
      const matches = await db('custom_matches')
        .where({ tournament_id: id })
        .orderBy('match_number', 'asc');
      
      // Get standings if they exist
      const standings = await db('tournament_standings')
        .where({ tournament_id: id })
        .orderBy('calculated_at', 'desc')
        .first();
      
      // Prepare response data
      const responseData = {
        data: {
          ...tournament,
          teams,
          matches,
          standings: standings ? standings.standings : null
        }
      };
      
      // Send response
      res.json(responseData);
    } catch (error) {
      console.error(`Error getting tournament with ID ${req.params.id}:`, error);
      res.status(500).json({ 
        error: 'Error retrieving tournament',
        details: error.message
      });
    }
  },

  /**
   * Create tournament
   */
  createTournament: async (req, res) => {
    try {
      const {
        name,
        description,
        startDate,
        endDate,
        format,
        scoringSystem,
        customScoringTable,
        isActive = true,
        isPublic = true
      } = req.body;
      
      // Get organizer ID from authenticated user
      const organizerId = req.user.id;
      console.log('Creating tournament with organizer ID:', organizerId);
      
      // Validate that we have a valid UUID
      if (!organizerId || organizerId === '00000000-0000-0000-0000-000000000000') {
        console.error('Invalid organizer ID:', organizerId);
        return res.status(400).json({ 
          error: 'Valid user ID required to create tournament',
          details: 'Authentication issue: Invalid or missing user ID'
        });
      }
      
      // Validate required fields
      const missingFields = [];
      if (!name) missingFields.push('name');
      if (!startDate) missingFields.push('startDate');
      if (!endDate) missingFields.push('endDate');
      if (!format) missingFields.push('format');
      if (!scoringSystem) missingFields.push('scoringSystem');
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          error: `Missing required fields: ${missingFields.join(', ')}`,
          details: 'Please provide all required fields to create a tournament'
        });
      }
      
      // Create tournament
      const tournamentData = {
        name,
        description,
        organizer_id: organizerId,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        format,
        scoring_system: scoringSystem,
        custom_scoring_table: customScoringTable ? JSON.stringify(customScoringTable) : null,
        is_active: isActive,
        is_public: isPublic
      };
        
      const [tournament] = await db('tournaments')
        .insert(tournamentData)
        .returning('*');
      
      res.status(201).json({
        message: 'Tournament created successfully',
        data: tournament
      });
    } catch (error) {
      console.error('Error creating tournament:', error);
      
      // More specific error messages
      if (error.code === '23503') {
        return res.status(400).json({ 
          error: 'Database constraint error. Please check that all referenced IDs are valid.' 
        });
      }
      
      if (error.code === '23505') {
        return res.status(409).json({ 
          error: 'A tournament with this name already exists' 
        });
      }
      
      // Check for date format issues
      if (error.message && error.message.includes('date')) {
        return res.status(400).json({ 
          error: 'Invalid date format. Please use a valid date format.' 
        });
      }
      
      res.status(500).json({ 
        error: 'Error creating tournament',
        details: error.message
      });
    }
  },

  /**
   * Get players from all teams in a tournament
   */
  getTournamentPlayers: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if tournament exists
      const tournament = await db('tournaments')
        .where({ id })
        .first();
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Get players from all teams in this tournament
      const players = await db('players')
        .select('players.*', 'teams.name as team_name')
        .join('teams', 'players.team_id', 'teams.id')
        .join('tournament_teams', 'teams.id', 'tournament_teams.team_id')
        .where('tournament_teams.tournament_id', id);
      
      res.json({
        data: players,
        meta: {
          count: players.length,
          tournamentId: id
        }
      });
    } catch (error) {
      console.error(`Error getting players for tournament ${req.params.id}:`, error);
      res.status(500).json({ 
        error: 'Error retrieving tournament players',
        details: error.message
      });
    }
  },

  /**
   * Add team to tournament
   */
  addTeamToTournament: async (req, res) => {
    try {
      const { id } = req.params;
      const { teamId } = req.body;
      
      console.log(`Adding team ${teamId} to tournament ${id}`);
      
      if (!teamId) {
        return res.status(400).json({ error: 'Team ID is required' });
      }
      
      // Check if tournament exists
      const tournament = await db('tournaments')
        .where({ id })
        .first();
      
      if (!tournament) {
        console.log(`Tournament not found with ID: ${id}`);
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Check if user is the organizer or an admin
      const userId = req.user.id;
      const userRole = req.user.role;
      
      if (userRole !== 'admin' && tournament.organizer_id !== userId) {
        console.log('Authorization failed: User is not the organizer or an admin');
        return res.status(403).json({ 
          error: 'Not authorized to add teams to this tournament',
          details: 'Only the tournament organizer or an admin can add teams'
        });
      }
      
      // Check if team exists
      const team = await db('teams')
        .where({ id: teamId })
        .first();
      
      if (!team) {
        console.log(`Team not found with ID: ${teamId}`);
        return res.status(404).json({ error: 'Team not found' });
      }
      
      // Check if team is already in this tournament
      const existingTeam = await db('tournament_teams')
        .where({ 
          tournament_id: id,
          team_id: teamId
        })
        .first();
      
      if (existingTeam) {
        console.log(`Team ${teamId} is already in tournament ${id}`);
        return res.status(409).json({ 
          error: 'Team is already in this tournament',
          details: `Team '${team.name}' is already registered in this tournament`
        });
      }
      
      // Get next seed number
      const lastTeam = await db('tournament_teams')
        .where({ tournament_id: id })
        .orderBy('seed_number', 'desc')
        .first();
      
      const seedNumber = lastTeam ? lastTeam.seed_number + 1 : 1;
      
      // Add team to tournament
      const [addedTeam] = await db('tournament_teams')
        .insert({
          tournament_id: id,
          team_id: teamId,
          seed_number: seedNumber,
          is_active: true,
          points: 0 // Initialize with zero points
        })
        .returning('*');
      
      // Get full team details
      const teamWithDetails = await db('tournament_teams')
        .select(
          'tournament_teams.seed_number', 
          'tournament_teams.is_active', 
          'tournament_teams.points',
          'teams.id', 
          'teams.name', 
          'teams.tag', 
          'teams.logo_url'
        )
        .join('teams', 'tournament_teams.team_id', 'teams.id')
        .where({ 
          'tournament_teams.tournament_id': id,
          'tournament_teams.team_id': teamId
        })
        .first();
      
      // Emit team added event via WebSocket if available
      if (req.io) {
        req.io.emitTournamentUpdate(id, {
          type: 'TEAM_ADDED',
          tournamentId: id,
          teamId: teamId,
          teamName: team.name,
          timestamp: new Date()
        });
      }
      
      res.status(201).json({
        message: 'Team added to tournament successfully',
        data: teamWithDetails
      });
    } catch (error) {
      console.error(`Error adding team to tournament ${req.params.id}:`, error);
      res.status(500).json({ 
        error: 'Error adding team to tournament',
        details: error.message
      });
    }
  },

  /**
   * Remove team from tournament
   */
  removeTeamFromTournament: async (req, res) => {
    try {
      const { id, teamId } = req.params;
      
      // Check if tournament exists
      const tournament = await db('tournaments')
        .where({ id })
        .first();
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Check if user is the organizer or an admin
      if (req.user.role !== 'admin' && tournament.organizer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to remove teams from this tournament' });
      }
      
      // Check if team is in this tournament
      const teamInTournament = await db('tournament_teams')
        .where({ 
          tournament_id: id,
          team_id: teamId
        })
        .first();
      
      if (!teamInTournament) {
        return res.status(404).json({ error: 'Team not found in this tournament' });
      }
      
      // Remove team from tournament
      await db('tournament_teams')
        .where({ 
          tournament_id: id,
          team_id: teamId
        })
        .delete();
      
      // Emit team removed event via WebSocket if available
      if (req.io) {
        req.io.emitTournamentUpdate(id, {
          type: 'TEAM_REMOVED',
          tournamentId: id,
          teamId: teamId,
          timestamp: new Date()
        });
      }
      
      res.json({
        message: 'Team removed from tournament successfully'
      });
    } catch (error) {
      console.error(`Error removing team from tournament ${req.params.id}:`, error);
      res.status(500).json({ 
        error: 'Error removing team from tournament',
        details: error.message
      });
    }
  }
};

module.exports = tournamentsController;
