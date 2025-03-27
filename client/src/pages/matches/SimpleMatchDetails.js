import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import RenderCounter from '../../components/debug/RenderCounter';
import '../../styles/matchDetails.css';

/**
 * A simplified version of MatchDetails to isolate the blinking issue
 * This version completely bypasses the match service and caching
 */
const SimpleMatchDetails = () => {
  console.log('SimpleMatchDetails rendering');
  const { id: matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch data directly without using the matchesService
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log(`Fetching match data for: ${matchId}`);
        
        // Direct API call to bypass all services and caching
        const response = await axios.get(`/api/matches/${matchId}?platform=steam`);
        console.log('Match data fetched successfully');
        
        setMatch(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching match data:', err);
        setError(err.message || 'Failed to load match data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Clean up function
    return () => {
      console.log('SimpleMatchDetails unmounting');
    };
  }, [matchId]); // Only depend on matchId

  // Render loading state
  if (loading) {
    return (
      <div className="match-details-page">
        <div className="container">
          <h1 className="page-title">Match Details (Simple)</h1>
          <div className="loading-container">Loading match data...</div>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="match-details-page">
        <div className="container">
          <h1 className="page-title">Match Details (Simple)</h1>
          <div className="error-container">
            <h2>Error Loading Match</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Render empty state
  if (!match) {
    return (
      <div className="match-details-page">
        <div className="container">
          <h1 className="page-title">Match Details (Simple)</h1>
          <div className="error-container">Match not found</div>
        </div>
      </div>
    );
  }
  
  // Extract basic match details
  const matchData = match.data || {};
  const matchAttributes = matchData.attributes || {};
  const mapName = matchAttributes.mapName || 'Unknown Map';
  const gameMode = matchAttributes.gameMode || 'Unknown Mode';
  
  // Participants and rosters
  const participants = match.included?.filter(item => item.type === 'participant') || [];
  const rosters = match.included?.filter(item => item.type === 'roster') || [];
  
  return (
    <div className="match-details-page">
      <div className="container">
        <div className="match-header">
          <div className="header-content">
            <h1 className="page-title">Match Details (Simple)</h1>
          </div>
          <div className="match-meta">
            <div className="match-id">ID: {matchId}</div>
            <div className="match-info">
              <span className="match-map"><strong>Map:</strong> {mapName}</span>
              <span className="match-mode"><strong>Mode:</strong> {gameMode}</span>
            </div>
          </div>
        </div>
        
        {/* Simple match overview */}
        <div className="match-overview">
          {/* Debugging component */}
          <RenderCounter />
          
          <div className="summary-stats">
            <div className="summary-stat">
              <div className="stat-label">Total Players</div>
              <div className="stat-value">{participants.length || 0}</div>
            </div>
            <div className="summary-stat">
              <div className="stat-label">Total Teams</div>
              <div className="stat-value">{rosters.length || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleMatchDetails;