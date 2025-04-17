import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import teamService from '../../services/teamService';
import LoadingSpinner from '../common/LoadingSpinner';
import './TeamSelector.css';

/**
 * Team selector component used for selecting teams to add to tournaments
 */
const TeamSelector = ({ onTeamSelect, selectedTeams = [] }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Fetch teams on component mount
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await teamService.getAllTeams();
        console.log('Teams fetched:', response.data);
        setTeams(response.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load teams: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // Handle team selection
  const handleTeamSelect = (team) => {
    if (onTeamSelect) {
      onTeamSelect(team);
    }
  };

  // Filter teams based on search term
  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (team.tag && team.tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Check if a team is selected
  const isTeamSelected = (teamId) => {
    return selectedTeams.some(team => team.id === teamId);
  };

  return (
    <div className="team-selector">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-container">
          <LoadingSpinner />
          <p>Loading teams...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
          <button 
            className="retry-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="teams-container">
            {filteredTeams.length > 0 ? (
              filteredTeams.map(team => (
                <div 
                  key={team.id} 
                  className={`team-item ${isTeamSelected(team.id) ? 'selected' : ''}`}
                  onClick={() => handleTeamSelect(team)}
                >
                  <div className="team-info">
                    <span className="team-name">{team.name}</span>
                    {team.tag && <span className="team-tag">[{team.tag}]</span>}
                    {team.player_count > 0 && <span className="player-count">{team.player_count} players</span>}
                  </div>
                  <button 
                    className="select-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTeamSelect(team);
                    }}
                  >
                    {isTeamSelected(team.id) ? 'Selected' : 'Select'}
                  </button>
                </div>
              ))
            ) : (
              <div className="no-teams-message">
                <p>No teams found matching "{searchTerm}"</p>
                {searchTerm ? (
                  <button 
                    className="clear-search-btn"
                    onClick={() => setSearchTerm('')}
                  >
                    Clear Search
                  </button>
                ) : null}
              </div>
            )}
          </div>
          
          <div className="team-selector-actions">
            <button 
              className="create-team-btn"
              onClick={() => navigate('/teams/create')}
            >
              Create New Team
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TeamSelector;
