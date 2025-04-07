import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jwt_decode from 'jwt-decode';
import authService from '../services/authService';

// Create context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Check if user is already logged in on initial load
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const token = authService.getToken();
        
        if (!token) {
          setCurrentUser(null);
          setLoading(false);
          return;
        }
        
        // Check if token is expired
        try {
          const decoded = jwt_decode(token);
          const currentTime = Date.now() / 1000;
          
          if (decoded.exp < currentTime) {
            // Token is expired
            logout();
            return;
          }
          
          // Token is valid, get current user data
          console.log('Token is valid, getting user data');          
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('User data response status:', response.status);
          
          if (!response.ok) {
            throw new Error('Failed to get user data');
          }
          
          const data = await response.json();
          setCurrentUser(data.user);
        } catch (error) {
          console.error('Token validation error:', error);
          logout();
        }
      } finally {
        setLoading(false);
      }
    };
    
    verifyToken();
  }, []);
  
  // Login function
  const login = async (usernameOrEmail, password) => {
    try {
      const credentials = { usernameOrEmail, password };
      console.log('Attempting login with:', credentials);
      
      const data = await authService.login(credentials);
      console.log('Login successful:', data);
      
      setCurrentUser(data.user);
      return data.user;
    } catch (error) {
      console.error('Login error in AuthContext:', error);
      throw error;
    }
  };
  
  // Register function
  const register = async (userData) => {
    try {
      // Use fetch directly for registration to avoid circular dependencies
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      // Save token and user data
      authService.setToken(data.token);
      setCurrentUser(data.user);
      
      return data.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };
  
  // Logout function
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
    navigate('/login');
  };
  
  // Define the context value
  const value = {
    currentUser,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!currentUser
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};