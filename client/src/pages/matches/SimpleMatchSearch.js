import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import matchesServiceEnhanced from '../../services/matchesServiceEnhanced';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getMatchType, getMatchTypeClass, formatMatchDate, getRelativeTime } from '../../utils/matchUtils';
import '../../styles/matches.css';

const SimpleMatchSearch = ({ matchesService = matchesServiceEnhanced }) => {
  
  // Load saved state from sessionStorage on mount
  useEffect(() => {
    try {
      // Check if we have a saved search state
      const savedState = sessionStorage.getItem('lastMatchSearch');
      if (savedState) {
        const { searchForm: savedForm, matches: savedMatches, timestamp } = JSON.parse(savedState);
        
        // Only restore if the saved state is relatively fresh (within the last hour)
        const isStateFresh = Date.now() - timestamp < 3600000; // 1 hour
        
        if (isStateFresh) {
          console.log('Restoring previous search state');
          setSearchForm(savedForm);
          setMatches(savedMatches);
        }
      }
    } catch (error) {
      console.error('Error restoring search state:', error);
      // Silently fail - just use default state
    }
  }, []);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  
  // Form state
  const [searchForm, setSearchForm] = useState({
    playerName: '',
    platform: 'steam',
    timeRange: '24h',
    gameMode: 'all',
    mapName: 'all',
    customMatchOnly: true
  });
  
  // Platform options
  const platforms = [
    { value: 'steam', label: 'Steam (PC)' },
    { value: 'psn', label: 'PlayStation' },
    { value: 'xbox', label: 'Xbox' }
  ];
  
  // Time range options
  const timeRanges = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '48h', label: 'Last 48 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '14d', label: 'Last 14 days' }
  ];
  
  // Game mode options
  const gameModes = [
    { value: 'all', label: 'All Modes' },
    { value: 'squad', label: 'Squad' },
    { value: 'squad-fpp', label: 'Squad (FPP)' },
    { value: 'duo', label: 'Duo' },
    { value: 'duo-fpp', label: 'Duo (FPP)' },
    { value: 'solo', label: 'Solo' },
    { value: 'solo-fpp', label: 'Solo (FPP)' }
  ];
  
  // Map options
  const maps = [
    { value: 'all', label: 'All Maps' },
    { value: 'Baltic_Main', label: 'Erangel' },
    { value: 'Desert_Main', label: 'Miramar' },
    { value: 'Savage_Main', label: 'Sanhok' },
    { value: 'DihorOtok_Main', label: 'Vikendi' },
    { value: 'Tiger_Main', label: 'Taego' },
    { value: 'Kiki_Main', label: 'Deston' }
  ];
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSearchForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle search form submission
  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    setError(null);
    setMatches([]);
    
    try {
      // Use enhanced service with better reliability
      const response = await matchesService.searchMatches(searchForm);
      setMatches(response.data);
      
      // Save search state to sessionStorage
      sessionStorage.setItem('lastMatchSearch', JSON.stringify({
        searchForm,
        matches: response.data,
        timestamp: Date.now()
      }));
      
      // Log the source of the data (for debugging)
      if (response.meta && response.meta.source) {
        console.log(`Match data source: ${response.meta.source}`);
      }
    } catch (err) {
      console.error('Error searching matches:', err);
      setError(err.message || 'Failed to search matches');
    } finally {
      setSearching(false);
    }
  };
  
  // Get readable map name
  const getMapName = (mapId) => {
    const map = maps.find(m => m.value === mapId);
    return map ? map.label : mapId;
  };
  
  // Get readable game mode
  const getGameMode = (modeId) => {
    const mode = gameModes.find(m => m.value === modeId);
    return mode ? mode.label : modeId;
  };
  
  // Handle error dismissal
  const dismissError = () => {
    setError(null);
  };
  
  return (
    <div className="match-search-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Find Custom Matches</h1>
          <div className="subtitle">Enhanced Mode</div>
        </div>
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button className="btn-secondary" onClick={dismissError}>Dismiss</button>
          </div>
        )}
        
        <div className="search-section">
          <h2>Search Criteria</h2>
          <form onSubmit={handleSearch} className="search-form">
            <div className="form-group">
              <label htmlFor="playerName">Player Name</label>
              <input
                type="text"
                id="playerName"
                name="playerName"
                value={searchForm.playerName}
                onChange={handleInputChange}
                placeholder="Enter PUBG player name"
              />
              <p className="help-text">
                Enter a player name to find matches they participated in
              </p>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="platform">Platform</label>
                <select
                  id="platform"
                  name="platform"
                  value={searchForm.platform}
                  onChange={handleInputChange}
                >
                  {platforms.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="timeRange">Time Range</label>
                <select
                  id="timeRange"
                  name="timeRange"
                  value={searchForm.timeRange}
                  onChange={handleInputChange}
                >
                  {timeRanges.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="gameMode">Game Mode</label>
                <select
                  id="gameMode"
                  name="gameMode"
                  value={searchForm.gameMode}
                  onChange={handleInputChange}
                >
                  {gameModes.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="mapName">Map</label>
                <select
                  id="mapName"
                  name="mapName"
                  value={searchForm.mapName}
                  onChange={handleInputChange}
                >
                  {maps.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group checkbox-group">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    id="customMatchOnly"
                    name="customMatchOnly"
                    checked={searchForm.customMatchOnly}
                    onChange={handleInputChange}
                  />
                  <span className="checkbox-label">Custom Match Only</span>
                </label>
                <p className="help-text">
                  Only show matches that are likely to be custom/tournament matches
                </p>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={searching}>
                {searching ? 'Searching...' : 'Search Matches'}
              </button>
            </div>
          </form>
        </div>
        
        {searching ? (
          <div className="searching-indicator">
            <LoadingSpinner />
            <p>Searching for matches...</p>
            <small>Using enhanced search with improved error handling...</small>
          </div>
        ) : matches.length > 0 ? (
          <div className="results-section">
            <div className="results-header">
              <h2>Search Results</h2>
              <p>{matches.length} matches found</p>
            </div>
            
            <div className="matches-list">
              {matches.map(match => {
                const matchId = match.data.id;
                const matchData = match.data.attributes;
                // Get match type from meta or determine it from attributes
                const matchType = match.meta?.matchType || getMatchType(match);
                const isRegistered = match.meta?.isRegistered || false;
                
                return (
                  <div 
                    key={matchId} 
                    className={`match-card ${getMatchTypeClass(matchType)} ${isRegistered ? 'registered' : ''}`}
                  >
                    <div className="match-info">
                      <div className="match-meta">
                        <span className="match-id">ID: {matchId.substring(0, 8)}...</span>
                        <span className="match-date" title={formatMatchDate(matchData.createdAt)}>
                          {getRelativeTime(matchData.createdAt)}
                        </span>
                      </div>
                      
                      <div className="match-details">
                        <div className="match-map">
                          <strong>Map:</strong> {getMapName(matchData.mapName)}
                        </div>
                        <div className="match-mode">
                          <strong>Mode:</strong> {getGameMode(matchData.gameMode)}
                        </div>
                        <div className="match-players">
                          <strong>Players:</strong> {matchData.playerCount || "Unknown"}
                        </div>
                      </div>
                      
                      {matchType !== 'PUBLIC' && (
                        <div className={`match-type-indicator ${matchType.toLowerCase()}-indicator`}>
                          <span className="badge">{matchType} Match</span>
                          {matchType === 'CUSTOM' && match.meta.verificationScore && (
                            <span className="verification-score">
                              {match.meta.verificationScore}% match
                            </span>
                          )}
                        </div>
                      )}
                      
                      {isRegistered && (
                        <div className="registered-indicator">
                          <span className="badge">Registered</span>
                          {match.meta.verified && (
                            <span className="verified-badge">Verified</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="match-actions">
                      <Link to={`/matches/${matchId}`} className="btn-secondary">
                        View Details
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          !searching && (
            <div className="no-results">
              <p>Search for matches by entering a player name and using the filters above.</p>
              <p className="search-tips">
                <strong>Tips:</strong>
                <ul>
                  <li>Enter the name of a player who participated in the custom match</li>
                  <li>Try limiting your search to the past 24 hours for faster results</li>
                  <li>This enhanced search mode includes better error handling and retry logic</li>
                  <li>The enhanced mode will attempt to retrieve data even if the API has connection issues</li>
                </ul>
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SimpleMatchSearch;