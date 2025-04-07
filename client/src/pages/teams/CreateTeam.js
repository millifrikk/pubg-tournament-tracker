import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import teamService from '../../services/teamService';
import authService from '../../services/authService';
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
  
  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    console.log('Current authentication token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      setError('You must be logged in to create a team');
    }
  }, []);
  
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
      // Check auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please log in first.');
      }
      
      // Create team
      console.log('Creating team with teamService:', formData);
      console.log('Using authentication token:', token.substring(0, 15) + '...');
      
      // Create team data object that matches the server's expectations
      const teamData = {
        name: formData.name,
        tag: formData.tag,
        logoUrl: formData.logoUrl
      };
      
      const response = await teamService.createTeam(teamData);
      console.log('Team creation successful:', response);
      
      // Redirect to team details page
      navigate(`/teams/${response.data.id}`);
    } catch (err) {
      console.error('Error creating team:', err);
      let errorMessage = err.response?.data?.error || 'Failed to create team';
      
      // Check for specific error types
      if (err.message?.includes('Authorization') || err.message?.includes('Authentication')) {
        errorMessage = `Authentication error: ${err.message}. Please try logging in again.`;
      }
      
      console.log('Setting error:', errorMessage);
      setError(errorMessage);
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