// cacheService.js - Local storage based caching for PUBG match data
const CACHE_PREFIX = 'pubg_match_';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const cacheService = {
  /**
   * Store match data in localStorage
   * @param {string} matchId - PUBG match ID
   * @param {string} platform - Platform (steam, xbox, etc.)
   * @param {Object} data - Match data to cache
   * @returns {boolean} Success status
   */
  storeMatch(matchId, platform, data) {
    try {
      const cacheKey = `${CACHE_PREFIX}${platform}_${matchId}`;
      const cacheData = {
        data: data,
        timestamp: Date.now(),
        expires: Date.now() + CACHE_EXPIRY
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`Cached match data for: ${matchId}`);
      return true;
    } catch (error) {
      console.error('Error storing match in cache:', error);
      // If localStorage is full, try to clear older items
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.clearOldCache();
      }
      return false;
    }
  },

  /**
   * Get match data from localStorage if available and not expired
   * @param {string} matchId - PUBG match ID
   * @param {string} platform - Platform (steam, xbox, etc.)
   * @returns {Object|null} Cached match data or null
   */
  getMatch(matchId, platform) {
    try {
      const cacheKey = `${CACHE_PREFIX}${platform}_${matchId}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      if (!cachedData) return null;
      
      const parsed = JSON.parse(cachedData);
      
      // Check if cache is expired (technically unnecessary for match data since it's immutable,
      // but good practice for cache management)
      if (parsed.expires < Date.now()) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      
      return parsed.data;
    } catch (error) {
      console.error('Error retrieving match from cache:', error);
      return null;
    }
  },
  
  /**
   * Clear expired or old cache entries
   */
  clearOldCache() {
    try {
      // Get all keys in localStorage that match our cache prefix
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          keys.push(key);
        }
      }
      
      // Find expired or old items
      const now = Date.now();
      const itemsToRemove = [];
      
      keys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            // Remove if expired or older than half the expiry time
            if (parsed.expires < now || (now - parsed.timestamp) > (CACHE_EXPIRY / 2)) {
              itemsToRemove.push(key);
            }
          } else {
            // Invalid item
            itemsToRemove.push(key);
          }
        } catch (e) {
          // If we can't parse it, it's corrupted
          itemsToRemove.push(key);
        }
      });
      
      // Remove old/expired items
      itemsToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log(`Cleared ${itemsToRemove.length} old cache entries`);
    } catch (error) {
      console.error('Error clearing old cache:', error);
    }
  }
};

export default cacheService;