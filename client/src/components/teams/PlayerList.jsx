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
      <div className="p-4 bg-gray-50 rounded text-center">
        No players in this team yet.
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left">PUBG Name</th>
            <th className="px-4 py-2 text-left">PUBG ID</th>
            <th className="px-4 py-2 text-left">Platform</th>
            <th className="px-4 py-2 text-left">Added On</th>
            <th className="px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <tr key={player.id} className="border-t hover:bg-gray-50">
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
                  <td className="px-4 py-2 font-medium">{player.pubg_name || player.name}</td>
                  <td className="px-4 py-2 text-gray-600">{player.pubg_id || '-'}</td>
                  <td className="px-4 py-2 text-gray-600">{player.platform || 'steam'}</td>
                  <td className="px-4 py-2 text-gray-600">
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