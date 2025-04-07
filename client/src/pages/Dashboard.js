import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import tournamentService from '../services/tournamentService';
import teamService from '../services/teamService';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log('Fetching dashboard data...');
        
        // Fetch recent tournaments
        console.log('Fetching tournaments with tournamentService.getAllTournaments()'); 
        const tournamentsResponse = await tournamentService.getAllTournaments();
        console.log('Tournament response:', tournamentsResponse);
        
        // Fetch teams
        console.log('Fetching teams with teamService.getAllTeams()'); 
        const teamsResponse = await teamService.getAllTeams();
        console.log('Teams response:', teamsResponse);
        
        // Set the data
        setTournaments(tournamentsResponse.data || []);
        setTeams(teamsResponse.data || []);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  return (
    <div className="dashboard-page">
      <div className="container">
        <h1 className="page-title">Dashboard</h1>
        
        <div className="welcome-card">
          <h2>Welcome, {currentUser?.username || 'User'}!</h2>
          <p>Manage your tournaments, teams, and matches from this dashboard.</p>
        </div>
        
        {loading ? (
          <div className="loading-indicator">Loading dashboard data...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <div className="dashboard-container">
            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>Tournaments</h3>
                <p>Create, manage, and track your tournaments.</p>
                <div className="card-actions">
                  <Link to="/tournaments" className="btn btn-outline">View All</Link>
                  <Link to="/tournaments/create" className="btn btn-primary">Create New</Link>
                </div>
                
                {tournaments && tournaments.length > 0 ? (
                  <div className="recent-list">
                    <h4>Active Tournaments</h4>
                    <ul className="tournament-list">
                      {tournaments.map(tournament => (
                        <li key={tournament.id} className="tournament-item">
                          <Link to={`/tournaments/${tournament.id}`}>
                            <span className="tournament-name">{tournament.name}</span>
                            <span className="tournament-date">
                              {new Date(tournament.start_date || tournament.startDate).toLocaleDateString()}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="empty-list">
                    <p>No active tournaments</p>
                  </div>
                )}
              </div>
              
              <div className="dashboard-card">
                <h3>Teams</h3>
                <p>Manage your teams and players.</p>
                <div className="card-actions">
                  <Link to="/teams" className="btn btn-outline">View All</Link>
                  <Link to="/teams/create" className="btn btn-primary">Create New</Link>
                </div>
                
                {teams && teams.length > 0 ? (
                  <div className="recent-list">
                    <h4>Your Teams</h4>
                    <ul className="team-list">
                      {teams.map(team => (
                        <li key={team.id} className="team-item">
                          <Link to={`/teams/${team.id}`}>
                            {team.logo_url && (
                              <img 
                                src={team.logo_url} 
                                alt={team.name} 
                                className="team-logo" 
                              />
                            )}
                            <span className="team-name">
                              {team.tag && (
                                <span className="team-tag">[{team.tag}]</span>
                              )}
                              {team.name}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="empty-list">
                    <p>No teams created yet</p>
                  </div>
                )}
              </div>
              
              <div className="dashboard-card">
                <h3>Custom Matches</h3>
                <p>Find and add custom matches to your tournaments.</p>
                <div className="card-actions">
                  <Link to="/matches/search" className="btn btn-primary">Find Matches</Link>
                </div>
                
                <div className="match-search-tips">
                  <h4>Search Tips</h4>
                  <ul>
                    <li>Use player names to find matches they participated in</li>
                    <li>Filter by date range, game mode, and map</li>
                    <li>Add custom matches to your tournaments</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="tournament-management-overview">
              <h3>Tournament Management System</h3>
              <div className="feature-list">
                <div className="feature-item">
                  <div className="feature-icon">🏆</div>
                  <div className="feature-text">
                    <h4>Tournament Creation</h4>
                    <p>Create and customize tournaments with different formats and scoring systems</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">👥</div>
                  <div className="feature-text">
                    <h4>Team Management</h4>
                    <p>Add teams and players, track their performance across tournaments</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">🔍</div>
                  <div className="feature-text">
                    <h4>Match Integration</h4>
                    <p>Find custom matches using the PUBG API and add them to your tournaments</p>
                  </div>
                </div>
                
                <div className="feature-item">
                  <div className="feature-icon">📊</div>
                  <div className="feature-text">
                    <h4>Statistics & Leaderboards</h4>
                    <p>Automatically calculate standings and track team performance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;