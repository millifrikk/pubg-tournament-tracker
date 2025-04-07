// server/src/controllers/tournamentsController.js
const { db } = require('../db/connection');
const pubgApiService = require('../services/pubgApiServiceEnhanced');

const tournamentsController = {
  /**
   * Get all tournaments
   */
  getAllTournaments: async (req, res) => {
    try {
      const query = `
        SELECT 
          t.*, 
          COUNT(DISTINCT tt.team_id) as team_count,
          COUNT(DISTINCT tm.id) as match_count
        FROM tournaments t
        LEFT JOIN tournament_teams tt ON t.id = tt.tournament_id
        LEFT JOIN custom_matches tm ON t.id = tm.tournament_id
        GROUP BY t.id
        ORDER BY t.start_date DESC
      `;
      
      const result = await db.raw(query);
      const tournaments = result.rows || [];

      res.json({ data: tournaments });
    } catch (error) {
      console.error('Error getting tournaments:', error);
      res.status(500).json({ error: 'Failed to get tournaments' });
    }
  },

  /**
   * Create a new tournament
   */
  createTournament: async (req, res) => {
    try {
      const { name, startDate, endDate, description } = req.body;
      
      if (!name || !startDate || !endDate) {
        return res.status(400).json({ error: 'Name, start date, and end date are required' });
      }

      // Extract user ID from JWT token (added by auth middleware)
      const organizerId = req.user.id;
      
      // Create tournament
      const [tournament] = await db('tournaments')
        .insert({
          name,
          description,
          organizer_id: organizerId,
          start_date: new Date(startDate),
          end_date: new Date(endDate),
          format: 'standard',
          scoring_system: 'super',
          is_active: true,
          is_public: true
        })
        .returning('*');
      
      res.status(201).json({ data: tournament });
    } catch (error) {
      console.error('Error creating tournament:', error);
      res.status(500).json({ error: 'Failed to create tournament' });
    }
  },

  /**
   * Get tournament by ID
   */
  getTournamentById: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get tournament with team and match counts
      const query = `
        SELECT 
          t.*, 
          COUNT(DISTINCT tt.team_id) as team_count,
          COUNT(DISTINCT tm.id) as match_count
        FROM tournaments t
        LEFT JOIN tournament_teams tt ON t.id = tt.tournament_id
        LEFT JOIN custom_matches tm ON t.id = tm.tournament_id
        WHERE t.id = $1
        GROUP BY t.id
      `;
      
      const result = await db.raw(query, [id]);
      const tournament = result.rows && result.rows.length > 0 ? result.rows[0] : null;
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      res.json({ data: tournament });
    } catch (error) {
      console.error(`Error getting tournament ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get tournament' });
    }
  },

  /**
   * Update tournament
   */
  updateTournament: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, startDate, endDate, description, isActive, isPublic } = req.body;
      
      const tournament = await db('tournaments')
        .where({ id })
        .first();
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Check if user is the organizer
      if (tournament.organizer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to update this tournament' });
      }
      
      // Build update object
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (startDate !== undefined) updateData.start_date = new Date(startDate);
      if (endDate !== undefined) updateData.end_date = new Date(endDate);
      if (isActive !== undefined) updateData.is_active = isActive;
      if (isPublic !== undefined) updateData.is_public = isPublic;
      updateData.updated_at = new Date();
      
      // Update tournament
      const [updatedTournament] = await db('tournaments')
        .where({ id })
        .update(updateData)
        .returning('*');
      
      res.json({ data: updatedTournament });
    } catch (error) {
      console.error(`Error updating tournament ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to update tournament' });
    }
  },

  /**
   * Delete tournament
   */
  deleteTournament: async (req, res) => {
    try {
      const { id } = req.params;
      
      const tournament = await db('tournaments')
        .where({ id })
        .first();
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Check if user is the organizer
      if (tournament.organizer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to delete this tournament' });
      }
      
      await db('tournaments')
        .where({ id })
        .delete();
      
      res.json({ message: 'Tournament deleted successfully' });
    } catch (error) {
      console.error(`Error deleting tournament ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to delete tournament' });
    }
  },

  /**
   * Get teams in tournament
   */
  getTournamentTeams: async (req, res) => {
    try {
      const { id } = req.params;
      
      const teams = await db('tournament_teams')
        .select('teams.*', 'tournament_teams.points')
        .join('teams', 'tournament_teams.team_id', 'teams.id')
        .where({ 'tournament_teams.tournament_id': id })
        .orderBy('tournament_teams.points', 'desc');
      
      res.json({ data: teams });
    } catch (error) {
      console.error(`Error getting teams for tournament ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get tournament teams' });
    }
  },

  /**
   * Add team to tournament
   */
  addTeamToTournament: async (req, res) => {
    try {
      const { id: tournamentId } = req.params;
      const { teamId } = req.body;
      
      const tournament = await db('tournaments')
        .where({ id: tournamentId })
        .first();
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Check if user is the organizer
      if (tournament.organizer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to modify this tournament' });
      }
      
      // Check if team already exists in tournament
      const existingTeam = await db('tournament_teams')
        .where({ tournament_id: tournamentId, team_id: teamId })
        .first();
      
      if (existingTeam) {
        return res.status(400).json({ error: 'Team is already in this tournament' });
      }
      
      // Add team to tournament
      await db('tournament_teams')
        .insert({
          tournament_id: tournamentId,
          team_id: teamId,
          points: 0
        });
      
      res.json({ message: 'Team added to tournament successfully' });
    } catch (error) {
      console.error(`Error adding team to tournament ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to add team to tournament' });
    }
  },

  /**
   * Remove team from tournament
   */
  removeTeamFromTournament: async (req, res) => {
    try {
      const { id: tournamentId, teamId } = req.params;
      
      const tournament = await db('tournaments')
        .where({ id: tournamentId })
        .first();
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Check if user is the organizer
      if (tournament.organizer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to modify this tournament' });
      }
      
      await db('tournament_teams')
        .where({ tournament_id: tournamentId, team_id: teamId })
        .delete();
      
      res.json({ message: 'Team removed from tournament successfully' });
    } catch (error) {
      console.error(`Error removing team ${req.params.teamId} from tournament ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to remove team from tournament' });
    }
  },

  /**
   * Get matches in tournament
   */
  getTournamentMatches: async (req, res) => {
    try {
      const { id } = req.params;
      
      const matches = await db('custom_matches')
        .where({ tournament_id: id })
        .orderBy('match_number', 'asc');
      
      res.json({ data: matches });
    } catch (error) {
      console.error(`Error getting matches for tournament ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get tournament matches' });
    }
  },

  /**
   * Add match to tournament
   */
  addMatchToTournament: async (req, res) => {
    try {
      const { id: tournamentId } = req.params;
      const { matchId, matchDate, mapName, gameMode, matchNumber } = req.body;
      
      const tournament = await db('tournaments')
        .where({ id: tournamentId })
        .first();
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Check if user is the organizer
      if (tournament.organizer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to modify this tournament' });
      }
      
      // Check if match already exists
      const existingMatch = await db('custom_matches')
        .where({ match_id: matchId, tournament_id: tournamentId })
        .first();
      
      if (existingMatch) {
        return res.status(400).json({ error: 'Match is already in this tournament' });
      }
      
      // Get next match number if not provided
      let nextMatchNumber = matchNumber;
      if (!nextMatchNumber) {
        const lastMatch = await db('custom_matches')
          .where({ tournament_id: tournamentId })
          .orderBy('match_number', 'desc')
          .first();
        
        nextMatchNumber = lastMatch ? lastMatch.match_number + 1 : 1;
      }
      
      // Add match to tournament
      await db('custom_matches')
        .insert({
          match_id: matchId,
          tournament_id: tournamentId,
          registered_by: req.user.id,
          match_number: nextMatchNumber,
          stage: 'group',
          map_name: mapName,
          game_mode: gameMode,
          registered_at: new Date(matchDate || new Date())
        });
      
      res.json({ message: 'Match added to tournament successfully' });
    } catch (error) {
      console.error(`Error adding match to tournament ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to add match to tournament' });
    }
  },

  /**
   * Remove match from tournament
   */
  removeMatchFromTournament: async (req, res) => {
    try {
      const { id: tournamentId, matchId } = req.params;
      
      const tournament = await db('tournaments')
        .where({ id: tournamentId })
        .first();
      
      if (!tournament) {
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      // Check if user is the organizer
      if (tournament.organizer_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to modify this tournament' });
      }
      
      await db('custom_matches')
        .where({ id: matchId, tournament_id: tournamentId })
        .delete();
      
      res.json({ message: 'Match removed from tournament successfully' });
    } catch (error) {
      console.error(`Error removing match from tournament ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to remove match from tournament' });
    }
  },

  /**
   * Get tournament leaderboard
   */
  getTournamentLeaderboard: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get tournament teams with their points
      const query = `
        SELECT 
          t.id as team_id,
          t.name as team_name,
          t.logo_url,
          t.tag as abbreviation,
          tt.points as total_points,
          COUNT(DISTINCT mr.tournament_match_id) as matches_played,
          SUM(mr.kills) as total_kills,
          SUM(CASE WHEN mr.placement = 1 THEN 1 ELSE 0 END) as wins,
          ROUND(AVG(mr.placement), 2) as avg_placement
        FROM teams t
        JOIN tournament_teams tt ON t.id = tt.team_id AND tt.tournament_id = $1
        LEFT JOIN match_results mr ON t.id = mr.team_id
        LEFT JOIN custom_matches tm ON mr.tournament_match_id = tm.id AND tm.tournament_id = $1
        GROUP BY t.id, t.name, t.logo_url, t.tag, tt.points
        ORDER BY tt.points DESC
      `;
      
      const result = await db.raw(query, [id]);
      const leaderboard = result.rows || [];
      
      res.json({ data: leaderboard });
    } catch (error) {
      console.error(`Error getting leaderboard for tournament ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to get tournament leaderboard' });
    }
  }
};

module.exports = tournamentsController;
