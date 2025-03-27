import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jwt_decode from 'jwt-decode';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }
      
      try {
        // Check if token is expired
        const decoded = jwt_decode(token);
        const currentTime = Date.now() / 1000;
        
        if (decoded.exp < currentTime) {
          // Token is expired
          logout();
          return;
        }
        
        // Set auth header
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Get current user
        const response = await api.get('/auth/me');
        setCurrentUser(response.data.user);
      } catch (error) {
        console.error('Error verifying token:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };
    
    verifyToken();
  }, [token]);
  
  const login = async (usernameOrEmail, password) => {
    try {
      const response = await api.post('/auth/login', {
        usernameOrEmail,
        password
      });
      
      const { token, user } = response.data;
      
      // Save token to localStorage
      localStorage.setItem('token', token);
      
      // Set auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setToken(token);
      setCurrentUser(user);
      
      return user;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  };
  
  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      
      const { token, user } = response.data;
      
      // Save token to localStorage
      localStorage.setItem('token', token);
      
      // Set auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setToken(token);
      setCurrentUser(user);
      
      return user;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  };
  
  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('token');
    
    // Remove auth header
    delete api.defaults.headers.common['Authorization'];
    
    setToken(null);
    setCurrentUser(null);
    
    // Redirect to login
    navigate('/login');
  };
  
  const refreshToken = async () => {
    try {
      const response = await api.post('/auth/refresh', { token });
      
      const newToken = response.data.token;
      
      // Save token to localStorage
      localStorage.setItem('token', newToken);
      
      // Set auth header
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      setToken(newToken);
      
      return newToken;
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      logout();
      throw error;
    }
  };
  
  const value = {
    currentUser,
    loading,
    login,
    register,
    logout,
    refreshToken,
    isAuthenticated: !!currentUser
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
