import axios from 'axios';

// Create custom axios instance with improved configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 120000, // 2 minutes timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use(
  config => {
    // Get JWT token from local storage if it exists
    const token = localStorage.getItem('token');
    
    // If token exists, add it to the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      
      // If it's a timeout
      if (error.code === 'ECONNABORTED') {
        console.error('Request timed out');
      }
      
      // If it's a network error (ECONNRESET, etc.)
      if (error.message.includes('Network Error')) {
        console.error('Network connection issue - possibly server disconnected');
      }
    }
    
    // Handle 401 Unauthorized errors (invalid/expired token)
    if (error.response?.status === 401) {
      // Redirect to login or refresh token
      console.log('Authentication error - redirecting to login');
    }
    
    // Handle server errors (500, etc.)
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;
