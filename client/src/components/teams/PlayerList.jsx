import React, { useState } from 'react';
import PlayerForm from './PlayerForm';

const PlayerList = ({ players, onRemove, onUpdate }) => {
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  
  // Start editing a player
  const handleEdit = (playerId) => {
    setEditingPlayerId(playerId);
  };
  
  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPlayerId(null);
  };
  
  // Submit player updates
  const handleUpdatePlayer = (updatedData) => {
    onUpdate(editingPlayerId, updatedData);
    setEditingPlayerId(null);
  };
  
  if (!players || players.length === 0) {
    return (
      <div className="p-4 bg-dark-400 rounded text-center text-light-200">
        No players in this team yet.
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-dark-200 rounded-lg overflow-hidden border border-dark-100">
        <thead className="bg-dark-400">
          <tr>
            <th className="px-4 py-2 text-left text-light-100">PUBG Name</th>
            <th className="px-4 py-2 text-left text-light-100">PUBG ID</th>
            <th className="px-4 py-2 text-left text-light-100">Platform</th>
            <th className="px-4 py-2 text-left text-light-100">Added On</th>
            <th className="px-4 py-2 text-right text-light-100">Actions</th>
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <tr key={player.id} className="border-t border-dark-100 hover:bg-dark-300">
              {editingPlayerId === player.id ? (
                <td colSpan="5" className="px-4 py-2">
                  <PlayerForm 
                    initialData={{
                      pubgName: player.pubg_name || player.name,
                      pubgId: player.pubg_id || '',
                      platform: player.platform || 'steam'
                    }}
                    onSubmit={handleUpdatePlayer}
                    onCancel={handleCancelEdit}
                    isEditing={true}
                  />
                </td>
              ) : (
                <>
                  <td className="px-4 py-2 font-medium text-primary">{player.pubg_name || player.name}</td>
                  <td className="px-4 py-2 text-light-200">{player.pubg_id || '-'}</td>
                  <td className="px-4 py-2 text-light-200">{player.platform || 'steam'}</td>
                  <td className="px-4 py-2 text-light-200">
                    {new Date(player.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      className="text-blue-500 hover:text-blue-700 mr-2"
                      onClick={() => handleEdit(player.id)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => onRemove(player.id)}
                    >
                      Remove
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerList;