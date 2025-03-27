// authService.js - Handle JWT authentication and tokens

const TOKEN_KEY = 'pubg_tracker_auth_token';
const USER_DATA_KEY = 'pubg_tracker_user_data';

// Auth service for JWT token management
const authService = {
  /**
   * Set the authentication token
   * @param {string} token - JWT token
   */
  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },
  
  /**
   * Get the current authentication token
   * @returns {string|null} JWT token or null if not logged in
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  
  /**
   * Set user data in local storage
   * @param {Object} userData - User data object
   */
  setUserData(userData) {
    if (userData) {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    }
  },
  
  /**
   * Get current user data
   * @returns {Object|null} User data or null if not logged in
   */
  getUserData() {
    const userDataStr = localStorage.getItem(USER_DATA_KEY);
    if (userDataStr) {
      try {
        return JSON.parse(userDataStr);
      } catch (error) {
        console.error('Error parsing user data from localStorage', error);
        return null;
      }
    }
    return null;
  },
  
  /**
   * Check if user is logged in
   * @returns {boolean} True if logged in
   */
  isLoggedIn() {
    return !!this.getToken();
  },
  
  /**
   * Get user ID of logged in user
   * @returns {string|null} User ID or null if not logged in
   */
  getUserId() {
    const userData = this.getUserData();
    return userData ? userData.id : null;
  },
  
  /**
   * Check if user has admin role
   * @returns {boolean} True if user is admin
   */
  isAdmin() {
    const userData = this.getUserData();
    return userData ? userData.role === 'admin' : false;
  },
  
  /**
   * Logout user by removing token and user data
   */
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
  }
};

export default authService;