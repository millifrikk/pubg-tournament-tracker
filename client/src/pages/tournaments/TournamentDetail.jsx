import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AddTeamToTournament from '../../components/tournaments/AddTeamToTournament';
import AddMatchToTournament from '../../components/tournaments/AddMatchToTournament';
import MatchProcessor from '../../components/tournaments/MatchProcessor';
import PlayerExtractor from '../../components/tournaments/PlayerExtractor';
import TournamentLeaderboard from '../../components/tournaments/TournamentLeaderboard';
import Modal from '../../components/common/Modal';
import './TournamentDetail.css';

const TournamentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Modal states
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [showProcessMatchModal, setShowProcessMatchModal] = useState(false);
  const [showExtractPlayersModal, setShowExtractPlayersModal] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  
  // Socket connection for real-time updates
  useEffect(() => {
    if (socket && id) {
      // Join tournament room
      socket.emitEvent('joinTournament', id);
      
      // Listen for tournament updates
      const tournamentUnsubscribe = socket.subscribeToEvent('tournamentUpdate', handleTournamentUpdate);
      
      // Listen for standings updates
      const standingsUnsubscribe = socket.subscribeToEvent('standingsUpdate', handleStandingsUpdate);
      
      // Cleanup
      return () => {
        socket.emitEvent('leaveTournament', id);
        tournamentUnsubscribe();
        standingsUnsubscribe();
      };
    }
  }, [socket, id]);
  
  // Handle tournament updates
  const handleTournamentUpdate = (data) => {
    console.log('Tournament update:', data);
    // Trigger a refresh of tournament data
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handle standings updates
  const handleStandingsUpdate = (data) => {
    console.log('Standings update:', data);
    // Trigger a refresh of tournament data
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Fetch tournament data
  useEffect(() => {
    const fetchTournament = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/tournaments/${id}`);
        setTournament(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching tournament:', err);
        setError(err.response?.data?.error || 'Failed to load tournament details');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchTournament();
    }
  }, [id, refreshTrigger]);
  
  // Fetch teams when on teams tab
  useEffect(() => {
    const fetchTeams = async () => {
      if (activeTab !== 'teams') return;
      
      try {
        setLoadingTeams(true);
        const response = await axios.get(`/api/tournaments/${id}/teams/with-players`);
        setTeams(response.data.data);
      } catch (err) {
        console.error('Error fetching teams:', err);
      } finally {
        setLoadingTeams(false);
      }
    };
    
    if (id) {
      fetchTeams();
    }
  }, [id, activeTab, refreshTrigger]);
  
  // Fetch matches when on matches tab
  useEffect(() => {
    const fetchMatches = async () => {
      if (activeTab !== 'matches') return;
      
      try {
        setLoadingMatches(true);
        const response = await axios.get(`/api/tournaments/${id}/matches`);
        setMatches(response.data.data);
      } catch (err) {
        console.error('Error fetching matches:', err);
      } finally {
        setLoadingMatches(false);
      }
    };
    
    if (id) {
      fetchMatches();
    }
  }, [id, activeTab, refreshTrigger]);
  
  // Check if user is tournament organizer
  const isOrganizer = () => {
    return user && tournament && (user.id === tournament.organizer_id || user.role === 'admin');
  };
  
  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  // Handle add team success
  const handleTeamAdded = () => {
    setShowAddTeamModal(false);
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handle add match success
  const handleMatchAdded = () => {
    setShowAddMatchModal(false);
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handle process match success
  const handleMatchProcessed = () => {
    setShowProcessMatchModal(false);
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handle extract players success
  const handlePlayersExtracted = () => {
    setShowExtractPlayersModal(false);
    setRefreshTrigger(prev => prev + 1);
  };
  
  // Handle match selection for processing
  const handleProcessMatch = (matchId) => {
    setSelectedMatchId(matchId);
    setShowProcessMatchModal(true);
  };
  
  // Handle match selection for player extraction
  const handleExtractPlayers = (matchId) => {
    setSelectedMatchId(matchId);
    setShowExtractPlayersModal(true);
  };
  
  // Get match status icon
  const getMatchStatusIcon = (match) => {
    if (match.processed) {
      return <span className="status-icon processed" title="Results processed">✓</span>;
    } else if (match.match_data) {
      return <span className="status-icon data-available" title="Match data available">⚙</span>;
    } else {
      return <span className="status-icon pending" title="Pending processing">⏳</span>;
    }
  };
  
  if (loading) {
    return (
      <div className="tournament-detail loading">
        <LoadingSpinner />
        <p>Loading tournament details...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="tournament-detail error">
        <div className="error-container">
          <h2>Error Loading Tournament</h2>
          <p>{error}</p>
          <button 
            className="back-btn" 
            onClick={() => navigate('/tournaments')}
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }
  
  if (!tournament) {
    return (
      <div className="tournament-detail error">
        <div className="error-container">
          <h2>Tournament Not Found</h2>
          <p>The tournament you are looking for could not be found.</p>
          <button 
            className="back-btn" 
            onClick={() => navigate('/tournaments')}
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="tournament-detail">
      <div className="tournament-header">
        <div className="header-content">
          <h1>{tournament.name}</h1>
          <div className="tournament-meta">
            <div className="meta-item">
              <span className="label">Start:</span>
              <span className="value">{formatDate(tournament.start_date)}</span>
            </div>
            <div className="meta-item">
              <span className="label">End:</span>
              <span className="value">{formatDate(tournament.end_date)}</span>
            </div>
            <div className="meta-item">
              <span className="label">Format:</span>
              <span className="value">{tournament.format || 'Standard'}</span>
            </div>
            <div className="meta-item">
              <span className="label">Scoring:</span>
              <span className="value">{tournament.scoring_system || 'SUPER'}</span>
            </div>
            <div className="meta-item status">
              <span className={`status-badge ${tournament.is_active ? 'active' : 'inactive'}`}>
                {tournament.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
        
        {isOrganizer() && (
          <div className="tournament-actions">
            <button 
              className="edit-btn"
              onClick={() => navigate(`/tournaments/${id}/edit`)}
            >
              Edit Tournament
            </button>
          </div>
        )}
      </div>
      
      <div className="tournament-description">
        <p>{tournament.description || 'No description provided.'}</p>
      </div>
      
      <div className="tournament-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
          onClick={() => setActiveTab('teams')}
        >
          Teams
        </button>
        <button 
          className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          Matches
        </button>
        <button 
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
      </div>
      
      <div className="tournament-tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-stats">
              <div className="stat-card">
                <h3>Teams</h3>
                <div className="stat-value">{tournament.team_count || 0}</div>
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('teams')}
                >
                  View Teams
                </button>
              </div>
              
              <div className="stat-card">
                <h3>Matches</h3>
                <div className="stat-value">{tournament.match_count || 0}</div>
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('matches')}
                >
                  View Matches
                </button>
              </div>
              
              <div className="stat-card">
                <h3>Scoring System</h3>
                <div className="stat-value">{tournament.scoring_system || 'SUPER'}</div>
                <button 
                  className="action-btn"
                  onClick={() => setActiveTab('leaderboard')}
                >
                  View Standings
                </button>
              </div>
            </div>
            
            <div className="overview-actions">
              <h3>Tournament Management</h3>
              
              <div className="action-buttons">
                {isOrganizer() && (
                  <>
                    <button 
                      className="mgmt-btn add-team"
                      onClick={() => setShowAddTeamModal(true)}
                    >
                      Add Teams
                    </button>
                    
                    <button 
                      className="mgmt-btn add-match"
                      onClick={() => setShowAddMatchModal(true)}
                    >
                      Add Matches
                    </button>
                    
                    <button 
                      className="mgmt-btn calculate"
                      onClick={() => navigate(`/tournaments/${id}/calculate`)}
                    >
                      Calculate Standings
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'teams' && (
          <div className="teams-tab">
            {isOrganizer() && (
              <div className="tab-actions">
                <button 
                  className="add-btn"
                  onClick={() => setShowAddTeamModal(true)}
                >
                  Add Teams
                </button>
              </div>
            )}
            
            {loadingTeams ? (
              <div className="loading-container">
                <LoadingSpinner />
                <p>Loading teams...</p>
              </div>
            ) : teams.length > 0 ? (
              <div className="teams-grid">
                {teams.map(team => (
                  <div key={team.id} className="team-card">
                    <div className="team-header">
                      <h3 className="team-name">{team.name}</h3>
                      {team.tag && <span className="team-tag">{team.tag}</span>}
                    </div>
                    
                    <div className="team-meta">
                      <div className="meta-item">
                        <span className="label">Players:</span>
                        <span className="value">{team.player_count || 0}</span>
                      </div>
                      <div className="meta-item">
                        <span className="label">Points:</span>
                        <span className="value">{team.points || 0}</span>
                      </div>
                    </div>
                    
                    <div className="team-actions">
                      <button 
                        className="view-btn"
                        onClick={() => navigate(`/teams/${team.id}`)}
                      >
                        View Team
                      </button>
                      
                      {isOrganizer() && (
                        <button 
                          className="remove-btn"
                          onClick={() => {
                            // Implementation for remove team
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No teams added to this tournament yet.</p>
                {isOrganizer() && (
                  <button 
                    className="add-btn"
                    onClick={() => setShowAddTeamModal(true)}
                  >
                    Add Teams
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'matches' && (
          <div className="matches-tab">
            {isOrganizer() && (
              <div className="tab-actions">
                <button 
                  className="add-btn"
                  onClick={() => setShowAddMatchModal(true)}
                >
                  Add Matches
                </button>
              </div>
            )}
            
            {loadingMatches ? (
              <div className="loading-container">
                <LoadingSpinner />
                <p>Loading matches...</p>
              </div>
            ) : matches.length > 0 ? (
              <div className="matches-list">
                <table className="matches-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Map</th>
                      <th>Mode</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map(match => (
                      <tr key={match.match_id}>
                        <td>{match.match_number || '-'}</td>
                        <td>
                          {match.data?.attributes?.createdAt 
                            ? formatDate(match.data.attributes.createdAt) 
                            : '-'}
                        </td>
                        <td>{match.data?.attributes?.mapName || '-'}</td>
                        <td>{match.data?.attributes?.gameMode || '-'}</td>
                        <td>{getMatchStatusIcon(match)}</td>
                        <td className="match-actions">
                          <button 
                            className="view-btn"
                            onClick={() => navigate(`/matches/${match.match_id}`)}
                          >
                            View
                          </button>
                          
                          {isOrganizer() && (
                            <>
                              <button 
                                className="process-btn"
                                onClick={() => handleProcessMatch(match.match_id)}
                                disabled={match.processed}
                              >
                                {match.processed ? 'Processed' : 'Process'}
                              </button>
                              <button 
                                className="extract-btn"
                                onClick={() => handleExtractPlayers(match.match_id)}
                              >
                                Extract Players
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>No matches added to this tournament yet.</p>
                {isOrganizer() && (
                  <button 
                    className="add-btn"
                    onClick={() => setShowAddMatchModal(true)}
                  >
                    Add Matches
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'leaderboard' && (
          <div className="leaderboard-tab">
            <TournamentLeaderboard tournamentId={id} />
          </div>
        )}
      </div>
      
      {/* Modals */}
      {showAddTeamModal && (
        <Modal 
          title="Add Teams to Tournament" 
          onClose={() => setShowAddTeamModal(false)}
        >
          <AddTeamToTournament 
            tournamentId={id}
            onSuccess={handleTeamAdded}
            onCancel={() => setShowAddTeamModal(false)}
          />
        </Modal>
      )}
      
      {showAddMatchModal && (
        <Modal 
          title="Add Matches to Tournament" 
          onClose={() => setShowAddMatchModal(false)}
          fullWidth
        >
          <AddMatchToTournament 
            onSuccess={handleMatchAdded}
            onCancel={() => setShowAddMatchModal(false)}
          />
        </Modal>
      )}
      
      {showProcessMatchModal && selectedMatchId && (
        <Modal 
          title="Process Match Results" 
          onClose={() => setShowProcessMatchModal(false)}
        >
          <MatchProcessor 
            matchId={selectedMatchId}
            onProcessingComplete={handleMatchProcessed}
          />
        </Modal>
      )}
      
      {showExtractPlayersModal && selectedMatchId && (
        <Modal 
          title="Extract Players from Match" 
          onClose={() => setShowExtractPlayersModal(false)}
        >
          <PlayerExtractor 
            matchId={selectedMatchId}
            onComplete={handlePlayersExtracted}
          />
        </Modal>
      )}
    </div>
  );
};

export default TournamentDetail;
