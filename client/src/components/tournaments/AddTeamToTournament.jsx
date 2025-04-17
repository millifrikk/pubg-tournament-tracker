import React, { useState } from 'react';
import TeamSelector from './TeamSelector';
import tournamentService from '../../services/tournamentService';
import LoadingSpinner from '../common/LoadingSpinner';
import './AddTeamToTournament.css';

/**
 * Component for adding teams to a tournament
 */
const AddTeamToTournament = ({ tournamentId, onSuccess, onCancel }) => {
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Handle team selection
  const handleTeamSelect = (team) => {
    // Toggle team selection
    if (selectedTeams.some(t => t.id === team.id)) {
      setSelectedTeams(prev => prev.filter(t => t.id !== team.id));
    } else {
      setSelectedTeams(prev => [...prev, team]);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (selectedTeams.length === 0) {
      setError('Please select at least one team');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Add each selected team to the tournament
      const results = [];
      for (const team of selectedTeams) {
        try {
          const response = await tournamentService.addTeamToTournament(tournamentId, team.id);
          results.push({
            team: team.name,
            success: true,
            response: response
          });
        } catch (teamError) {
          console.error(`Error adding team ${team.name}:`, teamError);
          results.push({
            team: team.name,
            success: false,
            error: teamError.message || 'Unknown error'
          });
        }
      }
      
      // Check results
      const successCount = results.filter(r => r.success).length;
      
      if (successCount === selectedTeams.length) {
        // All teams added successfully
        setSuccessMessage(`Successfully added ${successCount} teams to the tournament`);
        
        // Clear tournament cache to ensure fresh data
        tournamentService.clearCache(`tournament_${tournamentId}`);
        
        if (onSuccess) {
          onSuccess(results);
        }
      } else if (successCount > 0) {
        // Some teams added successfully
        setSuccessMessage(`Added ${successCount} out of ${selectedTeams.length} teams successfully`);
        setError('Some teams could not be added. They may already be in this tournament.');
        
        // Clear tournament cache to ensure fresh data
        tournamentService.clearCache(`tournament_${tournamentId}`);
        
        if (onSuccess) {
          onSuccess(results);
        }
      } else {
        // No teams added successfully
        setError('Failed to add any teams to the tournament. They may already be in this tournament.');
      }
    } catch (err) {
      console.error('Error adding teams to tournament:', err);
      setError(err.response?.data?.error || err.message || 'Failed to add teams to tournament');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-team-to-tournament">
      <h2>Add Teams to Tournament</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}
      
      <TeamSelector 
        onTeamSelect={handleTeamSelect}
        selectedTeams={selectedTeams}
      />
      
      <div className="selected-teams">
        <h3>Selected Teams ({selectedTeams.length})</h3>
        {selectedTeams.length > 0 ? (
          <ul className="selected-teams-list">
            {selectedTeams.map(team => (
              <li key={team.id} className="selected-team-item">
                <span className="team-name">{team.name}</span>
                {team.tag && <span className="team-tag">[{team.tag}]</span>}
                <button 
                  className="remove-btn"
                  onClick={() => handleTeamSelect(team)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-selection">No teams selected</p>
        )}
      </div>
      
      <div className="actions">
        <button 
          className="cancel-btn"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button 
          className="submit-btn"
          onClick={handleSubmit}
          disabled={submitting || selectedTeams.length === 0}
        >
          {submitting ? <><LoadingSpinner size="small" /> Adding Teams...</> : 'Add Teams'}
        </button>
      </div>
    </div>
  );
};

export default AddTeamToTournament;
