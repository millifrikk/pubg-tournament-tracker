import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import TournamentMatchSearch from './TournamentMatchSearch';
import tournamentService from '../../services/tournamentService';
import LoadingSpinner from '../common/LoadingSpinner';
import './AddMatchToTournament.css';

/**
 * Component for adding matches to a tournament
 */
const AddMatchToTournament = ({ onSuccess, onCancel }) => {
  const { id: tournamentId } = useParams();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [matchNumber, setMatchNumber] = useState(1);
  const [stage, setStage] = useState('group');
  
  // Handle match selection
  const handleMatchSelect = (match) => {
    setSelectedMatch(match);
    console.log('Selected match:', match);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedMatch) {
      setError('Please select a match');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Prepare match data
      const matchData = {
        matchIds: [selectedMatch.data.id],
        stage: stage,
        matchNumber: matchNumber
      };
      
      console.log('Adding match with data:', matchData);
      
      // Add match to tournament
      const response = await tournamentService.addMatchToTournament(tournamentId, matchData);
      
      console.log('Match added response:', response);
      
      // Clear tournament cache to ensure fresh data
      tournamentService.clearCache(`tournament_${tournamentId}`);
      
      setSuccessMessage(`Successfully added match to the tournament`);
      
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err) {
      console.error('Error adding match to tournament:', err);
      setError(err.response?.data?.error || err.message || 'Failed to add match to tournament');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };
  
  // Get map display name
  const getMapName = (mapId) => {
    const mapNames = {
      'Baltic_Main': 'Erangel',
      'Desert_Main': 'Miramar',
      'Savage_Main': 'Sanhok',
      'DihorOtok_Main': 'Vikendi',
      'Range_Main': 'Camp Jackal',
      'Summerland_Main': 'Karakin',
      'Tiger_Main': 'Taego',
      'Kiki_Main': 'Deston',
      'Chimera_Main': 'Paramo',
      'Heaven_Main': 'Haven'
    };
    
    return mapNames[mapId] || mapId;
  };
  
  return (
    <div className="add-match-to-tournament">
      <h2>Add Match to Tournament</h2>
      
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
      
      {selectedMatch ? (
        <div className="selected-match">
          <h3>Selected Match</h3>
          <div className="match-details">
            <div className="match-header">
              <span className="match-date">{formatDate(selectedMatch.data.attributes.createdAt)}</span>
              <span className={`match-type ${selectedMatch.meta?.matchType?.toLowerCase() || 'public'}`}>
                {selectedMatch.meta?.matchType || 'Public'}
              </span>
            </div>
            
            <div className="match-info-grid">
              <div className="info-item">
                <span className="label">Match ID:</span>
                <span className="value">{selectedMatch.data.id}</span>
              </div>
              
              <div className="info-item">
                <span className="label">Map:</span>
                <span className="value">{getMapName(selectedMatch.data.attributes.mapName)}</span>
              </div>
              
              <div className="info-item">
                <span className="label">Game Mode:</span>
                <span className="value">{selectedMatch.data.attributes.gameMode}</span>
              </div>
              
              {selectedMatch.meta?.searchedPlayerCount && (
                <div className="info-item">
                  <span className="label">Players Found:</span>
                  <span className="value">{selectedMatch.meta.searchedPlayerCount} ({selectedMatch.meta.playerCoverage}%)</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="match-config">
            <div className="form-group">
              <label htmlFor="matchNumber">Match Number</label>
              <input
                type="number"
                id="matchNumber"
                value={matchNumber}
                onChange={(e) => setMatchNumber(parseInt(e.target.value, 10))}
                min="1"
              />
              <div className="help-text">Used for ordering matches in the tournament</div>
            </div>
            
            <div className="form-group">
              <label htmlFor="stage">Tournament Stage</label>
              <select
                id="stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                <option value="group">Group Stage</option>
                <option value="qualifier">Qualifier</option>
                <option value="semifinal">Semi-Final</option>
                <option value="final">Final</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          
          <div className="match-actions">
            <button 
              className="back-btn"
              onClick={() => setSelectedMatch(null)}
              disabled={submitting}
            >
              Back to Search
            </button>
            
            <button 
              className="submit-btn"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <><LoadingSpinner size="small" /> Adding Match...</> : 'Add Match to Tournament'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="instructions">
            Search for matches played by players in this tournament's teams and add them to the tournament.
          </p>
          
          <TournamentMatchSearch onMatchSelect={handleMatchSelect} />
          
          <div className="actions">
            <button 
              className="cancel-btn"
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AddMatchToTournament;
