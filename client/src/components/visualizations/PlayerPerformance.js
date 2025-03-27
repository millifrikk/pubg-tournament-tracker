import React from 'react';

// Mock implementation of a player performance component
const PlayerPerformance = ({ matchId, accountId }) => {
  return (
    <div className="player-performance-container">
      <div className="performance-placeholder">
        <h3>Player Performance</h3>
        <p>Performance visualization for player ID: {accountId}</p>
        <p>Match ID: {matchId}</p>
        <p>This is a placeholder for the player performance visualization.</p>
      </div>
    </div>
  );
};

export default PlayerPerformance;