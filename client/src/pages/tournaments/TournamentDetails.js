import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import tournamentService from '../../services/tournamentService';
import { useSocket } from '../../contexts/SocketContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TournamentLeaderboard from '../../components/tournaments/TournamentLeaderboard';
import Modal from '../../components/common/Modal';
import AddTeamToTournament from '../../components/common/AddTeamToTournament';

const TournamentDetails = () => {
  const { id: tournamentId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [calculatingStandings, setCalculatingStandings] = useState(false);
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const { joinMatch, leaveMatch, subscribeToEvent, emitEvent } = useSocket();
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  
  // Create wrapper functions for joinMatch and leaveMatch using useCallback to prevent rerenders
  const joinTournament = useCallback((tournamentId) => {
    console.log('Joining tournament room:', tournamentId);
    if (joinMatch) {
      joinMatch(`tournament:${tournamentId}`);
    }
  }, [joinMatch]);
  
  const leaveTournament = useCallback((tournamentId) => {
    console.log('Leaving tournament room:', tournamentId);
    if (leaveMatch) {
      leaveMatch(`tournament:${tournamentId}`);
    }
  }, [leaveMatch]);
  
  // Create wrapper for subscribeTournamentUpdates
  const subscribeTournamentUpdates = useCallback((callback) => {
    console.log('Setting up tournament updates subscription');
    return subscribeToEvent('tournament-update', callback);
  }, [subscribeToEvent]);
  
  // Use ref to track if we've already fetched the data to prevent duplicate requests
  const dataFetchedRef = useRef(false);
  
  // Use a ref to track if we're already fetching data to prevent duplicate requests
  const fetchingRef = useRef(false);
  
  // Use a debounced fetch function to prevent rapid consecutive calls
  const fetchTournamentData = useCallback(async () => {
    // Return early if already fetching or lacking a tournament ID
    if (fetchingRef.current || !tournamentId) {
      console.log('Skipping redundant fetch, already in progress or missing ID');
      return;
    }
    
    try {
      // Mark that we're fetching to prevent duplicate requests
      fetchingRef.current = true;
      setLoading(true);
      
      console.log(`Fetching tournament data for ID: ${tournamentId}`);
      const response = await tournamentService.getTournamentById(tournamentId);
      // Log the entire response for debugging
      console.log(`Raw response:`, response);
      
      // Check for different response structures and handle accordingly
      let tournamentData = null;
      
      // Case 1: Standard format - response.data.data
      if (response?.data?.data) {
        tournamentData = response.data.data;
      }
      // Case 2: Simplified format - response.data
      else if (response?.data && !response.data.data) {
        tournamentData = response.data;
      }
      // Case 3: Direct data format
      else if (response && !response.data) {
        tournamentData = response;
      }
      
      if (tournamentData) {
        console.log('Tournament data successfully loaded:', tournamentData.name || 'unnamed');
        setTournament(tournamentData);
        setError(null);
      } else {
        console.error('Could not extract tournament data from response. Format not recognized:', response);
        setError('Failed to load tournament data - response format not recognized');
      }
    } catch (err) {
      console.error('Error fetching tournament data:', err);
      setError('Failed to load tournament data');
      
      // If we get a 429 error, don't try again immediately
      if (err.response && err.response.status === 429) {
        console.warn('Rate limit exceeded. Waiting before retrying...');
      }
    } finally {
      setLoading(false);
      // Reset fetching flag after a small delay to prevent immediate re-fetch
      setTimeout(() => {
        fetchingRef.current = false;
      }, 500);
    }
  }, [tournamentId]);
  
  useEffect(() => {
    // Fetch tournament data once when component mounts
    if (!dataFetchedRef.current) {
      dataFetchedRef.current = true;
      fetchTournamentData();
    }
    
    // Join tournament room for real-time updates
    joinTournament(tournamentId);
    
    // Subscribe to tournament updates
    const unsubscribe = subscribeTournamentUpdates((data) => {
      if (data.tournamentId === tournamentId) {
        // Add update to the feed
        setRealTimeUpdates(prev => [
          {
            id: Date.now(),
            type: data.type,
            timestamp: new Date(data.timestamp || Date.now()),
            content: data
          },
          ...prev.slice(0, 19) // Keep only the 20 most recent updates
        ]);
        
        // Also update local tournament data if needed
        if (data.type === 'MATCHES_ADDED') {
          setTournament(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              matches: data.matches
            };
          });
        }
      }
    });
    
    // Clean up when unmounting
    return () => {
      leaveTournament(tournamentId);
      unsubscribe();
    };
  }, [tournamentId, joinTournament, leaveTournament, subscribeTournamentUpdates]);
  
  // Function to retry fetching data (useful if tournament data could not be loaded initially)
  const retryFetchData = useCallback(() => {
    console.log('Retrying tournament data fetch...');
    // Clear fetchingRef to allow a new attempt
    fetchingRef.current = false;
    // Clear data fetched flag
    dataFetchedRef.current = false;
    // Clear any cached data for this tournament
    try {
      tournamentService.clearCache(`tournament_${tournamentId}`);
    } catch (err) {
      console.error('Error clearing cache:', err);
    }
    // Try fetching again
    fetchTournamentData();
  }, [tournamentId, fetchTournamentData]);
  
  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Update URL without full refresh
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };
  
  // Handle calculate standings
  const handleCalculateStandings = async () => {
    if (calculatingStandings || tournament.matches?.length === 0) return;
    
    setCalculatingStandings(true);
    
    try {
      const response = await axios.post(`/api/tournaments/${tournamentId}/calculate-standings`, {
        platform: 'steam' // Default platform
      });
      
      // Update tournament with new standings
      setTournament(prev => ({
        ...prev,
        standings: JSON.stringify(response.data.data.standings)
      }));
      
      // Add update to feed
      setRealTimeUpdates(prev => [
        {
          id: Date.now(),
          type: 'STANDINGS_UPDATE',
          timestamp: new Date(),
          content: { tournamentId }
        },
        ...prev.slice(0, 19)
      ]);
      
    } catch (err) {
      console.error('Error calculating standings:', err);
      setError('Failed to calculate standings. Please try again.');
    } finally {
      setCalculatingStandings(false);
    }
  };
  
  // Handle export standings
  const handleExportStandings = () => {
    if (!tournament.standings) return;
    
    try {
      // Parse standings
      const standings = JSON.parse(tournament.standings);
      
      // Create CSV content
      let csvContent = 'Rank,Team,Points,Kills,Damage,Avg Placement\n';
      
      standings.forEach(team => {
        csvContent += `${team.rank},${team.teamName},${team.totalPoints},${team.totalKills},${Math.round(team.totalDamage)},${team.averagePlacement.toFixed(1)}\n`;
      });
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${tournament.name.replace(/\s+/g, '_')}_standings.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting standings:', err);
      setError('Failed to export standings');
    }
  };
  
  if (loading) {
    return (
      <div className="tournament-details-page">
        <div className="container">
          <h1 className="page-title">Tournament Details</h1>
          <LoadingSpinner />
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="tournament-details-page">
        <div className="container">
          <h1 className="page-title">Tournament Details</h1>
          <div className="error-container">{error}</div>
        </div>
      </div>
    );
  }
  
  if (!tournament) {
    return (
      <div className="tournament-details-page">
        <div className="container">
          <h1 className="page-title">Tournament Details</h1>
          <div className="error-container">
            <p>Tournament not found or could not be loaded</p>
            <button 
              className="btn btn-primary mt-3"
              onClick={retryFetchData}
            >
              Retry Loading Tournament
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Format dates
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  return (
    <div className="tournament-details-page">
      <div className="container">
        <div className="tournament-header">
          <h1 className="page-title">{tournament.name}</h1>
          <div className="tournament-meta">
            <div className="tournament-dates">
              <span className="date-label">Start:</span> {formatDate(tournament.start_date)}
              <span className="date-label"> End:</span> {formatDate(tournament.end_date)}
            </div>
            <div className="tournament-format">
              <span className="format-label">Format:</span> {tournament.format}
              <span className="scoring-label"> Scoring:</span> {tournament.scoring_system}
            </div>
            {tournament.is_active && <div className="status-active">Active</div>}
          </div>
        </div>
        
        {tournament.description && (
          <div className="tournament-description">
            {tournament.description}
          </div>
        )}
        
        {/* Tabs for different views */}
        <div className="tournament-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'standings' ? 'active' : ''}`}
            onClick={() => handleTabChange('standings')}
          >
            Standings
          </button>
          <button 
            className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => handleTabChange('matches')}
          >
            Matches
          </button>
          <button 
            className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => handleTabChange('teams')}
          >
            Teams
          </button>
          <button 
            className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
            onClick={() => handleTabChange('updates')}
          >
            Live Updates
          </button>
        </div>
        
        {/* Tab content */}
        <div className="tab-content">
          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="tournament-overview">
                <div className="overview-section">
                  <h2>Tournament Summary</h2>
                  <div className="summary-stats">
                    <div className="summary-stat">
                      <div className="stat-label">Teams</div>
                      <div className="stat-value">{tournament.teams?.length || 0}</div>
                    </div>
                    <div className="summary-stat">
                      <div className="stat-label">Matches</div>
                      <div className="stat-value">{tournament.matches?.length || 0}</div>
                    </div>
                    <div className="summary-stat">
                      <div className="stat-label">Status</div>
                      <div className="stat-value">{tournament.is_active ? 'Active' : 'Completed'}</div>
                    </div>
                    <div className="summary-stat">
                      <div className="stat-label">Visibility</div>
                      <div className="stat-value">{tournament.is_public ? 'Public' : 'Private'}</div>
                    </div>
                  </div>
                </div>
                
                <div className="overview-section">
                  <h2>Next Match</h2>
                  {tournament.matches && tournament.matches.length > 0 ? (
                    <div className="next-match-card">
                      <div className="match-number">Match #{tournament.matches[0].match_number}</div>
                      <div className="match-id">{tournament.matches[0].match_id}</div>
                      <div className="match-status">
                        {tournament.matches[0].verified ? 'Verified' : 'Pending'}
                      </div>
                      <Link 
                        to={`/matches/${tournament.matches[0].match_id}`}
                        className="view-match-btn"
                      >
                        View Match
                      </Link>
                    </div>
                  ) : (
                    <div className="no-matches">No matches scheduled yet</div>
                  )}
                </div>
                
                {tournament.standings && (
                  <div className="overview-section">
                    <h2>Current Standings</h2>
                    <div className="top-teams">
                      {JSON.parse(tournament.standings).slice(0, 3).map((team, index) => (
                        <div key={team.teamId} className={`top-team rank-${index + 1}`}>
                          <div className="team-rank">#{team.rank}</div>
                          <div className="team-name">{team.teamName}</div>
                          <div className="team-points">{team.totalPoints} pts</div>
                        </div>
                      ))}
                    </div>
                    <Link 
                      to="#" 
                      onClick={() => handleTabChange('standings')}
                      className="view-all-link"
                    >
                      View full standings
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Standings tab */}
          {activeTab === 'standings' && (
            <div className="standings-tab">
              <TournamentLeaderboard tournamentId={tournamentId} />
              
              <div className="standings-actions">
                <button 
                  className="calculate-btn btn-primary"
                  onClick={handleCalculateStandings}
                  disabled={calculatingStandings || tournament.matches?.length === 0}
                >
                  {calculatingStandings ? 'Calculating...' : 'Recalculate Standings'}
                </button>
                <button 
                  className="export-btn btn-secondary"
                  onClick={handleExportStandings}
                  disabled={!tournament.standings}
                >
                  Export to CSV
                </button>
              </div>
            </div>
          )}
          
          {/* Matches tab */}
          {activeTab === 'matches' && (
            <div className="matches-tab">
              <div className="matches-actions">
                <Link to={`/matches/search?tournamentId=${tournamentId}`} className="add-matches-btn">
                  Add Matches
                </Link>
              </div>
              
              {tournament.matches && tournament.matches.length > 0 ? (
                <div className="matches-list">
                  <h2>Tournament Matches</h2>
                  <div className="matches-grid">
                    {tournament.matches
                      .sort((a, b) => a.match_number - b.match_number)
                      .map(match => (
                        <div key={match.id} className="match-card">
                          <div className="match-header">
                            <div className="match-number">Match #{match.match_number}</div>
                            <div className="match-stage">{match.stage}</div>
                          </div>
                          <div className="match-body">
                            <div className="match-id">ID: {match.match_id}</div>
                            <div className="match-status">
                              {match.verified ? 'Verified' : 'Pending'}
                            </div>
                            <div className="match-date">
                              {new Date(match.registered_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="match-actions">
                            <Link 
                              to={`/matches/${match.match_id}`}
                              className="view-match-btn"
                            >
                              View Match
                            </Link>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              ) : (
                <div className="no-matches">
                  <p>No matches have been added to this tournament yet.</p>
                  <p>Use the "Add Matches" button to search for and add custom matches.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Teams tab */}
          {activeTab === 'teams' && (
            <div className="teams-tab">
              <div className="teams-actions">
                <button 
                  className="add-team-btn btn-primary"
                  onClick={() => setIsAddTeamModalOpen(true)}
                >
                  Add Team
                </button>
              </div>
              
              {/* Add Team Modal */}
              <Modal 
                isOpen={isAddTeamModalOpen} 
                onClose={() => setIsAddTeamModalOpen(false)}
              >
                <AddTeamToTournament 
                  tournamentId={tournamentId}
                  onSuccess={() => {
                    setIsAddTeamModalOpen(false);
                    // Refresh tournament data using service
                    const refreshTournamentData = async () => {
                      try {
                        console.log('Refreshing tournament data after adding team');
                        // Clear cache to ensure fresh data
                        tournamentService.clearCache(`tournament_${tournamentId}`);
                        const response = await tournamentService.getTournamentById(tournamentId);
                        setTournament(response.data.data);
                        console.log('Tournament data refreshed:', response.data.data);
                      } catch (err) {
                        console.error('Error refreshing tournament data:', err);
                      }
                    };
                    refreshTournamentData();
                    
                    // Add update to feed
                    setRealTimeUpdates(prev => [
                      {
                        id: Date.now(),
                        type: 'TEAMS_ADDED',
                        timestamp: new Date(),
                        content: { tournamentId }
                      },
                      ...prev.slice(0, 19)
                    ]);
                  }}
                  onCancel={() => setIsAddTeamModalOpen(false)}
                />
              </Modal>
              
              {tournament.teams && tournament.teams.length > 0 ? (
                <div className="teams-list">
                  <h2>Participating Teams</h2>
                  <div className="teams-grid">
                    {tournament.teams.map(team => (
                      <div key={team.id} className="team-card">
                        {team.logo_url && (
                          <div className="team-logo">
                            <img src={team.logo_url} alt={`${team.name} logo`} />
                          </div>
                        )}
                        <div className="team-info">
                          <div className="team-name">
                            {team.tag && <span className="team-tag">[{team.tag}]</span>}
                            {team.name}
                          </div>
                          <div className="team-seed">
                            Seed: {team.seed_number || 'Unranked'}
                          </div>
                          <div className="team-status">
                            {team.is_active ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        <div className="team-actions">
                          <Link 
                            to={`/teams/${team.id}`}
                            className="view-team-btn"
                          >
                            View Team
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="no-teams">
                  <p>No teams have been added to this tournament yet.</p>
                  <p>Use the "Add Team" button to register teams for this tournament.</p>
                </div>
              )}
            </div>
          )}
          
          {/* Live Updates tab */}
          {activeTab === 'updates' && (
            <div className="updates-tab">
              <h2>Live Tournament Updates</h2>
              <div className="updates-container">
                {realTimeUpdates.length > 0 ? (
                  <div className="updates-list">
                    {realTimeUpdates.map(update => (
                      <div key={update.id} className={`update-item update-${update.type.toLowerCase()}`}>
                        <div className="update-time">
                          {update.timestamp.toLocaleTimeString()}
                        </div>
                        <div className="update-content">
                          {formatUpdateContent(update)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-updates">
                    <p>No live updates yet.</p>
                    <p>Updates will appear here in real-time as tournament activity occurs.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to format update content
const formatUpdateContent = (update) => {
  switch (update.type) {
    case 'MATCHES_ADDED':
      return `${update.content.added.length} new match(es) added to the tournament`;
    case 'STANDINGS_UPDATE':
      return 'Tournament standings have been updated';
    case 'MATCH_COMPLETED':
      return `Match #${update.content.matchNumber || ''} completed`;
    case 'TEAM_JOINED':
      return `Team "${update.content.teamName}" joined the tournament`;
    default:
      return 'Tournament update received';
  }
};

export default TournamentDetails;
