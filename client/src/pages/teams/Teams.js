import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/teams');
        setTeams(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load teams. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  // Handle search
  const handleSearch = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/teams?search=${searchTerm}`);
      setTeams(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error searching teams:', err);
      setError('Failed to search teams. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle key press in search input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="teams-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Teams</h1>
          <Link to="/teams/create" className="btn btn-primary">Create Team</Link>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className="btn btn-secondary" onClick={handleSearch}>
            Search
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : teams.length > 0 ? (
          <div className="teams-grid">
            {teams.map(team => (
              <div key={team.id} className="team-card">
                <div className="team-logo">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={`${team.name} logo`} />
                  ) : (
                    <div className="team-logo-placeholder">
                      {team.tag || team.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="team-info">
                  <h2 className="team-name">
                    {team.tag && <span className="team-tag">[{team.tag}]</span>} {team.name}
                  </h2>
                  <p className="team-details">
                    Created: {new Date(team.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="team-actions">
                  <Link to={`/teams/${team.id}`} className="btn btn-secondary">
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-teams-message">
            <p>No teams found.</p>
            <p>
              <Link to="/teams/create" className="text-link">
                Create your first team
              </Link> to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Teams;
