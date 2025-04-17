import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../common/LoadingSpinner';
import './TournamentMatchSearch.css';

/**
 * Component for searching for matches played by players in a tournament
 */
const TournamentMatchSearch = ({ onMatchSelect }) => {
  const { id: tournamentId } = useParams();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [error, setError] = useState(null);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchParams, setSearchParams] = useState({
    platform: 'steam',
    timeRange: '24h'
  });
  
  // Handle search submission
  const handleSearch = async () => {
    setSearching(true);
    setError(null);
    
    try {
      const response = await axios.post(`/api/tournaments/${tournamentId}/matches/search`, searchParams);
      setSearchResults(response.data.data || []);
      setHasSearched(true);
      console.log('Search results:', response.data);
    } catch (err) {
      console.error('Error searching for matches:', err);
      setError(err.response?.data?.error || err.message || 'Failed to search for matches');
    } finally {
      setSearching(false);
    }
  };
  
  // Handle match selection
  const handleMatchSelect = (match) => {
    if (onMatchSelect) {
      onMatchSelect(match);
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
    <div className="tournament-match-search">
      <div className="search-form">
        <h3>Search for Matches Played by Tournament Teams</h3>
        <p className="search-info">
          This will search for matches played by players registered in the tournament teams.
        </p>
        
        <div className="form-group">
          <label htmlFor="platform">Platform</label>
          <select
            id="platform"
            value={searchParams.platform}
            onChange={(e) => setSearchParams(prev => ({ ...prev, platform: e.target.value }))}
          >
            <option value="steam">Steam</option>
            <option value="psn">PlayStation</option>
            <option value="xbox">Xbox</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="timeRange">Time Range</label>
          <select
            id="timeRange"
            value={searchParams.timeRange}
            onChange={(e) => setSearchParams(prev => ({ ...prev, timeRange: e.target.value }))}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="48h">Last 48 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="14d">Last 14 Days</option>
          </select>
        </div>
        
        <button 
          className="search-btn"
          onClick={handleSearch}
          disabled={searching}
        >
          {searching ? <><LoadingSpinner size="small" /> Searching...</> : 'Search Matches'}
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="search-results">
        {hasSearched && (
          <>
            <h3>Search Results ({searchResults.length} matches)</h3>
            
            {searchResults.length === 0 ? (
              <div className="no-results">
                <p>No matches found. Try adjusting your search parameters or adding more players to your tournament teams.</p>
                <div className="suggestions">
                  <h4>Suggestions:</h4>
                  <ul>
                    <li>Increase the time range to search further back</li>
                    <li>Ensure players are correctly added to teams with accurate PUBG names</li>
                    <li>Try searching on a different platform if players play on multiple platforms</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="match-list">
                {searchResults.map(match => (
                  <div key={match.data.id} className="match-item">
                    <div className="match-info">
                      <div className="match-header">
                        <span className="match-date">{formatDate(match.data.attributes.createdAt)}</span>
                        <span className={`match-type ${match.meta?.matchType?.toLowerCase() || 'public'}`}>
                          {match.meta?.matchType || 'Public'}
                        </span>
                      </div>
                      
                      <div className="match-details">
                        <div className="match-map">
                          <span className="label">Map:</span> 
                          <span className="value">{getMapName(match.data.attributes.mapName)}</span>
                        </div>
                        
                        <div className="match-mode">
                          <span className="label">Mode:</span> 
                          <span className="value">{match.data.attributes.gameMode}</span>
                        </div>
                        
                        {match.meta?.searchedPlayerCount && (
                          <div className="match-players">
                            <span className="label">Players Found:</span> 
                            <span className="value">{match.meta.searchedPlayerCount}</span>
                            <span className="coverage">({match.meta.playerCoverage}%)</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="match-id">ID: {match.data.id.substring(0, 8)}...</div>
                    </div>
                    
                    <button
                      className="select-btn"
                      onClick={() => handleMatchSelect(match)}
                    >
                      Select Match
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TournamentMatchSearch;
