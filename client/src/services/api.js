// client/src/services/api.js

// We'll get the token directly from localStorage to avoid circular dependency
console.log('Initializing API service')

// Base API class that handles requests with authentication
class ApiService {
  // Get request with auth
  async get(url, options = {}) {
    return this.request('GET', url, null, options);
  }
  
  // Post request with auth
  async post(url, data, options = {}) {
    return this.request('POST', url, data, options);
  }
  
  // Put request with auth
  async put(url, data, options = {}) {
    return this.request('PUT', url, data, options);
  }
  
  // Delete request with auth
  async delete(url, options = {}) {
    return this.request('DELETE', url, null, options);
  }
  
  // Universal request method
  async request(method, url, data = null, options = {}) {
    try {
      // Get token directly from localStorage to avoid circular dependency
      const token = localStorage.getItem('token');
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };
      
      // Add auth header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Adding auth header with token');
      } else {
        console.warn('No token available for request to ' + url);
        // For requests to protected routes, this will likely fail
        // Add a more descriptive error message
        if (url.includes('/api/teams') || url.includes('/api/tournaments')) {
          throw new Error('Authorization token missing. You may need to log in again.');
        }
      }
      
      // Log the request for debugging
      console.log(`API ${method} request to ${url}`);
      console.log('Headers:', headers);
      if (data) console.log('Data:', data);
      
      // Build request config
      const config = {
        method,
        headers,
        ...options
      };
      
      // Add body for non-GET requests
      if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
      }
      
      // Make the request
      const response = await fetch(url, config);
      
      // Parse the JSON response
      const responseData = await response.json();
      
      // Handle unsuccessful responses
      if (!response.ok) {
        // Check for authentication errors
        if (response.status === 401) {
          console.error('Authentication error');
          // You might want to redirect to login page here
          // Remove token directly without using authService
          localStorage.removeItem('token');
          // Log authentication error for debugging
          console.log('Auth error detected, token removed');
        }
        
        // Log detailed error information
        console.error('API response error:', {
          status: response.status,
          statusText: response.statusText,
          responseData
        });
        
        throw new Error(responseData.error || responseData.details || `Request failed with status ${response.status}`);
      }
      
      return responseData;
    } catch (error) {
      console.error(`API error (${method} ${url}):`, error);
      throw error;
    }
  }
}

export default new ApiService();