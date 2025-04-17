const express = require('express');
const router = express.Router();
const { db } = require('../db/connection');
const pubgApiService = require('../services/pubgApiService');
const tournamentsController = require('../controllers/tournamentsController');
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

// Simple in-memory cache for tournament data
const tournamentCache = {
  data: {},
  timestamp: {},
  TTL: 30000 // 30 seconds TTL
};

/**
 * Tournament Routes
 */

// Get all tournaments
router.get('/', rateLimiterMiddleware, tournamentsController.getAllTournaments);

// Get tournament by ID
router.get('/:id', rateLimiterMiddleware, (req, res) => {
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
  tournamentsController.getTournamentById(req, res);
  
  // Note: caching of response is handled in the controller
});

// Create new tournament
router.post('/', authenticateJWT, tournamentsController.createTournament);

// Update tournament
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
    
    // Clear cache for this tournament
    if (tournamentCache.data[id]) {
      delete tournamentCache.data[id];
      delete tournamentCache.timestamp[id];
    }
    
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

// Delete tournament
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
    
    // Clear cache for this tournament
    if (tournamentCache.data[id]) {
      delete tournamentCache.data[id];
      delete tournamentCache.timestamp[id];
    }
    
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

// Get teams for a tournament
router.get('/:id/teams', rateLimiterMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
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
});

// NEW: Get teams with player counts for a tournament
router.get('/:id/teams/with-players', rateLimiterMiddleware, tournamentsController.getTournamentTeamsWithPlayers);

// Get players for a tournament
router.get('/:id/players', rateLimiterMiddleware, tournamentsController.getTournamentPlayers);

// Add team to tournament
router.post('/:id/teams', authenticateJWT, tournamentsController.addTeamToTournament);

// Remove team from tournament
router.delete('/:id/teams/:teamId', authenticateJWT, tournamentsController.removeTeamFromTournament);

/**
 * Match Management
 */

// Get matches for a tournament
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

