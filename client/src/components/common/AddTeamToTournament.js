import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';

const AddTeamToTournament = ({ tournamentId, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTeams, setFilteredTeams] = useState([]);
  
  // Fetch available teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        
        // Fetch all teams
        const teamsResponse = await axios.get('/api/teams');
        
        // Fetch teams already in tournament to exclude them
        const tournamentResponse = await axios.get(`/api/tournaments/${tournamentId}`);
        
        const allTeams = teamsResponse.data.data;
        const tournamentTeamIds = tournamentResponse.data.data.teams.map(team => team.id);
        
        // Filter out teams already in the tournament
        const availableTeams = allTeams.filter(team => !tournamentTeamIds.includes(team.id));
        
        setTeams(availableTeams);
        setFilteredTeams(availableTeams);
        setError(null);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load available teams');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeams();
  }, [tournamentId]);
  
  // Filter teams based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredTeams(teams);
    } else {
      const lowercaseSearch = searchTerm.toLowerCase();
      const filtered = teams.filter(team => 
        team.name.toLowerCase().includes(lowercaseSearch) || 
        (team.tag && team.tag.toLowerCase().includes(lowercaseSearch))
      );
      setFilteredTeams(filtered);
    }
  }, [searchTerm, teams]);
  
  // Handle team selection toggle
  const toggleTeamSelection = (teamId) => {
    if (selectedTeams.includes(teamId)) {
      setSelectedTeams(selectedTeams.filter(id => id !== teamId));
    } else {
      setSelectedTeams([...selectedTeams, teamId]);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedTeams.length === 0) {
      setError('Please select at least one team');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      console.log(`Adding ${selectedTeams.length} teams to tournament ${tournamentId}`);
      
      // Add teams to tournament one by one with better error handling
      const successfulTeams = [];
      const failedTeams = [];
      
      for (const teamId of selectedTeams) {
        try {
          console.log(`Adding team ${teamId} to tournament ${tournamentId}`);
          await axios.post(`/api/tournaments/${tournamentId}/teams`, { teamId });
          successfulTeams.push(teamId);
        } catch (teamError) {
          console.error(`Error adding team ${teamId}:`, teamError);
          failedTeams.push(teamId);
        }
      }
      
      if (failedTeams.length > 0 && successfulTeams.length > 0) {
        setError(`Added ${successfulTeams.length} teams, but failed to add ${failedTeams.length} teams`);
      } else if (failedTeams.length > 0 && successfulTeams.length === 0) {
        throw new Error('Failed to add any teams to the tournament');
      } else {
        // All teams added successfully
        // Call success callback
        onSuccess();
      }
    } catch (err) {
      console.error('Error adding teams to tournament:', err);
      setError(err.response?.data?.error || err.message || 'Failed to add teams to tournament');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="add-team-modal">
      <div className="modal-header">
        <h2>Add Teams to Tournament</h2>
        <button onClick={onCancel} className="close-btn">&times;</button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {loading ? (
        <LoadingSpinner />
      ) : filteredTeams.length > 0 ? (
        <form onSubmit={handleSubmit}>
          <div className="teams-selection">
            {filteredTeams.map(team => (
              <div 
                key={team.id} 
                className={`team-selection-item ${selectedTeams.includes(team.id) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  id={`team-${team.id}`}
                  checked={selectedTeams.includes(team.id)}
                  onChange={() => toggleTeamSelection(team.id)}
                />
                <label htmlFor={`team-${team.id}`}>
                  {team.tag && <span className="team-tag">[{team.tag}]</span>}
                  {team.name}
                </label>
              </div>
            ))}
          </div>
          
          <div className="modal-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={submitting || selectedTeams.length === 0}
            >
              {submitting ? 'Adding...' : `Add ${selectedTeams.length} Teams`}
            </button>
          </div>
        </form>
      ) : (
        <div className="no-teams-available">
          <p>No teams available to add.</p>
          <p>All existing teams are already part of this tournament or no teams exist yet.</p>
          <div className="modal-actions">
            <button onClick={onCancel} className="btn-secondary">Close</button>
            <button onClick={() => window.location.href = "/teams/create"} className="btn-primary">
              Create New Team
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddTeamToTournament;
