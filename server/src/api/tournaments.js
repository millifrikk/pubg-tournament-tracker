const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const pubgApiService = require('../services/pubgApiService');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');

// Simple in-memory rate limiter for API endpoints
const rateLimiter = {
  ips: {},
  limit: 30, // 30 requests per minute per IP
  timeWindow: 60 * 1000, // 1 minute
  
  // Check if request should be rate limited
  shouldLimit(ip) {
    const now = Date.now();
    
    // Clean up old entries
    this.cleanup(now);
    
    // Initialize entry for this IP if it doesn't exist
    if (!this.ips[ip]) {
      this.ips[ip] = {
        count: 0,
        resetAt: now + this.timeWindow
      };
    }
    
    // If the reset time has passed, reset the counter
    if (now > this.ips[ip].resetAt) {
      this.ips[ip] = {
        count: 0,
        resetAt: now + this.timeWindow
      };
    }
    
    // Increment counter
    this.ips[ip].count++;
    
    // Return whether this request exceeds the limit
    return this.ips[ip].count > this.limit;
  },
  
  // Clean up old entries to prevent memory leaks
  cleanup(now) {
    const ipsToDelete = [];
    
    for (const ip in this.ips) {
      if (now > this.ips[ip].resetAt) {
        ipsToDelete.push(ip);
      }
    }
    
    for (const ip of ipsToDelete) {
      delete this.ips[ip];
    }
  }
};

// Rate limiter middleware
function rateLimiterMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  
  if (rateLimiter.shouldLimit(ip)) {
    const retryAfter = Math.ceil((rateLimiter.ips[ip].resetAt - Date.now()) / 1000);
    res.set('Retry-After', retryAfter.toString());
    return res.status(429).json({ 
      error: 'Too many requests, please try again later',
      retryAfter
    });
  }
  
  next();
}

/**
 * @route GET /api/tournaments
 * @desc Get all tournaments
 * @access Public
 */
router.get('/', rateLimiterMiddleware, async (req, res) => {
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
});

/**
 * @route GET /api/tournaments/:id
 * @desc Get tournament by ID
 * @access Public
 */

// Simple in-memory cache for tournament data
const tournamentCache = {
  data: {},
  timestamp: {},
  TTL: 30000 // 30 seconds TTL
};

