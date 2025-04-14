import React, { useState } from 'react';

const PlayerStatsDisplay = ({ playerName = "G0R4N", stats }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [gameMode, setGameMode] = useState('squad-fpp');
  
  // Demo stats if not provided
  const demoStats = {
    overview: {
      'squad-fpp': {
        wins: 8,
        topTen: 68,
        matches: 167,
        kills: 178,
        damage: {
          total: 38209,
          average: 229
        },
        kd: 1.561,
        km: 1.459,
        survivalTime: 39.616
      }
    }
  };
  
  const statsData = stats || demoStats;
  
  return (
    <div className="text-light-100">
      <div className="stats-header">
        <h1 className="text-2xl font-bold">My Season Stats : {playerName}</h1>
        <button className="btn btn-outline text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          COPY PUBLIC SEASON STATS LINK
        </button>
      </div>
      
      <p className="text-light-200 mb-6">These are your statistics for the non-ranked queue of the current season of PUBG.</p>
      
      <div className="flex mb-6 space-x-4">
        <div className="mode-toggle">
          <button 
            className={`mode-toggle-item ${gameMode.includes('fpp') ? 'active' : ''}`}
            onClick={() => setGameMode('squad-fpp')}
          >
            FPP
          </button>
          <button 
            className={`mode-toggle-item ${gameMode.includes('tpp') ? 'active' : ''}`}
            onClick={() => setGameMode('squad-tpp')}
          >
            TPP
          </button>
        </div>
      </div>
      
      <div className="stats-section">
        <h2 className="stats-section-title">SEASON TOTALS</h2>
        
        <div className="stats-container">
          <div className="stats-card">
            <div className="stat-label">WINS</div>
            <div className="stat-value">8</div>
            <div className="stat-subtitle">5%</div>
          </div>
          
          <div className="stats-card">
            <div className="stat-label">TOP 10s</div>
            <div className="stat-value">83</div>
            <div className="stat-subtitle">50%</div>
          </div>
          
          <div className="stats-card">
            <div className="stat-label">MATCHES</div>
            <div className="stat-value">167</div>
            <div className="stat-subtitle"></div>
          </div>
          
          <div className="stats-card">
            <div className="stat-label">KILLS</div>
            <div className="stat-value kills-value">214</div>
            <div className="stat-subtitle">TOTAL</div>
          </div>
          
          <div className="stats-card">
            <div className="stat-label">DAMAGE</div>
            <div className="stat-value damage-value">38,209</div>
            <div className="stat-subtitle">TOTAL</div>
          </div>
          
          <div className="stats-card">
            <div className="stat-label">DAMAGE</div>
            <div className="stat-value damage-value">229</div>
            <div className="stat-subtitle">AVERAGE</div>
          </div>
          
          <div className="stats-card">
            <div className="stat-label">K/D</div>
            <div className="stat-value ratio-value">1.346</div>
            <div className="stat-subtitle">RATIO</div>
          </div>
          
          <div className="stats-card">
            <div className="stat-label">K/M</div>
            <div className="stat-value ratio-value">1.281</div>
            <div className="stat-subtitle">RATIO</div>
          </div>
          
          <div className="stats-card">
            <div className="stat-label">HOURS</div>
            <div className="stat-value survival-value">39.616</div>
            <div className="stat-subtitle">SURVIVED</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="stats-section">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 3a1 1 0 012 0v5.5a.5.5 0 001 0V4a1 1 0 112 0v4.5a.5.5 0 001 0V6a1 1 0 112 0v5a7 7 0 11-14 0V9a1 1 0 012 0v2.5a.5.5 0 001 0V4a1 1 0 012 0v4.5a.5.5 0 001 0V3z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-semibold">DUO-FPP</h3>
            </div>
            <span className="text-sm text-light-200">45 MATCHES PLAYED</span>
          </div>
          
          <div className="stats-tabs mb-4">
            <button 
              className={`stats-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`stats-tab ${activeTab === 'combat' ? 'active' : ''}`}
              onClick={() => setActiveTab('combat')}
            >
              Combat
            </button>
            <button 
              className={`stats-tab ${activeTab === 'survival' ? 'active' : ''}`}
              onClick={() => setActiveTab('survival')}
            >
              Survival
            </button>
            <button 
              className={`stats-tab ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              Recent Matches
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="stats-card">
              <div className="stat-label">WINS</div>
              <div className="stat-value">0</div>
              <div className="stat-subtitle">0.00%</div>
            </div>
            
            <div className="stats-card">
              <div className="stat-label">TOP 10s</div>
              <div className="stat-value">15</div>
              <div className="stat-subtitle">33.333%</div>
            </div>
            
            <div className="stats-card">
              <div className="stat-label">KILLS</div>
              <div className="stat-value kills-value">36</div>
              <div className="stat-subtitle">TOTAL</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="stats-card">
              <div className="stat-label">K/D</div>
              <div className="stat-value ratio-value">0.80</div>
              <div className="stat-subtitle">RATIO</div>
            </div>
            
            <div className="stats-card">
              <div className="stat-label">K/M</div>
              <div className="stat-value ratio-value">0.80</div>
              <div className="stat-subtitle">RATIO</div>
            </div>
            
            <div className="stats-card">
              <div className="stat-label">DAMAGE</div>
              <div className="stat-value damage-value">175.86</div>
              <div className="stat-subtitle">AVG</div>
            </div>
          </div>
        </div>
        
        <div className="stats-section">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <h3 className="text-lg font-semibold">SQUAD-FPP</h3>
            </div>
            <span className="text-sm text-light-200">122 MATCHES PLAYED</span>
          </div>
          
          <div className="stats-tabs mb-4">
            <button 
              className={`stats-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              className={`stats-tab ${activeTab === 'combat' ? 'active' : ''}`}
              onClick={() => setActiveTab('combat')}
            >
              Combat
            </button>
            <button 
              className={`stats-tab ${activeTab === 'survival' ? 'active' : ''}`}
              onClick={() => setActiveTab('survival')}
            >
              Survival
            </button>
            <button 
              className={`stats-tab ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              Recent Matches
            </button>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="stats-card">
              <div className="stat-label">WINS</div>
              <div className="stat-value">8</div>
              <div className="stat-subtitle">6.557%</div>
            </div>
            
            <div className="stats-card">
              <div className="stat-label">TOP 10s</div>
              <div className="stat-value">68</div>
              <div className="stat-subtitle">55.738%</div>
            </div>
            
            <div className="stats-card">
              <div className="stat-label">KILLS</div>
              <div className="stat-value kills-value">178</div>
              <div className="stat-subtitle">TOTAL</div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="stats-card">
              <div className="stat-label">K/D</div>
              <div className="stat-value ratio-value">1.561</div>
              <div className="stat-subtitle">RATIO</div>
            </div>
            
            <div className="stats-card">
              <div className="stat-label">K/M</div>
              <div className="stat-value ratio-value">1.459</div>
              <div className="stat-subtitle">RATIO</div>
            </div>
            
            <div className="stats-card">
              <div className="stat-label">DAMAGE</div>
              <div className="stat-value damage-value">248.319</div>
              <div className="stat-subtitle">AVG</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsDisplay;