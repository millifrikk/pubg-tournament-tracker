const express = require('express');
const router = express.Router();
const telemetryService = require('../services/telemetryService');

/**
 * @route GET /api/telemetry/:matchId
 * @desc Get processed telemetry data for a match
 * @access Public
 */
router.get('/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { platform = 'steam' } = req.query;
    
    const telemetryData = await telemetryService.processTelemetryForMatch(matchId, platform);
    
    res.json({
      data: telemetryData
    });
  } catch (error) {
    console.error(`Error processing telemetry for match ${req.params.matchId}:`, error);
    res.status(500).json({ 
      error: 'Error processing telemetry data',
      details: error.message
    });
  }
});

/**
 * @route GET /api/telemetry/:matchId/heatmap
 * @desc Get player position heatmap data for a match
 * @access Public
 */
router.get('/:matchId/heatmap', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { platform = 'steam', type = 'positions' } = req.query;
    
    // Process full telemetry
    const telemetryData = await telemetryService.processTelemetryForMatch(matchId, platform);
    
    // Extract heatmap data based on type
    let heatmapData;
    
    switch (type) {
      case 'kills':
        // Extract kill locations
        heatmapData = telemetryData.events.kills.map(kill => ({
          x: kill.victimLocation.x,
          y: kill.victimLocation.y,
          weight: 1,
          metadata: {
            killer: kill.killerName,
            victim: kill.victimName,
            weapon: kill.damageCauserName,
            time: kill.time
          }
        }));
        break;
        
      case 'deaths':
        // Extract player death locations
        heatmapData = Object.values(telemetryData.players)
          .filter(player => player.deathLocation)
          .map(player => ({
            x: player.deathLocation.x,
            y: player.deathLocation.y,
            weight: 1,
            metadata: {
              player: player.name,
              team: telemetryData.teams[player.teamId]?.players || []
            }
          }));
        break;
        
      case 'damage':
        // Extract damage locations
        heatmapData = telemetryData.events.damage.map(damage => ({
          x: damage.victim.location ? damage.victim.location.x : 0,
          y: damage.victim.location ? damage.victim.location.y : 0,
          weight: damage.damage / 100, // Normalize damage as weight
          metadata: {
            attacker: damage.attackerName,
            victim: damage.victimName,
            damage: damage.damage,
            weapon: damage.damageCauserName
          }
        }));
        break;
        
      case 'drops':
        // Extract hot drop areas
        heatmapData = telemetryData.summary.hotDropAreas.map(area => ({
          x: area.center.x,
          y: area.center.y,
          weight: area.playerCount / 5, // Normalize player count
          radius: 500, // Standard radius for hot drop visualization
          metadata: {
            playerCount: area.playerCount,
            teamCount: area.teamCount
          }
        }));
        break;
        
      case 'positions':
      default:
        // General player positions (subsampled)
        heatmapData = telemetryData.events.positions.map(pos => ({
          x: pos.location.x,
          y: pos.location.y,
          weight: 0.5,
          metadata: {
            player: pos.playerName,
            time: pos.time
          }
        }));
        break;
    }
    
    // Also include map info for proper scaling
    const mapInfo = {
      name: telemetryData.match.mapName,
      width: 816000, // Default map size in PUBG units
      height: 816000
    };
    
    // Adjust map size based on map name
    switch (telemetryData.match.mapName) {
      case 'Baltic_Main':
        mapInfo.width = 816000;
        mapInfo.height = 816000;
        break;
      case 'Desert_Main':
        mapInfo.width = 816000;
        mapInfo.height = 816000;
        break;
      case 'Savage_Main':
        mapInfo.width = 408000;
        mapInfo.height = 408000;
        break;
      case 'DihorOtok_Main':
        mapInfo.width = 612000;
        mapInfo.height = 612000;
        break;
      // Add more maps as needed
    }
    
    res.json({
      data: heatmapData,
      meta: {
        matchId,
        type,
        pointCount: heatmapData.length,
        map: mapInfo
      }
    });
  } catch (error) {
    console.error(`Error generating heatmap data for match ${req.params.matchId}:`, error);
    res.status(500).json({ 
      error: 'Error generating heatmap data',
      details: error.message
    });
  }
});

/**
 * @route GET /api/telemetry/:matchId/timeline
 * @desc Get match event timeline data
 * @access Public
 */
router.get('/:matchId/timeline', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { platform = 'steam' } = req.query;
    
    // Process full telemetry
    const telemetryData = await telemetryService.processTelemetryForMatch(matchId, platform);
    
    // Extract timeline-relevant events and combine into a single chronological sequence
    const timelineEvents = [
      // Kills
      ...telemetryData.events.kills.map(kill => ({
        type: 'kill',
        time: kill.time,
        data: kill
      })),
      
      // Knockdowns
      ...telemetryData.events.knockdowns.map(knock => ({
        type: 'knockdown',
        time: knock.time,
        data: knock
      })),
      
      // Circle phases
      ...telemetryData.events.phases.map(phase => ({
        type: 'circle',
        time: phase.time,
        data: phase
      })),
      
      // Care packages
      ...telemetryData.events.carePackages.map(pkg => ({
        type: 'carepackage',
        time: pkg.time,
        data: pkg
      }))
    ];
    
    // Sort by timestamp
    timelineEvents.sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // Add seconds from match start to each event for easier timeline visualization
    const matchStartTime = new Date(telemetryData.match.createdAt);
    timelineEvents.forEach(event => {
      event.secondsFromStart = (new Date(event.time) - matchStartTime) / 1000;
    });
    
    res.json({
      data: timelineEvents,
      meta: {
        matchId,
        matchDuration: telemetryData.match.duration,
        mapName: telemetryData.match.mapName,
        gameMode: telemetryData.match.gameMode
      }
    });
  } catch (error) {
    console.error(`Error generating timeline data for match ${req.params.matchId}:`, error);
    res.status(500).json({ 
      error: 'Error generating timeline data',
      details: error.message
    });
  }
});

/**
 * @route GET /api/telemetry/:matchId/player/:accountId
 * @desc Get detailed player stats and path from telemetry
 * @access Public
 */
router.get('/:matchId/player/:accountId', async (req, res) => {
  try {
    const { matchId, accountId } = req.params;
    const { platform = 'steam' } = req.query;
    
    // Process full telemetry
    const telemetryData = await telemetryService.processTelemetryForMatch(matchId, platform);
    
    // Get player data
    const playerData = telemetryData.players[accountId];
    if (!playerData) {
      return res.status(404).json({
        error: 'Player not found in this match'
      });
    }
    
    // Get team data
    const teamData = telemetryData.teams[playerData.teamId];
    
    // Extract player-specific events
    const playerEvents = {
      kills: telemetryData.events.kills.filter(kill => kill.killer === accountId),
      damage: telemetryData.events.damage.filter(damage => damage.attacker === accountId),
      damageTaken: telemetryData.events.damage.filter(damage => damage.victim === accountId)
    };
    
    // Prepare response
    const playerDetails = {
      player: playerData,
      team: teamData,
      events: playerEvents,
      meta: {
        matchId,
        matchDuration: telemetryData.match.duration,
        mapName: telemetryData.match.mapName
      }
    };
    
    res.json({
      data: playerDetails
    });
  } catch (error) {
    console.error(`Error retrieving player data for ${req.params.accountId} in match ${req.params.matchId}:`, error);
    res.status(500).json({ 
      error: 'Error retrieving player data',
      details: error.message
    });
  }
});

module.exports = router;
