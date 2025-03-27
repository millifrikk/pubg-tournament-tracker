import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const CreateTeam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    logoUrl: ''
  });
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Auto-generate tag from name
    if (name === 'name' && !formData.tag) {
      // Create tag from first 4 letters of name
      const tag = value.substring(0, 4).toUpperCase();
      setFormData(prev => ({
        ...prev,
        tag
      }));
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Create team
      const response = await axios.post('/api/teams', formData);
      
      // Redirect to team details page
      navigate(`/teams/${response.data.data.id}`);
    } catch (err) {
      console.error('Error creating team:', err);
      setError(err.response?.data?.error || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="create-team-page">
      <div className="container">
        <h1 className="page-title">Create Team</h1>
        
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
        {loading ? (
          <LoadingSpinner />
        ) : (
          <form onSubmit={handleSubmit} className="team-form">
            <div className="form-group">
              <label htmlFor="name">Team Name*</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                maxLength="100"
                placeholder="Enter team name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="tag">Team Tag</label>
              <input
                type="text"
                id="tag"
                name="tag"
                value={formData.tag}
                onChange={handleInputChange}
                maxLength="10"
                placeholder="e.g. TEAM"
              />
              <p className="help-text">
                A short, up to 10 characters tag for your team. This will be shown in brackets [TAG].
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="logoUrl">Logo URL</label>
              <input
                type="url"
                id="logoUrl"
                name="logoUrl"
                value={formData.logoUrl}
                onChange={handleInputChange}
                placeholder="https://example.com/logo.png"
              />
              <p className="help-text">
                Optional URL to your team's logo image.
              </p>
            </div>
            
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => navigate('/teams')}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Team
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateTeam;
