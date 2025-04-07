// client/src/components/tournaments/TournamentCreate.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tournamentService from '../../services/tournamentService';

const TournamentCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (!formData.name.trim()) {
        throw new Error('Tournament name is required');
      }

      if (!formData.startDate || !formData.endDate) {
        throw new Error('Start and end dates are required');
      }

      // Format dates properly if needed
      const tournamentData = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      console.log('Creating tournament with data:', tournamentData);
      
      // Create tournament
      const result = await tournamentService.createTournament(tournamentData);
      
      console.log('Tournament created:', result);
      
      // Redirect to the tournament page
      navigate(`/tournaments/${result.id}`);
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err.message || 'Failed to create tournament. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Tournament</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-gray-700">Tournament Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-gray-700">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            rows="4"
          ></textarea>
        </div>
        
        <div>
          <label htmlFor="startDate" className="block text-gray-700">Start Date</label>
          <input
            type="datetime-local"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        
        <div>
          <label htmlFor="endDate" className="block text-gray-700">End Date</label>
          <input
            type="datetime-local"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          />
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/tournaments')}
            className="py-2 px-4 bg-gray-200 text-gray-700 rounded-md"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Tournament'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TournamentCreate;