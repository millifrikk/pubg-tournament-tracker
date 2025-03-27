import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { tournamentApi } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const CreateTournament = () => {
  const navigate = useNavigate();
  const { isAuthenticated, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    format: 'points',
    scoringSystem: 'super',
    isActive: true,
    isPublic: true,
    customScoringTable: null
  });
  
  // Tournament format options
  const formatOptions = [
    { value: 'points', label: 'Points-based' },
    { value: 'elimination', label: 'Elimination' },
    { value: 'round-robin', label: 'Round Robin' },
    { value: 'custom', label: 'Custom' }
  ];
  
  // Scoring system options
  const scoringOptions = [
    { value: 'super', label: 'SUPER (PUBG Esports)' },
    { value: 'standard', label: 'Standard' },
    { value: 'custom', label: 'Custom' }
  ];
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!isAuthenticated) {
      setError('You must be logged in to create a tournament');
      setLoading(false);
      return;
    }
    
    try {
      // Format dates as ISO strings
      const payload = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString()
      };
      
      // Create tournament using the API service
      const response = await tournamentApi.createTournament(payload);
      
      // Redirect to tournament details page
      navigate(`/tournaments/${response.data.data.id}`);
    } catch (err) {
      console.error('Error creating tournament:', err);
      setError(err.response?.data?.error || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="create-tournament-page">
      <div className="container">
        <h1 className="page-title">Create Tournament</h1>
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <LoadingSpinner />
        ) : (
          <form onSubmit={handleSubmit} className="tournament-form">
            <div className="form-group">
              <label htmlFor="name">Tournament Name*</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                maxLength="100"
                placeholder="Enter tournament name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                placeholder="Enter tournament description"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Start Date*</label>
                <input
                  type="datetime-local"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="endDate">End Date*</label>
                <input
                  type="datetime-local"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="format">Tournament Format*</label>
                <select
                  id="format"
                  name="format"
                  value={formData.format}
                  onChange={handleInputChange}
                  required
                >
                  {formatOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="scoringSystem">Scoring System*</label>
                <select
                  id="scoringSystem"
                  name="scoringSystem"
                  value={formData.scoringSystem}
                  onChange={handleInputChange}
                  required
                >
                  {scoringOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {formData.scoringSystem === 'custom' && (
              <div className="form-group">
                <label>Custom Scoring Configuration</label>
                <p className="help-text">
                  Custom scoring configuration will be added in a future update.
                </p>
              </div>
            )}
            
            <div className="form-row checkboxes">
              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                />
                <label htmlFor="isActive">Active Tournament</label>
              </div>
              
              <div className="form-group checkbox">
                <input
                  type="checkbox"
                  id="isPublic"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleInputChange}
                />
                <label htmlFor="isPublic">Public Tournament</label>
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => navigate('/tournaments')}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Tournament
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateTournament;