// Add matches to tournament
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
    
    // Clear cache for this tournament
    if (tournamentCache.data[id]) {
      delete tournamentCache.data[id];
      delete tournamentCache.timestamp[id];
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

// Remove match from tournament
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
    
    // Clear cache for this tournament
    if (tournamentCache.data[id]) {
      delete tournamentCache.data[id];
      delete tournamentCache.timestamp[id];
    }
    
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
 * Search for custom matches by team players
 */
router.post('/:id/matches/search', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { platform = 'steam', timeRange = '24h' } = req.body;
    
    // Check if tournament exists
    const tournament = await db('tournaments')
      .where({ id })
      .first();
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Get players from all teams in this tournament
    const players = await db('players')
      .select('players.pubg_name')
      .join('teams', 'players.team_id', 'teams.id')
      .join('tournament_teams', 'teams.id', 'tournament_teams.team_id')
      .where('tournament_teams.tournament_id', id)
      .whereNotNull('players.pubg_name');
    
    if (players.length === 0) {
      return res.json({
        data: [],
        meta: {
          count: 0,
          message: 'No players found in tournament teams'
        }
      });
    }
    
    // Extract player names
    const playerNames = players.map(player => player.pubg_name);
    
    // Search for matches played by these players
    const matches = await pubgApiService.searchCustomMatchesByTeamPlayers({
      playerNames,
      platform,
      timeRange
    });
    
    res.json({
      data: matches,
      meta: {
        count: matches.length,
        playerCount: playerNames.length,
        tournamentId: id
      }
    });
  } catch (error) {
    console.error(`Error searching matches for tournament ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Error searching tournament matches',
      details: error.message
    });
  }
});

/**
 * @route POST /api/tournaments/:id/matches/:matchId/process
 * @desc Process match results and calculate points
 * @access Private
 */
router.post('/:id/matches/:matchId/process', authenticateJWT, async (req, res) => {
  try {
    const { id: tournamentId, matchId } = req.params;
    const { platform = 'steam' } = req.body;
    
    // Check if user is authorized to process match results
    const tournament = await db('tournaments')
      .where({ id: tournamentId })
      .first();
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    if (req.user.role !== 'admin' && tournament.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to process match results for this tournament' });
    }
    
    // Check if match exists in this tournament
    const match = await db('custom_matches')
      .where({ 
        tournament_id: tournamentId,
        match_id: matchId
      })
      .first();
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found in this tournament' });
    }
    
    // Get match data
    const matchData = await pubgApiService.getMatch(matchId, platform);
    
    // Get tournament teams
    const tournamentTeams = await db('tournament_teams')
      .select('tournament_teams.team_id', 'teams.name as team_name')
      .join('teams', 'tournament_teams.team_id', 'teams.id')
      .where({ tournament_id: tournamentId });
    
    // Get player-team mapping for all teams in the tournament
    const teamPlayers = await db('players')
      .select('players.pubg_id', 'players.team_id')
      .join('teams', 'players.team_id', 'teams.id')
      .join('tournament_teams', 'teams.id', 'tournament_teams.team_id')
      .where('tournament_teams.tournament_id', tournamentId);
    
    // Create player ID to team ID mapping
    const playerToTeam = {};
    teamPlayers.forEach(player => {
      playerToTeam[player.pubg_id] = player.team_id;
    });
    
    // Extract rosters (teams) from match data
    const included = matchData.included || [];
    const rosters = included.filter(item => item.type === 'roster');
    
    // Process each roster
    const results = [];
    
    // Scoring configuration
    const scoringSystem = tournament.scoring_system || 'super';
    let placementPoints;
    let killMultiplier;
    
    if (scoringSystem === 'super') {
      // PUBG SUPER scoring system
      placementPoints = [10, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
      killMultiplier = 1;
    } else if (scoringSystem === 'standard') {
      // Standard scoring
      placementPoints = [15, 12, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0];
      killMultiplier = 1;
    } else if (scoringSystem === 'custom' && tournament.custom_scoring_table) {
      // Custom scoring
      const customScoring = JSON.parse(tournament.custom_scoring_table);
      placementPoints = customScoring.placements || [10, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
      killMultiplier = customScoring.killPoints || 1;
    } else {
      // Default scoring
      placementPoints = [10, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
      killMultiplier = 1;
    }
    
    rosters.forEach(roster => {
      // Get roster stats
      const rank = roster.attributes.stats.rank;
      
      // Get team players
      const participantIds = roster.relationships.participants.data.map(p => p.id);
      const participants = included.filter(item => 
        item.type === 'participant' && participantIds.includes(item.id)
      );
      
      // Get player IDs
      const playerAccountIds = participants.map(p => p.attributes.stats.playerId);
      
      // Try to identify team by matching players with tournament teams
      const matchedTeamId = identifyTeamByPlayers(playerAccountIds, playerToTeam);
      if (!matchedTeamId) {
        return; // Skip if team not identified
      }
      
      // Calculate placement points
      const rankIndex = rank - 1;  // zero-based index
      const placementPointsEarned = rankIndex < placementPoints.length ? placementPoints[rankIndex] : 0;
      
      // Sum kills for this team
      const kills = participants.reduce((sum, participant) => {
        return sum + (participant.attributes.stats.kills || 0);
      }, 0);
      
      // Calculate kill points
      const killPointsEarned = kills * killMultiplier;
      
      // Total points for this match
      const totalPoints = placementPointsEarned + killPointsEarned;
      
      // Add to results
      results.push({
        team_id: matchedTeamId,
        placement: rank,
        kills,
        placement_points: placementPointsEarned,
        kill_points: killPointsEarned,
        total_points: totalPoints
      });
    });
    
    // Store match data
    await db('custom_matches')
      .where({ 
        match_id: matchId,
        tournament_id: tournamentId
      })
      .update({
        match_data: JSON.stringify(matchData),
        processed: true,
        processed_at: new Date()
      });
    
    // Store results in database
    for (const result of results) {
      await db('match_results').insert({
        tournament_id: tournamentId,
        match_id: matchId,
        team_id: result.team_id,
        placement: result.placement,
        kills: result.kills,
        placement_points: result.placement_points,
        kill_points: result.kill_points,
        total_points: result.total_points,
        processed_at: new Date()
      });
      
      // Update team points in tournament_teams
      await db('tournament_teams')
        .where({
          tournament_id: tournamentId,
          team_id: result.team_id
        })
        .increment('points', result.total_points);
    }
    
    // Emit socket event for real-time updates
    if (req.io) {
      req.io.emitTournamentUpdate(tournamentId, {
        type: 'MATCH_RESULTS_PROCESSED',
        tournamentId,
        matchId,
        timestamp: new Date()
      });
      
      req.io.emitStandingsUpdate(tournamentId, {
        tournamentId,
        updatedAt: new Date()
      });
    }
    
    // Clear cache for this tournament
    if (tournamentCache.data[tournamentId]) {
      delete tournamentCache.data[tournamentId];
      delete tournamentCache.timestamp[tournamentId];
    }
    
    res.json({
      message: 'Match results processed successfully',
      data: {
        match_id: matchId,
        tournament_id: tournamentId,
        results,
        teams_matched: results.length,
        teams_total: tournamentTeams.length
      }
    });
  } catch (error) {
    console.error(`Error processing match results for tournament ${req.params.id}, match ${req.params.matchId}:`, error);
    res.status(500).json({ 
      error: 'Error processing match results',
      details: error.message
    });
  }
});

/**
 * @route POST /api/tournaments/:id/matches/:matchId/extract-players
 * @desc Extract player details from a match and update database
 * @access Private
 */
router.post('/:id/matches/:matchId/extract-players', authenticateJWT, async (req, res) => {
  try {
    const { id: tournamentId, matchId } = req.params;
    const { platform = 'steam' } = req.body;
    
    // Check if user is authorized
    const tournament = await db('tournaments')
      .where({ id: tournamentId })
      .first();
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    if (req.user.role !== 'admin' && tournament.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to extract players for this tournament' });
    }
    
    // Get match data
    let matchData;
    const matchRecord = await db('custom_matches')
      .where({ 
        match_id: matchId,
        tournament_id: tournamentId
      })
      .first();
    
    if (!matchRecord) {
      return res.status(404).json({ error: 'Match not found in this tournament' });
    }
    
    // If match data is not stored yet, fetch it
    if (matchRecord.match_data) {
      try {
        matchData = JSON.parse(matchRecord.match_data);
      } catch (err) {
        console.error('Error parsing stored match data:', err);
        matchData = await pubgApiService.getMatch(matchId, platform);
      }
    } else {
      matchData = await pubgApiService.getMatch(matchId, platform);
      
      // Store match data
      await db('custom_matches')
        .where({ 
          match_id: matchId,
          tournament_id: tournamentId
        })
        .update({
          match_data: JSON.stringify(matchData)
        });
    }
    
    // Get tournament teams
    const tournamentTeams = await db('tournament_teams')
      .select('team_id')
      .where({ tournament_id: tournamentId });
    
    const teamIds = tournamentTeams.map(team => team.team_id);
    
    // Extract participant data from match
    const included = matchData.included || [];
    const participants = included.filter(item => item.type === 'participant');
    
    // Get existing players
    const existingPlayers = await db('players')
      .select('pubg_id')
      .whereIn('team_id', teamIds);
    
    const existingIds = new Set(existingPlayers.map(p => p.pubg_id));
    
    // Process each participant
    const newPlayers = [];
    const updatedPlayers = [];
    
    for (const participant of participants) {
      const stats = participant.attributes.stats;
      
      if (!stats || !stats.playerId) continue;
      
      const playerData = {
        pubg_id: stats.playerId,
        pubg_name: stats.name,
        platform: matchData.data.attributes.shardId || platform,
        stats: {
          kills: stats.kills,
          DBNOs: stats.DBNOs,
          damage: stats.damageDealt,
          headshots: stats.headshotKills,
          longestKill: stats.longestKill,
          rideDistance: stats.rideDistance,
          walkDistance: stats.walkDistance,
          swimDistance: stats.swimDistance
        }
      };
      
      if (existingIds.has(stats.playerId)) {
        // Update existing player stats
        await db('players')
          .where({ pubg_id: stats.playerId })
          .update({
            pubg_name: stats.name,
            stats: JSON.stringify({
              ...playerData.stats,
              lastUpdated: new Date()
            })
          });
        
        updatedPlayers.push(playerData);
      } else {
        // Add to new players list (will be returned but not automatically added to teams)
        newPlayers.push(playerData);
      }
    }
    
    res.json({
      message: 'Players extracted successfully',
      data: {
        new: newPlayers,
        updated: updatedPlayers
      }
    });
  } catch (error) {
    console.error(`Error extracting players for tournament ${req.params.id}, match ${req.params.matchId}:`, error);
    res.status(500).json({ 
      error: 'Error extracting players',
      details: error.message
    });
  }
});

/**
 * Get match results
 */
router.get('/:id/matches/:matchId/results', async (req, res) => {
  try {
    const { id: tournamentId, matchId } = req.params;
    
    // Check if tournament exists
    const tournament = await db('tournaments')
      .where({ id: tournamentId })
      .first();
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    // Get match results
    const results = await db('match_results')
      .where({ 
        tournament_id: tournamentId,
        match_id: matchId
      })
      .orderBy('placement', 'asc');
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'No results found for this match' });
    }
    
    // Get team names
    const teamIds = results.map(result => result.team_id);
    const teams = await db('teams')
      .whereIn('id', teamIds)
      .select('id', 'name', 'tag');
    
    const teamMap = {};
    teams.forEach(team => {
      teamMap[team.id] = team;
    });
    
    // Add team names to results
    const resultsWithTeams = results.map(result => ({
      ...result,
      team_name: teamMap[result.team_id]?.name || `Team ${result.team_id.substring(0, 8)}`,
      team_tag: teamMap[result.team_id]?.tag || null
    }));
    
    res.json({
      data: {
        match_id: matchId,
        tournament_id: tournamentId,
        results: resultsWithTeams
      }
    });
  } catch (error) {
    console.error(`Error retrieving match results for tournament ${req.params.id}, match ${req.params.matchId}:`, error);
    res.status(500).json({ 
      error: 'Error retrieving match results',
      details: error.message
    });
  }
});

/**
 * Tournament Leaderboard
 */

// Get tournament leaderboard
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

// Calculate tournament standings
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
    const standings = calculateTournamentStandings(tournament, matchesData, tournamentTeams, registeredMatches);
    
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
    
    // Clear cache for this tournament
    if (tournamentCache.data[id]) {
      delete tournamentCache.data[id];
      delete tournamentCache.timestamp[id];
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
 * @param {Array} registeredMatches - Array of registered matches from database
 * @returns {Array} Calculated standings
 */
function calculateTournamentStandings(tournament, matchesData, tournamentTeams, registeredMatches) {
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
      // In a real implementation, we'd query the database for player-team relationships
      // This is a simplified version - for a real implementation we should use the improved identifyTeamByPlayers method
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
      
      // Update team points in tournament_teams table
      // This will be moved to a separate function later
      db('tournament_teams')
        .where({
          tournament_id: tournament.id,
          team_id: teamId
        })
        .update({ points: db.raw('points + ?', [matchPoints]) })
        .catch(err => console.error(`Error updating points for team ${teamId}:`, err));
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
 * @param {Object} playerToTeam - Mapping of player IDs to team IDs
 * @returns {string|null} Team ID or null if no match found
 */
function identifyTeamByPlayers(playerAccountIds, playerToTeam) {
  // Count matches per team
  const teamMatches = {};
  
  playerAccountIds.forEach(playerId => {
    const teamId = playerToTeam[playerId];
    if (teamId) {
      teamMatches[teamId] = (teamMatches[teamId] || 0) + 1;
    }
  });
  
  // Find the team with the most matches
  let bestTeamId = null;
  let bestMatchCount = 0;
  
  Object.entries(teamMatches).forEach(([teamId, count]) => {
    if (count > bestMatchCount) {
      bestTeamId = teamId;
      bestMatchCount = count;
    }
  });
  
  // Require at least 2 players to match to consider it a valid team match
  return bestMatchCount >= 2 ? bestTeamId : null;
}

module.exports = router;