router.get('/:id', rateLimiterMiddleware, async (req, res) => {
  // Add cache control headers
  res.set('Cache-Control', 'public, max-age=30');
  
  // Check if we have a recent cached version
  const { id } = req.params;
  const now = Date.now();
  
  if (tournamentCache.data[id] && 
      tournamentCache.timestamp[id] && 
      now - tournamentCache.timestamp[id] < tournamentCache.TTL) {
    console.log(`Serving cached data for tournament ${id}`);
    // Verify cached data is valid before returning it
    const cachedResponse = tournamentCache.data[id];
    if (!cachedResponse?.data?.data) {
      console.warn(`Invalid cached data for tournament ${id}, fetching fresh data`);
      // Clear invalid cache
      delete tournamentCache.data[id];
      delete tournamentCache.timestamp[id];
    } else {
      console.log(`Serving valid cached tournament: ${cachedResponse.data.data.name}`);
      return res.json(cachedResponse);
    }
  }
  
  // If no cache hit, proceed with database query
  try {
    const { id } = req.params;
    
    // Get tournament
    // Log the tournament ID we're looking for
    console.log(`Looking for tournament with ID: ${id}`);
    
    const tournament = await db('tournaments')
      .where({ id })
      .first();
    
    if (!tournament) {
      console.warn(`Tournament not found with ID: ${id}`);
      return res.status(404).json({ 
        error: 'Tournament not found',
        data: { message: 'The requested tournament could not be found' }
      });
    }
    
    // Get teams for this tournament
    const teams = await db('tournament_teams')
      .select('tournament_teams.seed_number', 'tournament_teams.is_active', 'teams.id', 'teams.name', 'teams.tag', 'teams.logo_url')
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
    
    // Update cache if we have valid data
    if (tournament && tournament.id) {
      console.log(`Caching tournament data for ID ${id}: ${tournament.name}`);
      tournamentCache.data[id] = responseData;
      tournamentCache.timestamp[id] = Date.now();
    } else {
      console.warn(`Not caching invalid tournament data for ID ${id}`);
    }
    
    // Send response
    res.json(responseData);
  } catch (error) {
    console.error(`Error getting tournament with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error retrieving tournament',
      details: error.message
    });
  }
});

/**
 * @route POST /api/tournaments
 * @desc Create a new tournament
 * @access Private
 */
router.post('/', authenticateJWT, async (req, res) => {
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
      
    try {
      console.log('Creating tournament with data:', tournamentData);
      
      const [tournament] = await db('tournaments')
        .insert(tournamentData)
        .returning('*');
      
      res.status(201).json({
        message: 'Tournament created successfully',
        data: tournament
      });
    } catch (dbError) {
      console.error('Database error creating tournament:', dbError);
      
      // More detailed error handling for database errors
      if (dbError.code === '23503') {
        return res.status(400).json({
          error: 'Foreign key constraint violation',
          details: `The user ID ${organizerId} does not exist in the database`,
          code: dbError.code
        });
      }
      
      if (dbError.code === '23505') {
        return res.status(409).json({
          error: 'Unique constraint violation',
          details: 'A tournament with this name already exists',
          code: dbError.code
        });
      }
      
      return res.status(500).json({
        error: 'Error creating tournament in database',
        details: dbError.message,
        code: dbError.code || 'UNKNOWN'
      });
    }
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
});

/**
 * @route PUT /api/tournaments/:id
 * @desc Update a tournament
 * @access Private
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      startDate,
      endDate,
      format,
      scoringSystem,
      customScoringTable,
      isActive,
      isPublic
    } = req.body;
    
    // Check if tournament exists
    const tournament = await db('tournaments')
      .where({ id })
      .first();
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Check if user is the organizer or an admin
    if (req.user.role !== 'admin' && tournament.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this tournament' });
    }
    
    // Build update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.start_date = new Date(startDate);
    if (endDate !== undefined) updateData.end_date = new Date(endDate);
    if (format !== undefined) updateData.format = format;
    if (scoringSystem !== undefined) updateData.scoring_system = scoringSystem;
    if (customScoringTable !== undefined) updateData.custom_scoring_table = JSON.stringify(customScoringTable);
    if (isActive !== undefined) updateData.is_active = isActive;
    if (isPublic !== undefined) updateData.is_public = isPublic;
    
    // Update tournament
    const [updatedTournament] = await db('tournaments')
      .where({ id })
      .update(updateData)
      .returning('*');
    
    res.json({
      message: 'Tournament updated successfully',
      data: updatedTournament
    });
  } catch (error) {
    console.error(`Error updating tournament with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error updating tournament',
      details: error.message
    });
  }
});

/**
 * @route DELETE /api/tournaments/:id
 * @desc Delete a tournament
 * @access Private
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if tournament exists
    const tournament = await db('tournaments')
      .where({ id })
      .first();
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Check if user is the organizer or an admin
    if (req.user.role !== 'admin' && tournament.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this tournament' });
    }
    
    // Delete tournament
    await db('tournaments')
      .where({ id })
      .delete();
    
    res.json({
      message: 'Tournament deleted successfully'
    });
  } catch (error) {
    console.error(`Error deleting tournament with ID ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error deleting tournament',
      details: error.message
    });
  }
});

/**
 * @route GET /api/tournaments/:id/teams
 * @desc Get teams for a tournament
 * @access Public
 */
