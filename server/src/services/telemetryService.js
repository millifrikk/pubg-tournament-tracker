const pubgApiService = require('./pubgApiService');

/**
 * Telemetry Service for advanced processing of PUBG match telemetry data
 */
class TelemetryService {
  /**
   * Fetch and process telemetry data for a match
   * @param {string} matchId - PUBG match ID
   * @param {string} platform - Platform (e.g., steam, psn, xbox)
   * @returns {Promise<Object>} Processed telemetry data
   */
  async processTelemetryForMatch(matchId, platform = 'steam') {
    try {
      // Get match data
      const matchData = await pubgApiService.getMatch(matchId, platform);
      
      // Extract telemetry URL
      const telemetryUrl = pubgApiService.extractTelemetryUrl(matchData);
      if (!telemetryUrl) {
        throw new Error('Telemetry URL not found in match data');
      }
      
      // Get raw telemetry data
      const telemetryData = await pubgApiService.getTelemetry(telemetryUrl);
      
      // Process telemetry data
      const processedData = this.processTelemetryData(telemetryData, matchData);
      
      return processedData;
    } catch (error) {
      console.error(`Error processing telemetry for match ${matchId}:`, error);
      throw error;
    }
  }
  
  /**
   * Process raw telemetry data into a more usable format
   * @param {Array} telemetryData - Raw telemetry events
   * @param {Object} matchData - Match data from PUBG API
   * @returns {Object} Processed telemetry data
   */
  processTelemetryData(telemetryData, matchData) {
    // Initialize result structure
    const result = {
      match: {
        id: matchData.data.id,
        mapName: matchData.data.attributes.mapName,
        gameMode: matchData.data.attributes.gameMode,
        createdAt: matchData.data.attributes.createdAt,
        duration: 0, // Will be calculated
        shardId: matchData.data.attributes.shardId
      },
      players: {},
      teams: {},
      events: {
        kills: [],
        knockdowns: [],
        deaths: [],
        damage: [],
        heals: [],
        phases: [],
        carePackages: [],
        positions: [],
        matches: []
      },
      summary: {
        totalKills: 0,
        totalDamage: 0,
        totalHeals: 0,
        totalRevives: 0,
        hotDropAreas: [],
        finalCircleLocation: null
      }
    };
    
    // Extract essential data for tracking
    const playerRoster = {};  // Maps player account ID to roster/team
    const playerNames = {};   // Maps player account ID to in-game name
    const playerRank = {};    // Maps player account ID to final placement
    
    // First, build the roster/player mappings from match data
    if (matchData.included) {
      // Process roster (team) information
      const rosters = matchData.included.filter(item => item.type === 'roster');
      for (const roster of rosters) {
        const teamId = roster.id;
        const rank = roster.attributes.stats.rank;
        const playerIds = roster.relationships.participants.data.map(p => p.id);
        
        // Create team entry
        result.teams[teamId] = {
          id: teamId,
          rank,
          playerIds: [],
          players: [],
          kills: 0,
          damage: 0,
        };
        
        // Map participants to this roster
        for (const participantId of playerIds) {
          playerRoster[participantId] = teamId;
        }
      }
      
      // Process participant (player) information
      const participants = matchData.included.filter(item => item.type === 'participant');
      for (const participant of participants) {
        const participantId = participant.id;
        const accountId = participant.attributes.stats.playerId;
        const playerName = participant.attributes.stats.name;
        
        playerNames[accountId] = playerName;
        playerRank[accountId] = participants.attributes?.stats?.winPlace || 0;
        
        // Also add player info to the result
        result.players[accountId] = {
          name: playerName,
          accountId,
          teamId: playerRoster[participantId],
          kills: 0,
          damage: 0,
          heals: 0,
          revives: 0,
          distanceTraveled: 0,
          survivalTime: 0,
          deathLocation: null,
          path: []
        };
        
        // Add player to their team
        if (playerRoster[participantId]) {
          const teamId = playerRoster[participantId];
          result.teams[teamId].playerIds.push(accountId);
          result.teams[teamId].players.push(playerName);
        }
      }
    }
    
    // Process telemetry events chronologically
    // First sort events by timestamp
    const sortedEvents = [...telemetryData].sort((a, b) => {
      return new Date(a._D) - new Date(b._D);
    });
    
    // Track match start and end times
    let matchStartTime = null;
    let matchEndTime = null;
    
    // Process each event
    for (const event of sortedEvents) {
      const eventType = event._T;
      const timestamp = new Date(event._D);
      
      // Track match start time from the first LogMatchStart event
      if (eventType === 'LogMatchStart') {
        matchStartTime = timestamp;
      }
      
      // Track match end time from LogMatchEnd
      if (eventType === 'LogMatchEnd') {
        matchEndTime = timestamp;
        
        // Calculate match duration
        if (matchStartTime) {
          result.match.duration = (matchEndTime - matchStartTime) / 1000; // in seconds
        }
      }
      
      // Process player positions for heatmap data (subsample for efficiency)
      if (eventType === 'LogPlayerPosition' && event.character && event.character.accountId) {
        const accountId = event.character.accountId;
        const location = event.character.location;
        
        // Store position data (subsampled - not every position update)
        if (result.players[accountId] && Math.random() < 0.1) { // Sample 10% of positions
          result.players[accountId].path.push({
            x: location.x,
            y: location.y,
            z: location.z,
            time: timestamp
          });
          
          result.events.positions.push({
            time: timestamp,
            accountId,
            playerName: playerNames[accountId],
            teamId: result.players[accountId].teamId,
            location: location
          });
        }
      }
      
      // Process kill events
      if (eventType === 'LogPlayerKill') {
        const killer = event.killer ? event.killer.accountId : null;
        const victim = event.victim ? event.victim.accountId : null;
        const killerName = killer ? playerNames[killer] : 'None';
        const victimName = victim ? playerNames[victim] : 'Unknown';
        const killerLocation = event.killer ? event.killer.location : null;
        const victimLocation = event.victim ? event.victim.location : null;
        const damageTypeCategory = event.damageTypeCategory;
        const damageCauserName = event.damageCauserName;
        
        // Record kill event
        result.events.kills.push({
          time: timestamp,
          killer,
          killerName,
          victim,
          victimName,
          killerLocation,
          victimLocation,
          damageTypeCategory,
          damageCauserName
        });
        
        // Update player death location
        if (victim && result.players[victim]) {
          result.players[victim].deathLocation = victimLocation;
        }
        
        // Update player and team kill counts
        if (killer && result.players[killer]) {
          result.players[killer].kills += 1;
          const teamId = result.players[killer].teamId;
          if (teamId && result.teams[teamId]) {
            result.teams[teamId].kills += 1;
          }
        }
        
        // Update summary
        result.summary.totalKills += 1;
      }
      
      // Process damage events
      if (eventType === 'LogPlayerTakeDamage') {
        const attacker = event.attacker ? event.attacker.accountId : null;
        const victim = event.victim ? event.victim.accountId : null;
        const damage = event.damage;
        const damageTypeCategory = event.damageTypeCategory;
        const damageCauserName = event.damageCauserName;
        
        // Only record player vs player damage
        if (attacker && victim && attacker !== victim) {
          // Record damage event
          result.events.damage.push({
            time: timestamp,
            attacker,
            attackerName: playerNames[attacker],
            victim,
            victimName: playerNames[victim],
            damage,
            damageTypeCategory,
            damageCauserName
          });
          
          // Update player and team damage counts
          if (result.players[attacker]) {
            result.players[attacker].damage += damage;
            const teamId = result.players[attacker].teamId;
            if (teamId && result.teams[teamId]) {
              result.teams[teamId].damage += damage;
            }
          }
          
          // Update summary
          result.summary.totalDamage += damage;
        }
      }
      
      // Process healing events
      if (eventType === 'LogHeal') {
        const character = event.character ? event.character.accountId : null;
        const healAmount = event.healAmount || 0;
        const item = event.item;
        
        if (character && result.players[character]) {
          // Record heal event
          result.events.heals.push({
            time: timestamp,
            accountId: character,
            playerName: playerNames[character],
            healAmount,
            item
          });
          
          // Update player heal amount
          result.players[character].heals += healAmount;
          
          // Update summary
          result.summary.totalHeals += healAmount;
        }
      }
      
      // Process knockdown events
      if (eventType === 'LogPlayerMakeGroggy') {
        const attacker = event.attacker ? event.attacker.accountId : null;
        const victim = event.victim ? event.victim.accountId : null;
        const damageTypeCategory = event.damageTypeCategory;
        const damageCauserName = event.damageCauserName;
        
        // Record knockdown
        result.events.knockdowns.push({
          time: timestamp,
          attacker,
          attackerName: attacker ? playerNames[attacker] : 'None',
          victim,
          victimName: victim ? playerNames[victim] : 'Unknown',
          damageTypeCategory,
          damageCauserName
        });
      }
      
      // Process revive events
      if (eventType === 'LogPlayerRevive') {
        const rescuer = event.rescuer ? event.rescuer.accountId : null;
        const victim = event.victim ? event.victim.accountId : null;
        
        if (rescuer && victim && result.players[rescuer]) {
          result.players[rescuer].revives += 1;
          result.summary.totalRevives += 1;
        }
      }
      
      // Process game state/circle updates
      if (eventType === 'LogGameStatePeriodic') {
        const gameState = event.gameState;
        if (gameState && gameState.poisonGasWarningPosition) {
          const circlePosition = gameState.poisonGasWarningPosition;
          const circleRadius = gameState.poisonGasWarningRadius;
          
          result.events.phases.push({
            time: timestamp,
            phase: event.phase || 0,
            position: circlePosition,
            radius: circleRadius,
            elapsedTime: gameState.elapsedTime,
            numAlivePlayers: gameState.numAlivePlayers,
            numAliveTeams: gameState.numAliveTeams
          });
          
          // Track final circle location
          if (circleRadius < 200 && !result.summary.finalCircleLocation) {
            result.summary.finalCircleLocation = circlePosition;
          }
        }
      }
      
      // Process care package spawns
      if (eventType === 'LogCarePackageSpawn') {
        const itemPackage = event.itemPackage;
        if (itemPackage && itemPackage.location) {
          result.events.carePackages.push({
            time: timestamp,
            location: itemPackage.location,
            items: itemPackage.items
          });
        }
      }
    }
    
    // Post-process data
    
    // Analyze hot drop areas
    const earlyPositions = result.events.positions
      .filter(pos => matchStartTime && (new Date(pos.time) - matchStartTime) < 120000); // First 2 minutes
    
    // Cluster positions to find hot drop areas (simplified)
    if (earlyPositions.length > 0) {
      const clusters = this.clusterDropLocations(earlyPositions);
      result.summary.hotDropAreas = clusters;
    }
    
    return result;
  }
  
