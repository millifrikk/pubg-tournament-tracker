import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../common/LoadingSpinner';
import './MatchResultsView.css';

/**
 * Component for viewing match results with team names and points
 */
const MatchResultsView = ({ results, matchId }) => {
  const { id: tournamentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [teamNames, setTeamNames] = useState({});
  const [sortedResults, setSortedResults] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'placement', direction: 'asc' });
  
  // Fetch results if matchId provided but no results
  useEffect(() => {
    const fetchResults = async () => {
      if (results || !matchId || !tournamentId) return;
      
      setLoading(true);
      try {
        const response = await axios.get(`/api/tournaments/${tournamentId}/matches/${matchId}/results`);
        setSortedResults(
          response.data.data.results.sort((a, b) => a.placement - b.placement)
        );
      } catch (err) {
        console.error('Error fetching match results:', err);
        setError('Failed to load match results');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResults();
  }, [tournamentId, matchId, results]);
  
  // Set results from props if available
  useEffect(() => {
    if (results && results.results) {
      setSortedResults(
        [...results.results].sort((a, b) => a.placement - b.placement)
      );
    }
  }, [results]);
  
  // Sort results when sortConfig changes
  useEffect(() => {
    let sortableResults = [...sortedResults];
    if (sortConfig.key) {
      sortableResults.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    setSortedResults(sortableResults);
  }, [sortConfig]);
  
  // Fetch team names for all team IDs
  useEffect(() => {
    const fetchTeamNames = async () => {
      if (!sortedResults.length) return;
      
      const teamIds = sortedResults.map(result => result.team_id);
      
      try {
        const response = await axios.get('/api/teams', {
          params: { ids: teamIds.join(',') }
        });
        
        const namesMap = {};
        response.data.data.forEach(team => {
          namesMap[team.id] = team.name;
        });
        
        setTeamNames(namesMap);
      } catch (err) {
        console.error('Error fetching team names:', err);
      }
    };
    
    fetchTeamNames();
  }, [sortedResults]);
  
  // Handle sort request
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Get sort direction indicator
  const getSortDirectionIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };
  
  // Display placement with suffix (1st, 2nd, 3rd, etc.)
  const getPlacementDisplay = (placement) => {
    if (placement === 1) return '1st';
    if (placement === 2) return '2nd';
    if (placement === 3) return '3rd';
    return `${placement}th`;
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return <div className="error-container">{error}</div>;
  }
  
  if (!sortedResults.length) {
    return <div className="no-results">No results available for this match</div>;
  }
  
  return (
    <div className="match-results-view">
      <h3>Match Results</h3>
      
      <div className="results-table">
        <table>
          <thead>
            <tr>
              <th 
                className={sortConfig.key === 'placement' ? 'active-sort' : ''} 
                onClick={() => requestSort('placement')}
              >
                Placement{getSortDirectionIndicator('placement')}
              </th>
              <th>Team</th>
              <th 
                className={sortConfig.key === 'kills' ? 'active-sort' : ''} 
                onClick={() => requestSort('kills')}
              >
                Kills{getSortDirectionIndicator('kills')}
              </th>
              <th 
                className={sortConfig.key === 'placement_points' ? 'active-sort' : ''} 
                onClick={() => requestSort('placement_points')}
              >
                Placement Points{getSortDirectionIndicator('placement_points')}
              </th>
              <th 
                className={sortConfig.key === 'kill_points' ? 'active-sort' : ''} 
                onClick={() => requestSort('kill_points')}
              >
                Kill Points{getSortDirectionIndicator('kill_points')}
              </th>
              <th 
                className={sortConfig.key === 'total_points' ? 'active-sort' : ''} 
                onClick={() => requestSort('total_points')}
              >
                Total Points{getSortDirectionIndicator('total_points')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map(result => (
              <tr key={result.team_id} className={result.placement <= 3 ? `placement-${result.placement}` : ''}>
                <td className="placement">{getPlacementDisplay(result.placement)}</td>
                <td className="team-name">{teamNames[result.team_id] || result.team_id}</td>
                <td className="kills">{result.kills}</td>
                <td className="placement-points">{result.placement_points}</td>
                <td className="kill-points">{result.kill_points}</td>
                <td className="total-points">{result.total_points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="results-summary">
        <div className="summary-item">
          <span className="label">Total Teams:</span>
          <span className="value">{sortedResults.length}</span>
        </div>
        <div className="summary-item">
          <span className="label">Total Kills:</span>
          <span className="value">
            {sortedResults.reduce((sum, result) => sum + result.kills, 0)}
          </span>
        </div>
        <div className="summary-item">
          <span className="label">Total Points:</span>
          <span className="value">
            {sortedResults.reduce((sum, result) => sum + result.total_points, 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MatchResultsView;
