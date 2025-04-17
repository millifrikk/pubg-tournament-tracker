import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../common/LoadingSpinner';
import './PlayerAssignment.css';

/**
 * Component for assigning players to teams within a tournament
 */
const PlayerAssignment = ({ players, onAssigned, onCancel }) => {
  const { id: tournamentId } = useParams();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignments, setAssignments] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  
  // Fetch tournament teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await axios.get(`/api/tournaments/${tournamentId}/teams`);
        setTeams(response.data.data || []);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load tournament teams');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeams();
  }, [tournamentId]);
  
  // Initialize assignments object
  useEffect(() => {
    if (players && players.length) {
      const initialAssignments = {};
      players.forEach(player => {
        initialAssignments[player.pubg_id] = '';
      });
      setAssignments(initialAssignments);
    }
  }, [players]);
  
  // Handle assignment change
  const handleAssignmentChange = (playerId, teamId) => {
    setAssignments(prev => ({
      ...prev,
      [playerId]: teamId
    }));
  };
  
  // Check if at least one assignment is made
  const hasAssignments = () => {
    return Object.values(assignments).some(teamId => teamId !== '');
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate that at least one player is assigned
    if (!hasAssignments()) {
      setError('Please assign at least one player to a team');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Create array of assignments
      const assignmentData = Object.entries(assignments)
        .filter(([_, teamId]) => teamId) // Only include assignments with a selected team
        .map(([playerId, teamId]) => ({
          pubg_id: playerId,
          team_id: teamId
        }));
      
      // Submit assignments
      const response = await axios.post('/api/players/assign-to-teams', {
        assignments: assignmentData
      });
      
      setSuccessCount(response.data.assigned?.length || 0);
      
      if (onAssigned) {
        onAssigned({
          assigned: response.data.assigned || [],
          errors: response.data.errors || []
        });
      }
    } catch (err) {
      console.error('Error assigning players:', err);
      setError(err.response?.data?.error || err.message || 'Failed to assign players to teams');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="player-assignment loading">
        <LoadingSpinner />
        <p>Loading teams...</p>
      </div>
    );
  }
  
  if (error && teams.length === 0) {
    return (
      <div className="player-assignment error">
        <div className="error-container">
          {error}
        </div>
        <button className="cancel-btn" onClick={onCancel}>
          Back
        </button>
      </div>
    );
  }
  
  if (teams.length === 0) {
    return (
      <div className="player-assignment error">
        <div className="error-container">
          No teams found in this tournament. Please add teams first.
        </div>
        <button className="cancel-btn" onClick={onCancel}>
          Back
        </button>
      </div>
    );
  }
  
  if (!players || players.length === 0) {
    return (
      <div className="player-assignment error">
        <div className="error-container">
          No players to assign
        </div>
        <button className="cancel-btn" onClick={onCancel}>
          Back
        </button>
      </div>
    );
  }
  
  return (
    <div className="player-assignment">
      <h3>Assign Players to Teams</h3>
      
      {error && <div className="error-message">{error}</div>}
      
      {successCount > 0 && (
        <div className="success-message">
          Successfully assigned {successCount} players to teams!
        </div>
      )}
      
      <div className="assignment-container">
        <p className="instructions">
          Select teams for the players discovered in the match:
        </p>
        
        <table className="assignment-table">
          <thead>
            <tr>
              <th>Player Name</th>
              <th>PUBG ID</th>
              <th>Assign to Team</th>
            </tr>
          </thead>
          <tbody>
            {players.map(player => (
              <tr key={player.pubg_id}>
                <td className="player-name">{player.pubg_name}</td>
                <td className="pubg-id">{player.pubg_id.substring(0, 16)}...</td>
                <td>
                  <select
                    value={assignments[player.pubg_id] || ''}
                    onChange={(e) => handleAssignmentChange(player.pubg_id, e.target.value)}
                    className={assignments[player.pubg_id] ? 'has-selection' : ''}
                  >
                    <option value="">-- Select Team --</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="assignment-actions">
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
          disabled={submitting || !hasAssignments()}
        >
          {submitting ? <><LoadingSpinner size="small" /> Assigning Players...</> : 'Assign Players'}
        </button>
      </div>
    </div>
  );
};

export default PlayerAssignment;