  /**
   * Simple implementation of clustering drop locations to find hot drop areas
   * @param {Array} positions - Array of player positions
   * @returns {Array} Clustered hot drop areas
   */
  clusterDropLocations(positions) {
    // This is a simplified version of location clustering
    // In a real implementation, you'd use a proper clustering algorithm like K-means or DBSCAN
    
    const clusters = [];
    const clusterRadius = 500; // 500 game units
    
    // Sort positions by time (oldest first) to prioritize early drops
    const sortedPositions = [...positions].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    for (const position of sortedPositions) {
      const loc = position.location;
      let foundCluster = false;
      
      // See if this position belongs to an existing cluster
      for (const cluster of clusters) {
        const distance = Math.sqrt(
          Math.pow(loc.x - cluster.center.x, 2) +
          Math.pow(loc.y - cluster.center.y, 2)
        );
        
        if (distance < clusterRadius) {
          // Add to existing cluster
          cluster.count += 1;
          cluster.playerIds.add(position.accountId);
          cluster.teamIds.add(position.teamId);
          
          // Update cluster center (weighted average)
          const weight = 1 / cluster.count;
          cluster.center.x = cluster.center.x * (1 - weight) + loc.x * weight;
          cluster.center.y = cluster.center.y * (1 - weight) + loc.y * weight;
          
          foundCluster = true;
          break;
        }
      }
      
      // Create a new cluster if didn't fit into any existing ones
      if (!foundCluster) {
        clusters.push({
          center: { x: loc.x, y: loc.y, z: loc.z },
          count: 1,
          playerIds: new Set([position.accountId]),
          teamIds: new Set([position.teamId])
        });
      }
    }
    
    // Convert sets to arrays for JSON serialization and add team count
    return clusters
      .map(cluster => ({
        center: cluster.center,
        playerCount: cluster.playerIds.size,
        teamCount: cluster.teamIds.size
      }))
      .filter(cluster => cluster.playerCount >= 3) // Minimum player threshold
      .sort((a, b) => b.playerCount - a.playerCount) // Sort by popularity
      .slice(0, 5); // Top 5 hot drops
  }
}

// Export singleton instance
module.exports = new TelemetryService();
