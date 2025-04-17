// client/src/services/tournamentService.js

import apiService from './api';

// Base URL for tournament endpoints
const BASE_URL = '/api/tournaments';

// Client-side cache for tournament data
const cache = {
  data: {},
  timestamp: {},
  TTL: 30000, // 30 second TTL for cache entries
  
  // Check if a cached item is still valid
  isValid(key) {
    return (
      this.data[key] && 
      this.timestamp[key] && 
      Date.now() - this.timestamp[key] < this.TTL
    );
  },
  
  // Get item from cache
  get(key) {
    if (this.isValid(key)) {
      console.log(`Using cached data for ${key}`);
      return this.data[key];
    }
    return null;
  },
  
  // Set item in cache
  set(key, data) {
    console.log(`Caching data for ${key}`);
    this.data[key] = data;
    this.timestamp[key] = Date.now();
  },
  
  // Clear a specific item from cache
  clear(key) {
    delete this.data[key];
    delete this.timestamp[key];
  },
  
  // Clear all cache
  clearAll() {
    this.data = {};
    this.timestamp = {};
  }
};

/**
 * Tournament Service - Consolidated API for tournament management
 * Combines features from both tournamentService and tournamentApi
 */
class TournamentService {
  // Get all tournaments
  async getAllTournaments() {
    return apiService.get(BASE_URL);
  }
  
  // Get tournament by ID with caching
  async getTournamentById(tournamentId) {
    return this.getTournament(tournamentId);
  }

  // Get tournament by ID (compatibility method with caching)
  async getTournament(id) {
    const cacheKey = `tournament_${id}`;
    
    // Try to get from cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    // If not in cache, make API request
    try {
      console.log(`Fetching tournament ${id} from API`);
      
      // Make direct fetch request to bypass potential issues with the API service
      const response = await fetch(`/api/tournaments/${id}`, {
        headers: {
          'Cache-Control': 'max-age=30',
          'Accept': 'application/json'
        }
      });
      
      // First check if the response is OK
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }
      
      // Parse the response JSON
      const data = await response.json();
      
      // Log the exact response format for debugging
      console.log('Raw tournament response:', JSON.stringify(data));
      
      // Make sure we have valid data before caching
      if (data && data.data) {
        const processedResponse = {
          data: data
        };
        console.log('Successfully processed tournament data');
        // Store in cache
        cache.set(cacheKey, processedResponse);
        return processedResponse;
      } else {
        console.warn('Missing or invalid tournament data in response:', data);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      // Handle rate limit specifically
      if (error.response && error.response.status === 429) {
        console.warn('Rate limit hit when fetching tournament. Using stale cache if available.');
        // If we hit rate limits, try to use stale data if we have it
        if (cache.data[cacheKey]) {
          console.log('Using stale cache data due to rate limit');
          return cache.data[cacheKey];
        }
      }
      
      console.error('Error fetching tournament:', error);
      throw error;
    }
  }
  
  // Create new tournament
  async createTournament(tournamentData) {
    console.log('Creating tournament with data:', tournamentData);
    
    // Ensure all dates are properly formatted
    const formattedData = {
      ...tournamentData,
      startDate: tournamentData.startDate instanceof Date 
        ? tournamentData.startDate.toISOString() 
        : tournamentData.startDate,
      endDate: tournamentData.endDate instanceof Date 
        ? tournamentData.endDate.toISOString() 
        : tournamentData.endDate
    };
    
    console.log('Formatted data:', formattedData);
    return apiService.post(BASE_URL, formattedData);
  }
  
  // Update tournament
  async updateTournament(tournamentId, tournamentData) {
    return apiService.put(`${BASE_URL}/${tournamentId}`, tournamentData);
  }
  
  // Delete tournament
  async deleteTournament(tournamentId) {
    return apiService.delete(`${BASE_URL}/${tournamentId}`);
  }
  
  // Get tournament teams
  async getTournamentTeams(tournamentId) {
    return apiService.get(`${BASE_URL}/${tournamentId}/teams`);
  }
  
  // Add team to tournament
  async addTeamToTournament(tournamentId, teamId) {
    return apiService.post(`${BASE_URL}/${tournamentId}/teams`, { teamId });
  }
  
  // Remove team from tournament
  async removeTeamFromTournament(tournamentId, teamId) {
    return apiService.delete(`${BASE_URL}/${tournamentId}/teams/${teamId}`);
  }
  
  // Get tournament matches
  async getTournamentMatches(tournamentId) {
    return apiService.get(`${BASE_URL}/${tournamentId}/matches`);
  }
  
  // Add match to tournament
  async addMatchToTournament(tournamentId, matchData) {
    return apiService.post(`${BASE_URL}/${tournamentId}/matches`, matchData);
  }
  
  // Remove match from tournament
  async removeMatchFromTournament(tournamentId, matchId) {
    return apiService.delete(`${BASE_URL}/${tournamentId}/matches/${matchId}`);
  }
  
  // Get tournament leaderboard
  async getTournamentLeaderboard(tournamentId) {
    return apiService.get(`${BASE_URL}/${tournamentId}/leaderboard`);
  }
  
  // Join tournament (alias for addTeamToTournament for backward compatibility)
  async joinTournament(tournamentId, teamId) {
    console.log('Joining tournament:', tournamentId, 'with team:', teamId);
    return this.addTeamToTournament(tournamentId, teamId);
  }
  
  // Clear specific cache entry
  clearCache(key) {
    try {
      console.log(`Clearing cache for ${key}`);
      cache.clear(key);
    } catch (e) {
      console.warn('Error clearing cache:', e);
    }
  }
  
  // Clear all cache
  clearAllCache() {
    console.log('Clearing all tournament cache');
    cache.clearAll();
  }
}

// Export a singleton instance for use across the application
export default new TournamentService();