router.get('/:id/teams', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if tournament exists
    const tournament = await db('tournaments')
      .where({ id })
      .first();
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Get teams for this tournament
    const teams = await db('tournament_teams')
      .select('tournament_teams.seed_number', 'tournament_teams.is_active', 'teams.id', 'teams.name', 'teams.tag', 'teams.logo_url')
      .join('teams', 'tournament_teams.team_id', 'teams.id')
      .where({ 'tournament_teams.tournament_id': id });
    
    res.json({
      data: teams,
      meta: {
        count: teams.length,
        tournamentId: id
      }
    });
  } catch (error) {
    console.error(`Error getting teams for tournament ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error retrieving tournament teams',
      details: error.message
    });
  }
});

/**
 * @route POST /api/tournaments/:id/teams
 * @desc Add team to a tournament
 * @access Private
 */
router.post('/:id/teams', authenticateJWT, async (req, res) => {
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
    console.log(`Authenticated user ID: ${userId}, role: ${userRole}`);
    console.log(`Tournament organizer ID: ${tournament.organizer_id}`);
    
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
    console.log(`Assigning seed number ${seedNumber} to team ${teamId}`);
    
    // Add team to tournament
    try {
      const [addedTeam] = await db('tournament_teams')
        .insert({
          tournament_id: id,
          team_id: teamId,
          seed_number: seedNumber,
          is_active: true
        })
        .returning('*');
      
      console.log(`Successfully added team ${teamId} to tournament ${id}:`, addedTeam);
      
      // Get full team details
      const teamWithDetails = await db('tournament_teams')
        .select('tournament_teams.seed_number', 'tournament_teams.is_active', 'teams.id', 'teams.name', 'teams.tag', 'teams.logo_url')
        .join('teams', 'tournament_teams.team_id', 'teams.id')
        .where({ 
          'tournament_teams.tournament_id': id,
          'tournament_teams.team_id': teamId
        })
        .first();
      
      // Emit team added event via WebSocket
      if (req.io) {
        req.io.emitTournamentUpdate(id, {
          type: 'TEAM_ADDED',
          tournamentId: id,
          teamId: teamId,
          teamName: team.name,
          timestamp: new Date()
        });
      }
      
      // Clear tournament cache to ensure fresh data
      if (tournamentCache.data[id]) {
        delete tournamentCache.data[id];
        delete tournamentCache.timestamp[id];
        console.log(`Cleared cache for tournament ${id}`);
      }
      
      res.status(201).json({
        message: 'Team added to tournament successfully',
        data: teamWithDetails
      });
    } catch (dbError) {
      // Specific database error handling
      console.error('Database error adding team to tournament:', dbError);
      
      if (dbError.code === '23503') {
        return res.status(400).json({
          error: 'Foreign key constraint violation',
          details: 'The team or tournament ID does not exist in the database',
          code: dbError.code
        });
      }
      
      if (dbError.code === '23505') {
        return res.status(409).json({
          error: 'Unique constraint violation',
          details: 'This team is already in the tournament',
          code: dbError.code
        });
      }
      
      throw dbError; // Re-throw for general error handling
    }
  } catch (error) {
    console.error(`Error adding team to tournament ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error adding team to tournament',
      details: error.message
    });
  }
});

/**
 * @route DELETE /api/tournaments/:id/teams/:teamId
 * @desc Remove team from a tournament
 * @access Private
 */
