import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!usernameOrEmail || !password) {
      setError('Please enter both username/email and password');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      
      console.log('Login component: Attempting to login with:', { usernameOrEmail, password });
      
      // Login
      await login(usernameOrEmail, password);
      
      console.log('Login component: Login successful, redirecting to dashboard');
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Login component: Login failed:', error);
      setError(error.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="login-page">
      <div className="container">
        <div className="auth-card">
          <h1>Login</h1>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="usernameOrEmail">Username or Email</label>
              <input
                type="text"
                id="usernameOrEmail"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="auth-links">
            <p>
              Don't have an account? <Link to="/register">Register</Link>
            </p>
            
            {/* Dev login link - remove in production */}
            <p>
              <Link to="/dev-login" className="text-sm text-gray-500">Dev Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;