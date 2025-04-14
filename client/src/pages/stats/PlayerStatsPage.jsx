import React from 'react';
import DarkLayout from '../../components/layout/DarkLayout';
import PlayerStatsDisplay from '../../components/stats/PlayerStatsDisplay';

const PlayerStatsPage = () => {
  return (
    <DarkLayout>
      <div className="mb-8">
        <PlayerStatsDisplay playerName="G0R4N" />
      </div>
    </DarkLayout>
  );
};

export default PlayerStatsPage;