router.delete('/:id/teams/:teamId', authenticateJWT, async (req, res) => {
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
    
    // Emit team removed event via WebSocket
    if (req.io) {
      req.io.emitTournamentUpdate(id, {
        type: 'TEAM_REMOVED',
        tournamentId: id,
        teamId: teamId,
        timestamp: new Date()
      });
    }
    
    // Clear tournament cache to ensure fresh data
    if (tournamentCache.data[id]) {
      delete tournamentCache.data[id];
      delete tournamentCache.timestamp[id];
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
});
router.get('/:id/matches', async (req, res) => {
  try {
    const { id } = req.params;
    const { platform = 'steam' } = req.query;
    
    // Check if tournament exists
    const tournament = await db('tournaments')
      .where({ id })
      .first();
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Get registered matches
    const registeredMatches = await db('custom_matches')
      .where({ tournament_id: id })
      .orderBy('match_number', 'asc');
    
    // Get full match data for each registered match
    const matchPromises = registeredMatches.map(async (match) => {
      try {
        const matchData = await pubgApiService.getMatch(match.match_id, platform);
        return {
          ...match,
          data: matchData.data,
          included: matchData.included
        };
      } catch (error) {
        console.error(`Error fetching match ${match.match_id}:`, error);
        return {
          ...match,
          error: 'Failed to fetch match data'
        };
      }
    });
    
    const matches = await Promise.all(matchPromises);
    
    res.json({
      data: matches,
      meta: {
        count: matches.length,
        tournamentId: id
      }
    });
  } catch (error) {
    console.error(`Error getting matches for tournament ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error retrieving tournament matches',
      details: error.message
    });
  }
});

/**
 * @route POST /api/tournaments/:id/matches
 * @desc Add matches to a tournament
 * @access Private
 */
router.post('/:id/matches', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { matchIds, stage = 'group' } = req.body;
    
    if (!matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
      return res.status(400).json({ error: 'Match IDs are required' });
    }
    
    // Get user ID from authenticated user
    const registeredBy = req.user.id;
    
    // Check if tournament exists
    const tournament = await db('tournaments')
      .where({ id })
      .first();
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Check if user is the organizer or an admin
    if (req.user.role !== 'admin' && tournament.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to add matches to this tournament' });
    }
    
    // Get next match number
    const lastMatch = await db('custom_matches')
      .where({ tournament_id: id })
      .orderBy('match_number', 'desc')
      .first();
    
    let nextMatchNumber = lastMatch ? lastMatch.match_number + 1 : 1;
    
    // Check which matches are already registered
    const existingMatches = await db('custom_matches')
      .whereIn('match_id', matchIds)
      .select('match_id');
    
    const existingMatchIds = existingMatches.map(m => m.match_id);
    const newMatchIds = matchIds.filter(id => !existingMatchIds.includes(id));
    
    // Insert new matches
    const insertPromises = newMatchIds.map(matchId => {
      return db('custom_matches')
        .insert({
          match_id: matchId,
          tournament_id: id,
          registered_by: registeredBy,
          match_number: nextMatchNumber++,
          stage: stage,
          verified: false,
          registered_at: new Date()
        });
    });
    
    await Promise.all(insertPromises);
    
    // Get all tournament matches after insert
    const tournamentMatches = await db('custom_matches')
      .where({ tournament_id: id })
      .orderBy('match_number', 'asc');
    
    // Emit tournament update via WebSocket
    if (req.io) {
      req.io.emitTournamentUpdate(id, {
        type: 'MATCHES_ADDED',
        tournamentId: id,
        matches: tournamentMatches,
        added: newMatchIds,
        timestamp: new Date()
      });
    }
    
    res.status(201).json({
      message: `${newMatchIds.length} matches added to tournament (${existingMatchIds.length} already existed)`,
      data: {
        matches: tournamentMatches,
        added: newMatchIds,
        alreadyExists: existingMatchIds
      }
    });
  } catch (error) {
    console.error(`Error adding matches to tournament ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error adding matches to tournament',
      details: error.message
    });
  }
});

/**
 * @route DELETE /api/tournaments/:id/matches/:matchId
 * @desc Remove a match from a tournament
 * @access Private
 */
router.delete('/:id/matches/:matchId', authenticateJWT, async (req, res) => {
  try {
    const { id, matchId } = req.params;
    
    // Check if user is the organizer or an admin
    const tournament = await db('tournaments')
      .where({ id })
      .first();
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    if (req.user.role !== 'admin' && tournament.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to remove matches from this tournament' });
    }
    
    // Check if match exists in this tournament
    const match = await db('custom_matches')
      .where({ 
        tournament_id: id,
        match_id: matchId
      })
      .first();
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found in this tournament' });
    }
    
    // Delete match
    await db('custom_matches')
      .where({ 
        tournament_id: id,
        match_id: matchId
      })
      .delete();
    
    res.json({
      message: 'Match removed from tournament successfully'
    });
  } catch (error) {
    console.error(`Error removing match ${req.params.matchId} from tournament ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error removing match from tournament',
      details: error.message
    });
  }
});

/**
 * @route POST /api/tournaments/:id/calculate-standings
 * @desc Calculate tournament standings
 * @access Private
 */
/**
 * @route GET /api/tournaments/:id/leaderboard
 * @desc Get tournament leaderboard
 * @access Public
 */
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if tournament exists
    const tournament = await db('tournaments')
      .where({ id })
      .first();
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Get latest standings
    const standings = await db('tournament_standings')
      .where({ tournament_id: id })
      .orderBy('calculated_at', 'desc')
      .first();
    
    if (!standings) {
      return res.json({
        data: [],
        meta: {
          tournamentId: id,
          tournamentName: tournament.name,
          lastCalculated: null
        }
      });
    }
    
    // Parse JSON standings
    const parsedStandings = JSON.parse(standings.standings);
    
    res.json({
      data: parsedStandings,
      meta: {
        tournamentId: id,
        tournamentName: tournament.name,
        lastCalculated: standings.calculated_at
      }
    });
  } catch (error) {
    console.error(`Error retrieving leaderboard for tournament ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error retrieving tournament leaderboard',
      details: error.message
    });
  }
});

