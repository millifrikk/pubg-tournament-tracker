import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import tournamentService from '../../services/tournamentService';

const TournamentLeaderboard = ({ tournamentId }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await tournamentService.getTournamentLeaderboard(tournamentId);
        setLeaderboard(response.data || []);
      } catch (err) {
        console.error('Error fetching tournament leaderboard:', err);
        setError('Failed to load leaderboard data');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchLeaderboard();
    }
  }, [tournamentId]);

  // Sort handler
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting
  const sortedLeaderboard = React.useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return [];
    
    const sortableItems = [...leaderboard];
    
    sortableItems.sort((a, b) => {
      // Handle nested properties
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // Special case for team name - case insensitive sort
      if (sortConfig.key === 'teamName') {
        aValue = (aValue || '').toLowerCase();
        bValue = (bValue || '').toLowerCase();
      }
      
      // Numerical sort for numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' 
          ? aValue - bValue 
          : bValue - aValue;
      }
      
      // String sort
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    return sortableItems;
  }, [leaderboard, sortConfig]);

  // Sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' 🔼' : ' 🔽';
    }
    return '';
  };

  if (loading) {
    return <div className="p-4 text-center">Loading leaderboard data...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>{error}</p>
        <button 
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="p-4 text-center">
        <p>No leaderboard data available yet.</p>
        <p className="text-sm text-gray-500 mt-2">This could be because no matches have been processed or the tournament hasn't started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th 
              className="py-2 px-4 border-b border-gray-200 cursor-pointer hover:bg-gray-200"
              onClick={() => requestSort('rank')}
            >
              Rank{getSortIndicator('rank')}
            </th>
            <th 
              className="py-2 px-4 border-b border-gray-200 cursor-pointer hover:bg-gray-200"
              onClick={() => requestSort('teamName')}
            >
              Team{getSortIndicator('teamName')}
            </th>
            <th 
              className="py-2 px-4 border-b border-gray-200 cursor-pointer hover:bg-gray-200"
              onClick={() => requestSort('totalPoints')}
            >
              Points{getSortIndicator('totalPoints')}
            </th>
            <th 
              className="py-2 px-4 border-b border-gray-200 cursor-pointer hover:bg-gray-200"
              onClick={() => requestSort('totalKills')}
            >
              Kills{getSortIndicator('totalKills')}
            </th>
            <th 
              className="py-2 px-4 border-b border-gray-200 cursor-pointer hover:bg-gray-200"
              onClick={() => requestSort('averagePlacement')}
            >
              Avg. Placement{getSortIndicator('averagePlacement')}
            </th>
            <th 
              className="py-2 px-4 border-b border-gray-200 cursor-pointer hover:bg-gray-200"
              onClick={() => requestSort('bestPlacement')}
            >
              Best{getSortIndicator('bestPlacement')}
            </th>
            <th className="py-2 px-4 border-b border-gray-200">
              Matches
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedLeaderboard.map((team, index) => (
            <tr 
              key={team.teamId || index} 
              className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}
            >
              <td className="py-2 px-4 border-b border-gray-200 text-center">
                {team.rank}
              </td>
              <td className="py-2 px-4 border-b border-gray-200 font-medium">
                {team.teamTag && <span className="font-bold mr-2">[{team.teamTag}]</span>}
                {team.teamId ? (
                  <Link to={`/teams/${team.teamId}`} className="text-blue-600 hover:underline">
                    {team.teamName}
                  </Link>
                ) : (
                  team.teamName
                )}
              </td>
              <td className="py-2 px-4 border-b border-gray-200 text-center font-bold">
                {team.totalPoints}
              </td>
              <td className="py-2 px-4 border-b border-gray-200 text-center">
                {team.totalKills}
              </td>
              <td className="py-2 px-4 border-b border-gray-200 text-center">
                {team.averagePlacement ? team.averagePlacement.toFixed(1) : '-'}
              </td>
              <td className="py-2 px-4 border-b border-gray-200 text-center">
                {team.bestPlacement}
              </td>
              <td className="py-2 px-4 border-b border-gray-200 text-center">
                {team.matches ? team.matches.length : 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TournamentLeaderboard;
