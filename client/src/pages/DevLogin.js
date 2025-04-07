import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

const DevLogin = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const performDevLogin = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Call the development auto-login endpoint
        const response = await fetch('/api/auth/dev-login', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Development login failed');
        }
        
        const data = await response.json();
        
        // Store token using authService
        authService.setToken(data.token);
        
        // Redirect to dashboard
        navigate('/dashboard');
      } catch (error) {
        console.error('Development login error:', error);
        setError(error.message || 'Failed to perform development login');
        setLoading(false);
      }
    };
    
    performDevLogin();
  }, [navigate]);
  
  return (
    <div className="dev-login-page">
      <div className="container">
        <div className="auth-card">
          <h1>Development Login</h1>
          
          {error ? (
            <div className="error-message">
              <p>{error}</p>
              <p>Please check the server console for more information.</p>
              <button
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="loading-message">
              <p>Performing automatic development login...</p>
              <div className="loader"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevLogin;