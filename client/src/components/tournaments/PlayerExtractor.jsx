import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../common/LoadingSpinner';
import PlayerAssignment from './PlayerAssignment';
import './PlayerExtractor.css';

/**
 * Component for extracting player data from matches and assigning to teams
 */
const PlayerExtractor = ({ matchId, onComplete }) => {
  const { id: tournamentId } = useParams();
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  
  // Load match details
  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (!matchId) return;
      
      setLoading(true);
      try {
        const response = await axios.get(`/api/matches/${matchId}`);
        setMatchDetails(response.data);
      } catch (err) {
        console.error('Error loading match details:', err);
        setError(`Failed to load match details: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMatchDetails();
  }, [matchId]);
  
  // Extract players from match
  const handleExtractPlayers = async () => {
    setExtracting(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `/api/tournaments/${tournamentId}/matches/${matchId}/extract-players`
      );
      
      setResults(response.data.data);
      
      if (onComplete) {
        onComplete(response.data.data);
      }
    } catch (err) {
      console.error('Error extracting players:', err);
      setError(err.response?.data?.error || err.message || 'Failed to extract player data');
    } finally {
      setExtracting(false);
    }
  };
  
  // Handle assignment completion
  const handleAssignmentComplete = (assignmentResults) => {
    setShowAssignment(false);
    
    // Update results to reflect assignments
    if (results) {
      const updatedResults = { ...results };
      
      // Move assigned players from "new" to "updated"
      updatedResults.new = updatedResults.new.filter(
        player => !assignmentResults.assigned.includes(player.pubg_id)
      );
      
      setResults(updatedResults);
    }
    
    if (onComplete) {
      onComplete(assignmentResults);
    }
  };
  
  if (loading) {
    return (
      <div className="player-extractor loading">
        <LoadingSpinner />
        <p>Loading match details...</p>
      </div>
    );
  }
  
  if (!matchDetails) {
    return (
      <div className="player-extractor error">
        <div className="error-container">
          {error || 'Failed to load match details'}
        </div>
      </div>
    );
  }
  
  if (showAssignment && results?.new?.length > 0) {
    return (
      <PlayerAssignment 
        players={results.new} 
        onAssigned={handleAssignmentComplete}
        onCancel={() => setShowAssignment(false)}
      />
    );
  }
  
  return (
    <div className="player-extractor">
      <h3>Extract Player Data</h3>
      
      {error && <div className="error-message">{error}</div>}
      
      {results ? (
        <div className="extraction-results">
          <div className="success-message">
            Player data extracted successfully!
          </div>
          
          <div className="results-stats">
            <div className="stats-container">
              <div className="updated-players">
                <h4>Updated Players: {results.updated.length}</h4>
                {results.updated.length > 0 ? (
                  <div className="players-list">
                    {results.updated.slice(0, 5).map(player => (
                      <div key={player.pubg_id} className="player-item">
                        <span className="player-name">{player.pubg_name}</span>
                        <span className="player-id">{player.pubg_id.substring(0, 12)}...</span>
                      </div>
                    ))}
                    {results.updated.length > 5 && (
                      <div className="more-players">
                        + {results.updated.length - 5} more players
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="no-players">No existing players were updated</p>
                )}
              </div>
              
              <div className="new-players">
                <h4>New Players: {results.new.length}</h4>
                {results.new.length > 0 ? (
                  <>
                    <div className="players-list">
                      {results.new.slice(0, 5).map(player => (
                        <div key={player.pubg_id} className="player-item">
                          <span className="player-name">{player.pubg_name}</span>
                          <span className="player-id">{player.pubg_id.substring(0, 12)}...</span>
                        </div>
                      ))}
                      {results.new.length > 5 && (
                        <div className="more-players">
                          + {results.new.length - 5} more players
                        </div>
                      )}
                    </div>
                    <div className="assignment-prompt">
                      <p>These players were found in the match but are not assigned to teams.</p>
                      <button 
                        className="assign-btn"
                        onClick={() => setShowAssignment(true)}
                      >
                        Assign Players to Teams
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="no-players">No new players found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="extraction-actions">
          <div className="match-info">
            <div className="match-id">Match ID: {matchId}</div>
            <div className="match-date">
              Date: {new Date(matchDetails.data?.attributes?.createdAt).toLocaleString()}
            </div>
            <div className="match-map">Map: {matchDetails.data?.attributes?.mapName}</div>
          </div>
          
          <p className="extraction-info">
            Extract player data from this match to update information about participating players.
            This will:
          </p>
          <ul>
            <li>Update existing player statistics</li>
            <li>Identify new players from the match data</li>
            <li>Allow you to assign new players to teams</li>
          </ul>
          <button
            className="extract-btn"
            onClick={handleExtractPlayers}
            disabled={extracting}
          >
            {extracting ? <><LoadingSpinner size="small" /> Extracting Data...</> : 'Extract Player Data'}
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerExtractor;
