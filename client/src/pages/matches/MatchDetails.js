import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import matchesService from '../../services/matchesService';
import LiveMatchFeed from '../../components/common/LiveMatchFeed';
import MatchHeatmap from '../../components/visualizations/MatchHeatmap';
import MatchTimeline from '../../components/visualizations/MatchTimeline';
import PlayerPerformance from '../../components/visualizations/PlayerPerformance';
import { getMatchType, getMatchTypeDescription, formatMatchDate, formatMatchDuration, getRelativeTime } from '../../utils/matchUtils';
// Import optimized styles instead of regular ones
import '../../styles/matchDetails-optimized.css';

const MatchDetails = () => {
  const { id: matchId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const { joinMatch, leaveMatch } = useSocket();
  const [refreshing, setRefreshing] = useState(false);
  
  // Parse query parameters
  const queryParams = new URLSearchParams(location.search);
  const heatmapType = queryParams.get('heatmapType') || 'positions';
  
  // Debounce function to prevent multiple rapid execution of the same function
  const useDebounce = (fn, delay) => {
    const timerRef = React.useRef(null);
    
    return React.useCallback((...args) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        fn(...args);
        timerRef.current = null;
      }, delay);
    }, [fn, delay]);
  };
  
  // Fetch data function - wrapped in useCallback to prevent recreation on each render
  const fetchMatchDataInternal = useCallback(async (bypassCache = false) => {
    try {
      if (bypassCache) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Use the matchesService to get match data
      const matchData = await matchesService.getMatchDetails(matchId, 'steam', bypassCache);
      console.log('Match data fetched:', matchData);
      
      // Set match data state
      setMatch(matchData);
      setError(null);
      
      // Auto-select first player if none selected - using a safe approach
      if (matchData.included) {
        const participants = matchData.included.filter(item => 
          item.type === 'participant' && 
          item.attributes?.stats?.playerId
        );
        
        if (participants.length > 0 && !selectedPlayer) {
          const firstPlayerId = participants[0].attributes?.stats?.playerId || null;
          if (firstPlayerId) {
            // Use setTimeout to avoid potential state update loops
            setTimeout(() => {
              setSelectedPlayer(firstPlayerId);
            }, 0);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching match data:', err);
      setError(err.message || 'Failed to load match data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [matchId, selectedPlayer]); // Include selectedPlayer but handle carefully inside
  
  // Create a debounced version of the fetch function to prevent rapid API calls
  const fetchMatchData = useDebounce(fetchMatchDataInternal, 300);
  
  // Use a reference to track if this is the first render
  const isFirstRender = React.useRef(true);
  
  // Load active tab from URL params on mount or when location changes
  useEffect(() => {
    const tabParam = queryParams.get('tab');
    if (tabParam && ['overview', 'heatmap', 'timeline', 'players', 'live'].includes(tabParam)) {
      // Only update if it's different to avoid render loops
      if (tabParam !== activeTab) {
        setActiveTab(tabParam);
      }
    }
  }, [location.search]); // Only depend on location.search, not activeTab
  
  // Initialize data on component mount - minimizing dependencies
  useEffect(() => {
    console.log(`MatchDetails component mounting for matchId: ${matchId}`);
    
    // Join match room for real-time updates - only if socket is available
    if (joinMatch) {
      // Slight delay to ensure socket is ready
      setTimeout(() => {
        joinMatch(matchId);
      }, 100);
    }
    
    // Fetch match data only once on mount
    fetchMatchData(false);
    
    // Clean up when unmounting
    return () => {
      console.log(`MatchDetails component unmounting for matchId: ${matchId}`);
      if (leaveMatch) {
        leaveMatch(matchId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]); // Only depend on matchId, other dependencies handled manually
  
  // Handle refresh button click - memoize to avoid recreating on every render
  const handleRefresh = useCallback(() => {
    console.log('Manually refreshing match data');
    fetchMatchData(true); // bypass cache
  }, [fetchMatchData]);
  
  // Handle tab change - memoize to avoid recreating on every render
  const handleTabChange = useCallback((tab) => {
    if (tab === activeTab) return; // Don't update if it's the same tab
    
    console.log(`Changing tab to: ${tab}`);
    setActiveTab(tab);
    
    // Update URL without full refresh - use replace to prevent adding to history
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [activeTab, location.pathname, location.search, navigate]);
  
  // Handle heatmap type change - memoize to avoid recreating on every render
  const handleHeatmapTypeChange = useCallback((type) => {
    // Skip if it's the same type
    if (type === heatmapType) return;
    
    console.log(`Changing heatmap type to: ${type}`);
    const params = new URLSearchParams(location.search);
    params.set('heatmapType', type);
    params.set('tab', 'heatmap');
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  }, [heatmapType, location.pathname, location.search, navigate]);
  
  if (loading) {
    return (
      <div className="match-details-page">
        <div className="container">
          <h1 className="page-title">Match Details</h1>
          <div className="loading-container">Loading match data...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="match-details-page">
        <div className="container">
          <h1 className="page-title">Match Details</h1>
          <div className="error-container">
            <h2>Error Loading Match</h2>
            <p>{error}</p>
            <button onClick={() => navigate(-1)}>Go Back</button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!match) {
    return (
      <div className="match-details-page">
        <div className="container">
          <h1 className="page-title">Match Details</h1>
          <div className="error-container">Match not found</div>
        </div>
      </div>
    );
  }
  
  // Extract match details - with proper null checks
  const matchData = match.data || {};
  const matchAttributes = matchData.attributes || {};
  const mapName = matchAttributes.mapName || 'Unknown Map';
  const gameMode = matchAttributes.gameMode || 'Unknown Mode';
  const createdAt = matchAttributes.createdAt || null;
  const formattedCreatedAt = createdAt ? formatMatchDate(createdAt) : 'Unknown Date';
  const relativeTime = createdAt ? getRelativeTime(createdAt) : 'Unknown Date';
  const matchDuration = matchAttributes.duration || 0;
  
  // Extract participants and teams
  const participants = match.included?.filter(item => item.type === 'participant') || [];
  const rosters = match.included?.filter(item => item.type === 'roster') || [];
  
  // Get match type
  const matchType = getMatchType(match);
  const matchTypeLabel = getMatchTypeDescription(matchType);
  
  return (
    <div className="match-details-page">
      <div className="container">
        <div className="match-header">
          <div className="header-content">
            <h1 className="page-title">Match Details</h1>
            <button 
              className="refresh-button" 
              onClick={handleRefresh} 
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="match-meta">
            <div className="match-id">ID: {matchId}</div>
            <div className={`match-type-badge ${matchType?.toLowerCase() || 'unknown'}`}>
              {matchTypeLabel}
            </div>
            <div className="match-info">
              <span className="match-map"><strong>Map:</strong> {mapName}</span>
              <span className="match-mode"><strong>Mode:</strong> {gameMode}</span>
              <span className="match-time" title={formattedCreatedAt}><strong>Played:</strong> {relativeTime}</span>
              <span className="match-duration"><strong>Duration:</strong> {formatMatchDuration(matchDuration)}</span>
            </div>
          </div>
        </div>
        
        {/* Tabs for different views */}
        <div className="match-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
            onClick={() => handleTabChange('heatmap')}
          >
            Heatmap
          </button>
          <button 
            className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => handleTabChange('timeline')}
          >
            Timeline
          </button>
          <button 
            className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`}
            onClick={() => handleTabChange('players')}
          >
            Player Stats
          </button>
          <button 
            className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`}
            onClick={() => handleTabChange('live')}
          >
            Live Feed
          </button>
        </div>
        
        {/* Tab content */}
        <div className="tab-content">
          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="match-overview">
                <div className="teams-overview">
                  <h2>Teams & Placement</h2>
                  <div className="teams-grid">
                    {rosters
                      .filter(roster => roster?.attributes?.stats?.rank) // Filter out any invalid rosters
                      .sort((a, b) => (a.attributes?.stats?.rank || 999) - (b.attributes?.stats?.rank || 999))
                      .map(roster => {
                        const teamRank = roster.attributes?.stats?.rank || 999;
                        const teamId = roster.id;
                        const won = roster.attributes?.won === 'true';
                        const playerIds = roster.relationships?.participants?.data?.map(p => p.id) || [];
                        const teamPlayers = participants.filter(p => playerIds.includes(p.id));
                        
                        return (
                          <div key={teamId} className={`team-card rank-${teamRank} ${won ? 'winner' : ''}`}>
                            <div className="team-header">
                              <div className="team-rank">#{teamRank}{won && ' 🏆'}</div>
                              <div className="team-stats">
                                <div className="team-kills">
                                  {teamPlayers.reduce((sum, p) => sum + (p.attributes?.stats?.kills || 0), 0)} kills
                                </div>
                                <div className="team-damage">
                                  {Math.round(teamPlayers.reduce((sum, p) => sum + (p.attributes?.stats?.damageDealt || 0), 0))} damage
                                </div>
                              </div>
                            </div>
                            <div className="team-players">
                              {teamPlayers.map(player => (
                                <div key={player.id} className="player-row">
                                  <div className="player-name">
                                    {player.attributes?.stats?.name || 'Unknown Player'}
                                    {player.attributes?.stats?.deathType === 'alive' && ' 🔄'}
                                  </div>
                                  <div className="player-stats">
                                    <span className="kills" title="Kills">{player.attributes?.stats?.kills || 0}</span>
                                    <span className="assists" title="Assists">{player.attributes?.stats?.assists || 0}</span>
                                    <span className="damage" title="Damage">{Math.round(player.attributes?.stats?.damageDealt || 0)}</span>
                                    {player.attributes?.stats?.headshotKills > 0 && 
                                      <span className="headshots" title="Headshot Kills">🎯 {player.attributes?.stats?.headshotKills}</span>
                                    }
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
                
                <div className="match-stats-summary">
                  <h2>Match Summary</h2>
                  <div className="summary-stats">
                    <div className="summary-stat">
                      <div className="stat-label">Total Players</div>
                      <div className="stat-value">{participants.length || 0}</div>
                    </div>
                    <div className="summary-stat">
                      <div className="stat-label">Total Teams</div>
                      <div className="stat-value">{rosters.length || 0}</div>
                    </div>
                    <div className="summary-stat">
                      <div className="stat-label">Total Kills</div>
                      <div className="stat-value">
                        {participants.reduce((sum, p) => sum + (p.attributes?.stats?.kills || 0), 0)}
                      </div>
                    </div>
                    <div className="summary-stat">
                      <div className="stat-label">Avg. Kills/Player</div>
                      <div className="stat-value">
                        {participants.length > 0 ? (participants.reduce((sum, p) => sum + (p.attributes?.stats?.kills || 0), 0) / participants.length).toFixed(1) : '0.0'}
                      </div>
                    </div>
                    <div className="summary-stat">
                      <div className="stat-label">Longest Kill</div>
                      <div className="stat-value">
                        {Math.max(...participants.map(p => p.attributes?.stats?.longestKill || 0)).toFixed(1)}m
                      </div>
                    </div>
                    <div className="summary-stat">
                      <div className="stat-label">Headshot Kills</div>
                      <div className="stat-value">
                        {participants.reduce((sum, p) => sum + (p.attributes?.stats?.headshotKills || 0), 0)}
                      </div>
                    </div>
                  </div>
                  <div className="data-source-info">
                    <p>
                      {refreshing ? 'Refreshing data...' : 
                       'Data may be cached to avoid rate limits. Click "Refresh" for the latest data.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Heatmap tab */}
          {activeTab === 'heatmap' && (
            <div className="heatmap-tab">
              <div className="heatmap-controls">
                <label>Heatmap Type:</label>
                <select
                  value={heatmapType}
                  onChange={(e) => handleHeatmapTypeChange(e.target.value)}
                >
                  <option value="positions">Player Positions</option>
                  <option value="kills">Kill Locations</option>
                  <option value="deaths">Death Locations</option>
                  <option value="damage">Damage Locations</option>
                  <option value="drops">Hot Drop Areas</option>
                </select>
              </div>
              <MatchHeatmap matchId={matchId} type={heatmapType} />
            </div>
          )}
          
          {/* Timeline tab */}
          {activeTab === 'timeline' && (
            <div className="timeline-tab">
              <MatchTimeline matchId={matchId} />
            </div>
          )}
          
          {/* Player Stats tab */}
          {activeTab === 'players' && (
            <div className="players-tab">
              <div className="player-selector">
                <label htmlFor="player-select">Select Player:</label>
                <select
                  id="player-select"
                  value={selectedPlayer || ''}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                >
                  <option value="">Select a player</option>
                  {participants
                    .filter(player => player.attributes?.stats?.name) // Only show players with valid names
                    .sort((a, b) => (a.attributes?.stats?.name || '').localeCompare(b.attributes?.stats?.name || ''))
                    .map(player => (
                      <option key={player.id} value={player.attributes?.stats?.playerId || ''}>
                        {player.attributes?.stats?.name || 'Unknown Player'} 
                        ({player.attributes?.stats?.kills || 0} kills)
                      </option>
                    ))
                  }
                </select>
              </div>
              
              {selectedPlayer ? (
                <PlayerPerformance matchId={matchId} accountId={selectedPlayer} />
              ) : (
                <div className="no-player-selected">
                  Please select a player to view detailed statistics
                </div>
              )}
            </div>
          )}
          
          {/* Live Feed tab */}
          {activeTab === 'live' && (
            <div className="live-tab">
              <LiveMatchFeed matchId={matchId} initialMatchData={match} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchDetails;