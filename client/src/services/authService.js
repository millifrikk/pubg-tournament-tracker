// client/src/services/authService.js

const TOKEN_KEY = 'token'; // Make sure this is consistent across all files

class AuthService {
  // Login user and store token
  async login(credentials) {
    try {
      console.log('AuthService login called with:', credentials);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Login response error:', errorData);
        throw new Error(errorData.error || 'Login failed');
      }
      
      const data = await response.json();
      console.log('Login successful, received data:', data);
      
      if (!data.token) {
        console.error('No token received in login response');
        throw new Error('No authentication token received');
      }
      
      this.setToken(data.token);
      return data;
    } catch (error) {
      console.error('Login error in AuthService:', error);
      throw error;
    }
  }
  
  // Set token in localStorage
  setToken(token) {
    if (token) {
      console.log('Setting token in localStorage');
      localStorage.setItem(TOKEN_KEY, token);
      
      // If using fetch, we don't need to set default headers here
      // Each request will get the token from localStorage as needed
    }
  }
  
  // Get token from localStorage
  getToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    return token;
  }
  
  // Get auth header value
  getAuthHeader() {
    const token = this.getToken();
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  }
  
  // Check if user is logged in
  isLoggedIn() {
    return !!this.getToken();
  }
  
  // Logout user
  logout() {
    console.log('Removing token from localStorage');
    localStorage.removeItem(TOKEN_KEY);
  }
  
  // Refresh token
  async refreshToken() {
    const currentToken = this.getToken();
    if (!currentToken) {
      throw new Error('No token to refresh');
    }
    
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({ token: currentToken })
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const data = await response.json();
      this.setToken(data.token);
      return data.token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.logout();
      throw error;
    }
  }
}

export default new AuthService();