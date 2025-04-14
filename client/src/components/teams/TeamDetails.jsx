import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import teamService from '../../services/teamService';
import PlayerList from './PlayerList';
import PlayerForm from './PlayerForm';

const TeamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  
  // Fetch team details
  useEffect(() => {
    const fetchTeamDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const teamResponse = await teamService.getTeamById(id);
        setTeam(teamResponse.data);
        
        const playersResponse = await teamService.getTeamPlayers(id);
        setPlayers(playersResponse.data || []);
      } catch (err) {
        console.error('Error fetching team details:', err);
        setError('Failed to load team details');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchTeamDetails();
    }
  }, [id]);
  
  // Handle adding a new player
  const handleAddPlayer = async (playerData) => {
    try {
      setError(null);
      console.log('Adding player with data:', playerData);
      const response = await teamService.addPlayerToTeam(id, playerData);
      
      // Refresh player list after adding a player to ensure we have the latest data
      const playersResponse = await teamService.getTeamPlayers(id);
      setPlayers(playersResponse.data || []);
      
      setShowPlayerForm(false);
    } catch (err) {
      console.error('Error adding player:', err);
      setError('Failed to add player: ' + (err.message || 'Unknown error'));
    }
  };
  
  // Handle removing a player
  const handleRemovePlayer = async (playerId) => {
    try {
      setError(null);
      await teamService.removePlayerFromTeam(id, playerId);
      setPlayers(prev => prev.filter(player => player.id !== playerId));
    } catch (err) {
      console.error('Error removing player:', err);
      setError('Failed to remove player');
    }
  };
  
  // Handle updating a player
  const handleUpdatePlayer = async (playerId, updatedData) => {
    try {
      setError(null);
      const response = await teamService.updatePlayer(playerId, updatedData);
      setPlayers(prev => prev.map(player => 
        player.id === playerId ? response.data : player
      ));
    } catch (err) {
      console.error('Error updating player:', err);
      setError('Failed to update player');
    }
  };
  
  if (loading) {
    return <div className="p-4 text-center text-light-100">Loading team details...</div>;
  }
  
  if (error) {
    return (
      <div className="p-4 bg-dark-400 text-accent-red rounded border border-accent-red border-opacity-50">
        <p>{error}</p>
        <button 
          className="mt-2 btn btn-primary"
          onClick={() => navigate('/teams')}
        >
          Back to Teams
        </button>
      </div>
    );
  }
  
  if (!team) {
    return (
      <div className="p-4 text-center text-light-100">
        <p>Team not found</p>
        <button 
          className="mt-2 btn btn-primary"
          onClick={() => navigate('/teams')}
        >
          Back to Teams
        </button>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-light-100">
          {team.logo_url && (
            <img 
              src={team.logo_url} 
              alt={`${team.name} logo`} 
              className="inline-block h-8 w-8 mr-2"
            />
          )}
          {team.name}
          {team.tag && <span className="ml-2 text-light-200">({team.tag})</span>}
        </h1>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/teams')}
        >
          Back to Teams
        </button>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-light-100">Team Players</h2>
          <button 
            className="px-4 py-2 bg-accent-green text-white rounded"
            onClick={() => setShowPlayerForm(!showPlayerForm)}
          >
            {showPlayerForm ? 'Cancel' : 'Add Player'}
          </button>
        </div>
        
        {showPlayerForm && (
          <div className="mb-4 p-4 bg-dark-400 rounded border border-dark-100">
            <h3 className="text-lg font-medium mb-2 text-light-100">Add New Player</h3>
            <PlayerForm 
              onSubmit={handleAddPlayer} 
              onCancel={() => setShowPlayerForm(false)}
            />
          </div>
        )}
        
        <PlayerList 
          players={players} 
          onRemove={handleRemovePlayer}
          onUpdate={handleUpdatePlayer}
        />
      </div>
    </div>
  );
};

export default TeamDetails;