import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import matchesService from '../../services/matchesServiceEnhanced'; // Changed to enhanced service
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { getMatchType, getMatchTypeClass, formatMatchDate, getRelativeTime } from '../../utils/matchUtils';
import '../../styles/matches.css';

const MatchSearch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const tournamentId = urlParams.get('tournamentId');
  
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selectedMatches, setSelectedMatches] = useState([]);
  
  // Form state
  const [searchForm, setSearchForm] = useState({
    playerName: '',
    platform: 'steam',
    timeRange: '24h',
    gameMode: 'all',
    mapName: 'all',
    customMatchOnly: true,
    useEnhancedMode: true // Added enhanced mode flag
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
      // Updated error handling and timeout
      const response = await matchesService.searchMatches(searchForm);
      setMatches(response.data);
    } catch (err) {
      console.error('Error searching matches:', err);
      
      // Enhanced error messaging
      let errorMessage = 'Failed to search matches';
      
      if (err.message.includes('ECONNRESET') || err.message.includes('reset by server')) {
        errorMessage = 'Connection issue with PUBG API. Please try again with fewer results or a more specific search.';
      } else if (err.message.includes('timeout')) {
        errorMessage = 'Search timed out. Please try a more specific search with fewer results.';
      } else if (err.message.includes('rate limit')) {
        errorMessage = 'PUBG API rate limit reached. Please wait a moment and try again.';
      } else if (err.message.includes('Authentication')) {
        errorMessage = 'Authentication required. Please log in and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setSearching(false);
    }
  };
  
  // Handle match selection
  const handleMatchSelection = (matchId) => {
    if (selectedMatches.includes(matchId)) {
      setSelectedMatches(selectedMatches.filter(id => id !== matchId));
    } else {
      setSelectedMatches([...selectedMatches, matchId]);
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
  
  // Handle adding selected matches to tournament
  const addMatchesToTournament = async () => {
    if (!tournamentId || selectedMatches.length === 0) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Use matchesService.registerMatch or a similar method here
      const response = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          matchIds: selectedMatches,
          stage: 'group' // Default to group stage
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add matches');
      }
      
      // Redirect to tournament page
      navigate(`/tournaments/${tournamentId}`);
    } catch (err) {
      console.error('Error adding matches to tournament:', err);
      
      // Enhanced error messaging for tournament operations
      let errorMessage = 'Failed to add matches to tournament';
      
      if (err.message.includes('Authentication') || err.message.includes('token')) {
        errorMessage = 'Authentication required. Please log in again and try adding the matches.';
      } else if (err.message.includes('permission') || err.message.includes('not authorized')) {
        errorMessage = 'You do not have permission to add matches to this tournament.';
      } else if (err.message.includes('already registered') || err.message.includes('duplicate')) {
        errorMessage = 'One or more matches are already registered to a tournament.';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };
  
  return (
    <div className="match-search-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Find Custom Matches</h1>
          {tournamentId && (
            <div className="tournament-context">
              Adding matches to tournament
            </div>
          )}
        </div>
        
        {/* Enhanced Mode Toggle */}
        <div className="enhanced-mode-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              name="useEnhancedMode"
              checked={searchForm.useEnhancedMode}
              onChange={() => 
                setSearchForm(prev => ({ 
                  ...prev, 
                  useEnhancedMode: !prev.useEnhancedMode 
                }))
              }
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">
            {searchForm.useEnhancedMode ? 'Enhanced Search Mode' : 'Standard Search Mode'}
          </span>
          <span className="toggle-help">
            {searchForm.useEnhancedMode ? 
              'Using improved error handling and rate limiting' : 
              'Using standard search (may experience timeouts)'}
          </span>
        </div>
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
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
            <p className="search-status">This may take a moment as we carefully query the PUBG API...</p>
          </div>
        ) : matches.length > 0 ? (
          <div className="results-section">
            <div className="results-header">
              <h2>Search Results</h2>
              <p>{matches.length} matches found</p>
              
              {tournamentId && selectedMatches.length > 0 && (
                <button 
                  className="btn-primary"
                  onClick={addMatchesToTournament}
                  disabled={loading}
                >
                  {loading ? 'Adding...' : `Add ${selectedMatches.length} Matches to Tournament`}
                </button>
              )}
            </div>
            
            <div className="matches-list">
              {matches.map(match => {
                const matchId = match.data.id;
                const matchData = match.data.attributes;
                // Get match type from meta or determine it from attributes
                const matchType = match.meta?.matchType || getMatchType(match);
                const isRegistered = match.meta?.isRegistered || false;
                const isSelected = selectedMatches.includes(matchId);
                
                return (
                  <div 
                    key={matchId} 
                    className={`match-card ${getMatchTypeClass(matchType)} ${isRegistered ? 'registered' : ''} ${isSelected ? 'selected' : ''}`}
                  >
                    {tournamentId && !isRegistered && (
                      <div className="match-select">
                        <input
                          type="checkbox"
                          id={`select-${matchId}`}
                          checked={isSelected}
                          onChange={() => handleMatchSelection(matchId)}
                        />
                      </div>
                    )}
                    
                    <div className="match-info">
                      <div className="match-meta">
                        <span className="match-id">ID: {matchId.substring(0, 8)}...</span>
                        <span className="match-date" title={formatMatchDate(matchData.createdAt)}>{getRelativeTime(matchData.createdAt)}</span>
                      </div>
                      
                      <div className="match-details">
                        <div className="match-map">
                          <strong>Map:</strong> {getMapName(matchData.mapName)}
                        </div>
                        <div className="match-mode">
                          <strong>Mode:</strong> {getGameMode(matchData.gameMode)}
                        </div>
                        <div className="match-players">
                          <strong>Players:</strong> {matchData.playerCount || 'Unknown'}
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
                  <li>Choose a narrower time range if you know when the match occurred</li>
                  <li>Filter by game mode and map if known</li>
                  <li>The enhanced search mode is more reliable but returns fewer initial results</li>
                </ul>
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default MatchSearch;
