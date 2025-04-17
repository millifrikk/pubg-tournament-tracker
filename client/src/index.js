import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import axios from 'axios';
import './index.css';
import './styles/dark-theme-fixes.css'; // Import enhanced contrast fixes for dark theme
import './styles/dashboard-theme-fixes.css'; // Import dashboard-specific fixes

// Global axios configuration
axios.defaults.timeout = 25000; // 25 seconds default timeout

// Configure axios for better reliability
axios.defaults.maxRedirects = 5;
axios.defaults.maxContentLength = 10 * 1024 * 1024; // 10MB max
axios.defaults.maxBodyLength = 10 * 1024 * 1024; // 10MB max

// Add a request interceptor for debugging
axios.interceptors.request.use(function (config) {
  // Do something before request is sent
  console.log(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
  return config;
}, function (error) {
  // Do something with request error
  console.error('Request error intercepted:', error);
  return Promise.reject(error);
});

// Add a response interceptor for better error handling
axios.interceptors.response.use(function (response) {
  // Any status code within the range of 2xx will trigger this function
  return response;
}, function (error) {
  // Any status codes outside the range of 2xx will trigger this function
  console.error('Response error intercepted:', error.message);
  
  // Add more context to error message
  if (error.code === 'ECONNABORTED') {
    error.message = 'Request timed out. The server might be overloaded.';
  } else if (error.code === 'ECONNRESET') {
    error.message = 'Connection reset by server. Please try again later. This likely means the PUBG API is experiencing issues.';
  } else if (error.code === 'ERR_NETWORK') {
    error.message = 'Network error. Please check your internet connection and try again.';  
  } else if (!error.response && error.request) {
    error.message = 'No response received from server. Please check your connection.';
  } else if (error.response) {
    // Handle specific status codes
    if (error.response.status === 429) {
      error.message = 'PUBG API rate limit exceeded. Please try again later.';
    } else if (error.response.status === 503) {
      error.message = 'Service unavailable. The API may be temporarily down for maintenance.';
    } else if (error.response.status === 504) {
      error.message = 'Gateway timeout. The server took too long to respond.';
    }
    
    // Add the error message from the response if available
    if (error.response.data && error.response.data.error) {
      error.message = `${error.message} - ${error.response.data.error}`;
    }
  }
  
  // Add a retry method to the error object 
  // This makes it easier to implement retries in components
  error.retry = async function(delayMs = 1000) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return axios(this.config);
  };
  
  return Promise.reject(error);
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);