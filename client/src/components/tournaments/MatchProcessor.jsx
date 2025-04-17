import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../common/LoadingSpinner';
import './MatchProcessor.css';

/**
 * Component for processing match results and calculating points
 */
const MatchProcessor = ({ matchId, onProcessingComplete }) => {
  const { id: tournamentId } = useParams();
  const [processing, setProcessing] = useState(false);
  const [processedResults, setProcessedResults] = useState(null);
  const [error, setError] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  
  // Load match details
  useEffect(() => {
    const fetchMatchDetails = async () => {
      if (!matchId) return;
      
      setLoadingMatch(true);
      try {
        const response = await axios.get(`/api/matches/${matchId}`);
        setMatchDetails(response.data);
      } catch (err) {
        console.error('Error loading match details:', err);
        setError(`Failed to load match details: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoadingMatch(false);
      }
    };
    
    fetchMatchDetails();
  }, [matchId]);
  
  // Process match results
  const handleProcessMatch = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `/api/tournaments/${tournamentId}/matches/${matchId}/process`,
        { platform: 'steam' }
      );
      
      setProcessedResults(response.data.data);
      
      if (onProcessingComplete) {
        onProcessingComplete(response.data.data);
      }
    } catch (err) {
      console.error('Error processing match:', err);
      setError(err.response?.data?.error || err.message || 'Failed to process match results');
    } finally {
      setProcessing(false);
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
  
  if (loadingMatch) {
    return (
      <div className="match-processor loading">
        <LoadingSpinner />
        <p>Loading match details...</p>
      </div>
    );
  }
  
  if (!matchDetails) {
    return (
      <div className="match-processor error">
        <div className="error-container">
          {error || 'Failed to load match details'}
        </div>
      </div>
    );
  }
  
  return (
    <div className="match-processor">
      <div className="match-header">
        <h3>Process Match Results</h3>
        <div className="match-meta">
          <div className="match-id">Match ID: {matchId}</div>
          <div className="match-map">Map: {getMapName(matchDetails.data?.attributes?.mapName)}</div>
          <div className="match-date">
            Date: {formatDate(matchDetails.data?.attributes?.createdAt)}
          </div>
        </div>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {processedResults ? (
        <div className="processed-results">
          <div className="success-message">
            Match results processed successfully!
          </div>
          <div className="results-summary">
            <div className="teams-matched">
              Teams matched: {processedResults.teams_matched} of {processedResults.teams_total}
            </div>
            <div className="results-table">
              <table>
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Placement</th>
                    <th>Kills</th>
                    <th>Placement Points</th>
                    <th>Kill Points</th>
                    <th>Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {processedResults.results
                    .sort((a, b) => a.placement - b.placement)
                    .map(result => (
                      <tr key={result.team_id}>
                        <td>{result.team_id}</td>
                        <td>{result.placement}</td>
                        <td>{result.kills}</td>
                        <td>{result.placement_points}</td>
                        <td>{result.kill_points}</td>
                        <td className="total-points">{result.total_points}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="process-actions">
          <p className="process-info">
            Process this match to calculate team placements, kills, and points.
            This will:
          </p>
          <ul>
            <li>Extract team results from the match data</li>
            <li>Match players to registered tournament teams</li>
            <li>Calculate points based on the tournament scoring system</li>
            <li>Update the tournament leaderboard</li>
          </ul>
          <button
            className="process-btn"
            onClick={handleProcessMatch}
            disabled={processing}
          >
            {processing ? <><LoadingSpinner size="small" /> Processing Results...</> : 'Process Match Results'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MatchProcessor;