/**
 * @route POST /api/tournaments/:id/calculate-standings
 * @desc Calculate tournament standings
 * @access Private
 */
router.post('/:id/calculate-standings', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { platform = 'steam' } = req.body;
    
    // Check if tournament exists
    const tournament = await db('tournaments')
      .where({ id })
      .first();
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Check if user is the organizer or an admin
    if (req.user.role !== 'admin' && tournament.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to calculate standings for this tournament' });
    }
    
    // Get registered matches
    const registeredMatches = await db('custom_matches')
      .where({ tournament_id: id })
      .orderBy('match_number', 'asc');
    
    if (registeredMatches.length === 0) {
      return res.status(400).json({ error: 'No matches found for this tournament' });
    }
    
    // Get teams for this tournament
    const tournamentTeams = await db('tournament_teams')
      .select('tournament_teams.*', 'teams.name as team_name', 'teams.tag as team_tag')
      .join('teams', 'tournament_teams.team_id', 'teams.id')
      .where({ 'tournament_teams.tournament_id': id });
    
    // Get match data for each registered match
    const matchPromises = registeredMatches.map(match => 
      pubgApiService.getMatch(match.match_id, platform)
    );
    
    const matchesData = await Promise.all(matchPromises);
    
    // Calculate standings based on tournament scoring system
    const standings = calculateTournamentStandings(tournament, matchesData, tournamentTeams);
    
    // Save standings to database
    await db('tournament_standings')
      .insert({
        tournament_id: id,
        standings: JSON.stringify(standings),
        calculated_at: new Date()
      });
    
    // Emit standings update via WebSocket
    if (req.io) {
      req.io.emitStandingsUpdate(id, {
        standings,
        tournamentId: id,
        tournamentName: tournament.name,
        updatedAt: new Date()
      });
    }
    
    res.json({
      message: 'Tournament standings calculated successfully',
      data: {
        standings,
        matchCount: matchesData.length
      }
    });
  } catch (error) {
    console.error(`Error calculating standings for tournament ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error calculating tournament standings',
      details: error.message
    });
  }
});

/**
 * Calculate tournament standings based on match data
 * @param {Object} tournament - Tournament data
 * @param {Array} matchesData - Array of match data
 * @param {Array} tournamentTeams - Array of team data
 * @returns {Array} Calculated standings
 */
function calculateTournamentStandings(tournament, matchesData, tournamentTeams) {
  // Initialize standings object
  const standings = {};
  
  // Scoring configuration
  const scoringSystem = tournament.scoring_system;
  let placementPoints;
  let killPoints;
  
  if (scoringSystem === 'super') {
    // PUBG SUPER scoring system
    placementPoints = [10, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
    killPoints = 1;
  } else if (scoringSystem === 'standard') {
    // Standard scoring
    placementPoints = [15, 12, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0];
    killPoints = 1;
  } else if (scoringSystem === 'custom' && tournament.custom_scoring_table) {
    // Custom scoring
    const customScoring = JSON.parse(tournament.custom_scoring_table);
    placementPoints = customScoring.placements || [10, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
    killPoints = customScoring.killPoints || 1;
  } else {
    // Default scoring
    placementPoints = [10, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
    killPoints = 1;
  }
  
  // Process each match
  matchesData.forEach((matchData, matchIndex) => {
    const match = matchData.data;
    const included = matchData.included;
    
    // Get all rosters (teams) in this match
    const rosters = included.filter(item => item.type === 'roster');
    
    // Process each roster
    rosters.forEach(roster => {
      // Get roster stats
      const rank = roster.attributes.stats.rank;
      const teamRank = rank; // 1-based rank
      
      // Get team players
      const participantIds = roster.relationships.participants.data.map(p => p.id);
      const participants = included.filter(item => 
        item.type === 'participant' && participantIds.includes(item.id)
      );
      
      // Get player IDs
      const playerAccountIds = participants.map(p => p.attributes.stats.playerId);
      
      // Try to identify team by matching players with tournament teams
      // In a real implementation, you'd query the database for player-team relationships
      // This is a simplified version
      const teamId = identifyTeamByPlayers(playerAccountIds, tournamentTeams);
      if (!teamId) {
        return; // Skip if team not identified
      }
      
      // Initialize team in standings if not exists
      if (!standings[teamId]) {
        const team = tournamentTeams.find(t => t.team_id === teamId);
        standings[teamId] = {
          teamId,
          teamName: team ? team.team_name : `Team ${teamId.substring(0, 6)}`,
          teamTag: team ? team.team_tag : null,
          totalPoints: 0,
          totalKills: 0,
          totalDamage: 0,
          matches: [],
          averagePlacement: 0,
          bestPlacement: 999,
          worstPlacement: 0
        };
      }
      
      // Calculate points for this match
      const placementPointsEarned = placementPoints[teamRank - 1] || 0;
      
      // Sum kills for this team
      const teamKills = participants.reduce((sum, participant) => {
        return sum + participant.attributes.stats.kills;
      }, 0);
      
      // Calculate kill points
      const killPointsEarned = teamKills * killPoints;
      
      // Sum damage for this team
      const teamDamage = participants.reduce((sum, participant) => {
        return sum + participant.attributes.stats.damageDealt;
      }, 0);
      
      // Total points for this match
      const matchPoints = placementPointsEarned + killPointsEarned;
      
      // Add match to team's matches
      standings[teamId].matches.push({
        matchId: match.id,
        matchNumber: registeredMatches[matchIndex].match_number,
        rank: teamRank,
        kills: teamKills,
        damage: teamDamage,
        placementPoints: placementPointsEarned,
        killPoints: killPointsEarned,
        totalPoints: matchPoints
      });
      
      // Update team totals
      standings[teamId].totalPoints += matchPoints;
      standings[teamId].totalKills += teamKills;
      standings[teamId].totalDamage += teamDamage;
      standings[teamId].bestPlacement = Math.min(standings[teamId].bestPlacement, teamRank);
      standings[teamId].worstPlacement = Math.max(standings[teamId].worstPlacement, teamRank);
    });
  });
  
  // Calculate averages and convert to array
  const standingsArray = Object.values(standings).map(team => {
    // Calculate average placement
    team.averagePlacement = team.matches.reduce((sum, match) => sum + match.rank, 0) / (team.matches.length || 1);
    
    // Average kills per match
    team.averageKills = team.totalKills / (team.matches.length || 1);
    
    // Average damage per match
    team.averageDamage = team.totalDamage / (team.matches.length || 1);
    
    // Sort matches by match number
    team.matches.sort((a, b) => a.matchNumber - b.matchNumber);
    
    return team;
  });
  
  // Sort standings by points
  standingsArray.sort((a, b) => {
    // Primary sort by points
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    
    // If points tie, check secondary criteria (total kills)
    if (b.totalKills !== a.totalKills) {
      return b.totalKills - a.totalKills;
    }
    
    // If still tied, use best placement
    return a.bestPlacement - b.bestPlacement;
  });
  
  // Add ranking
  standingsArray.forEach((team, index) => {
    team.rank = index + 1;
  });
  
  return standingsArray;
}

/**
 * Identify team by matching players with tournament teams
 * @param {Array} playerAccountIds - Array of player account IDs
 * @param {Array} tournamentTeams - Array of team data
 * @returns {string|null} Team ID or null if no match found
 */
function identifyTeamByPlayers(playerAccountIds, tournamentTeams) {
  // In a real implementation, you'd query the database for player-team relationships
  // This is a simplified placeholder version that would be replaced with actual DB queries
  
  // For now, since we don't have the team-player relationships,
  // return a random team ID for demonstration purposes
  if (tournamentTeams.length > 0) {
    return tournamentTeams[Math.floor(Math.random() * tournamentTeams.length)].team_id;
  }
  
  return null;
}

module.exports = router;
