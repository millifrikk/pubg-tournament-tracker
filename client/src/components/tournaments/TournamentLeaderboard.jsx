import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import LoadingSpinner from '../common/LoadingSpinner';
import './TournamentLeaderboard.css';

/**
 * Component for displaying tournament leaderboard with team rankings
 */
const TournamentLeaderboard = ({ tournamentId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastCalculated, setLastCalculated] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
  
  // Listen for standings updates
  useEffect(() => {
    if (socket && tournamentId) {
      socket.on('standingsUpdate', (data) => {
        if (data.tournamentId === tournamentId) {
          fetchStandings();
        }
      });
      
      return () => {
        socket.off('standingsUpdate');
      };
    }
  }, [socket, tournamentId]);
  
  // Fetch leaderboard standings
  const fetchStandings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/tournaments/${tournamentId}/leaderboard`);
      
      if (response.data.data) {
        setStandings(response.data.data);
        setLastCalculated(response.data.meta.lastCalculated);
      } else {
        setStandings([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err.response?.data?.error || 'Failed to load tournament standings');
    } finally {
      setLoading(false);
    }
  };
  
  // Initial fetch
  useEffect(() => {
    if (tournamentId) {
      fetchStandings();
    }
  }, [tournamentId]);
  
  // Handle sort request
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else if (key === 'rank') {
      direction = 'asc';
    } else {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Get sort direction indicator
  const getSortDirectionIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };
  
  // Sort standings based on the current sort configuration
  const sortedStandings = React.useMemo(() => {
    let sortableStandings = [...standings];
    if (sortConfig.key) {
      sortableStandings.sort((a, b) => {
        // Special handling for 'matches' which is an array
        if (sortConfig.key === 'matchCount') {
          if (a.matches.length < b.matches.length) {
            return sortConfig.direction === 'asc' ? -1 : 1;
          }
          if (a.matches.length > b.matches.length) {
            return sortConfig.direction === 'asc' ? 1 : -1;
          }
          return 0;
        } 
        
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableStandings;
  }, [standings, sortConfig]);
  
  // Check if user is tournament organizer (for calculation button)
  const isOrganizer = () => {
    // Would need to fetch tournament details to check organizer_id,
    // but for now let's just check if user is authenticated
    return !!user;
  };
  
  // Handle calculate standings
  const handleCalculateStandings = async () => {
    try {
      setCalculating(true);
      await axios.post(`/api/tournaments/${tournamentId}/calculate-standings`);
      fetchStandings();
    } catch (err) {
      console.error('Error calculating standings:', err);
      setError(err.response?.data?.error || 'Failed to calculate tournament standings');
    } finally {
      setCalculating(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };
  
  if (loading) {
    return (
      <div className="tournament-leaderboard loading">
        <LoadingSpinner />
        <p>Loading leaderboard...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="tournament-leaderboard error">
        <div className="error-container">
          <h3>Error Loading Leaderboard</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (standings.length === 0) {
    return (
      <div className="tournament-leaderboard empty">
        <div className="empty-state">
          <h3>No Standings Available</h3>
          <p>No teams have participated in matches yet, or standings have not been calculated.</p>
          {isOrganizer() && (
            <button 
              className="calculate-btn"
              onClick={handleCalculateStandings}
              disabled={calculating}
            >
              {calculating ? <><LoadingSpinner size="small" /> Calculating...</> : 'Calculate Standings'}
            </button>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="tournament-leaderboard">
      <div className="leaderboard-header">
        <div className="header-info">
          <h3>Tournament Standings</h3>
          <div className="last-calculated">
            Last updated: {formatDate(lastCalculated)}
          </div>
        </div>
        
        {isOrganizer() && (
          <button 
            className="calculate-btn"
            onClick={handleCalculateStandings}
            disabled={calculating}
          >
            {calculating ? <><LoadingSpinner size="small" /> Calculating...</> : 'Recalculate Standings'}
          </button>
        )}
      </div>
      
      <div className="leaderboard-table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th 
                className={sortConfig.key === 'rank' ? 'active-sort' : ''} 
                onClick={() => requestSort('rank')}
              >
                Rank{getSortDirectionIndicator('rank')}
              </th>
              <th>Team</th>
              <th 
                className={sortConfig.key === 'totalPoints' ? 'active-sort' : ''} 
                onClick={() => requestSort('totalPoints')}
              >
                Points{getSortDirectionIndicator('totalPoints')}
              </th>
              <th 
                className={sortConfig.key === 'matchCount' ? 'active-sort' : ''} 
                onClick={() => requestSort('matchCount')}
              >
                Matches{getSortDirectionIndicator('matchCount')}
              </th>
              <th 
                className={sortConfig.key === 'totalKills' ? 'active-sort' : ''} 
                onClick={() => requestSort('totalKills')}
              >
                Kills{getSortDirectionIndicator('totalKills')}
              </th>
              <th 
                className={sortConfig.key === 'averagePlacement' ? 'active-sort' : ''} 
                onClick={() => requestSort('averagePlacement')}
              >
                Avg. Placement{getSortDirectionIndicator('averagePlacement')}
              </th>
              <th 
                className={sortConfig.key === 'bestPlacement' ? 'active-sort' : ''} 
                onClick={() => requestSort('bestPlacement')}
              >
                Best{getSortDirectionIndicator('bestPlacement')}
              </th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {sortedStandings.map((team) => (
              <tr key={team.teamId} className={team.rank <= 3 ? `rank-${team.rank}` : ''}>
                <td className="rank">#{team.rank}</td>
                <td className="team-name">
                  {team.teamName}
                  {team.teamTag && <span className="team-tag">{team.teamTag}</span>}
                </td>
                <td className="points">{team.totalPoints}</td>
                <td className="matches">{team.matches.length}</td>
                <td className="kills">{team.totalKills}</td>
                <td className="avg-placement">{team.averagePlacement.toFixed(1)}</td>
                <td className="best-placement">{team.bestPlacement}</td>
                <td className="actions">
                  <button 
                    className="view-details-btn"
                    onClick={() => navigate(`/teams/${team.teamId}`)}
                  >
                    View Team
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="leaderboard-legend">
        <div className="legend-item">
          <span className="rank-indicator rank-1"></span>
          <span className="legend-text">1st Place</span>
        </div>
        <div className="legend-item">
          <span className="rank-indicator rank-2"></span>
          <span className="legend-text">2nd Place</span>
        </div>
        <div className="legend-item">
          <span className="rank-indicator rank-3"></span>
          <span className="legend-text">3rd Place</span>
        </div>
      </div>
    </div>
  );
};

export default TournamentLeaderboard;
