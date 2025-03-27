import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentApi } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        const response = await tournamentApi.getAllTournaments();
        setTournaments(response.data.data);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
        setError('Failed to load tournaments');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTournaments();
  }, []);
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className="tournaments-page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Tournaments</h1>
          <Link to="/tournaments/create" className="btn btn-primary">Create Tournament</Link>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        {tournaments.length === 0 ? (
          <div className="empty-state">
            <p>No tournaments found. Create your first tournament to get started.</p>
            <Link to="/tournaments/create" className="btn btn-primary">Create Tournament</Link>
          </div>
        ) : (
          <div className="tournaments-grid">
            {tournaments.map(tournament => (
              <div key={tournament.id} className="tournament-card">
                <h2>{tournament.name}</h2>
                <div className="tournament-dates">
                  <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
                  <span> to </span>
                  <span>{new Date(tournament.end_date).toLocaleDateString()}</span>
                </div>
                <p className="tournament-format">{tournament.format} | {tournament.scoring_system}</p>
                {tournament.description && (
                  <p className="tournament-description">{tournament.description}</p>
                )}
                <Link to={`/tournaments/${tournament.id}`} className="btn btn-outline">View Details</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tournaments;
