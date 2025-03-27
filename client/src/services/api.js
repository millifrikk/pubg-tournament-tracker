import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests if available
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add response interceptor for handling errors
api.interceptors.response.use(
  response => response,
  error => {
    // Handle specific error cases
    if (error.response) {
      // The request was made and the server responded with a non-2xx status
      const { status } = error.response;
      
      // Handle authentication errors
      if (status === 401) {
        // If token refresh fails or user is not authenticated
        if (error.config.url !== '/auth/refresh' && error.config.url !== '/auth/login') {
          // Remove token and redirect to login
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          
          // Don't redirect if we're already on the login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Player API
export const playerApi = {
  searchPlayer: (name, platform = 'steam') => 
    api.get(`/players/search?name=${name}&platform=${platform}`),
  
  getPlayerById: (id, platform = 'steam') => 
    api.get(`/players/${id}?platform=${platform}`),
  
  getPlayerMatches: (id, platform = 'steam', limit = 10) => 
    api.get(`/players/${id}/matches?platform=${platform}&limit=${limit}`),
  
  getPlayerSeasonStats: (id, seasonId, platform = 'steam') => 
    api.get(`/players/${id}/season/${seasonId}?platform=${platform}`)
};

// Match API
export const matchApi = {
  getMatch: (id, platform = 'steam') => 
    api.get(`/matches/${id}?platform=${platform}`),
  
  getTelemetry: (id, platform = 'steam') => 
    api.get(`/matches/${id}/telemetry?platform=${platform}`),
  
  searchMatches: (criteria) => 
    api.post('/matches/search', criteria),
  
  registerMatch: (matchData) => 
    api.post('/matches/register', matchData)
};

// Tournament API
export const tournamentApi = {
  getAllTournaments: (params = {}) => 
    api.get('/tournaments', { params }),
  
  getTournamentById: (id) => 
    api.get(`/tournaments/${id}`),
  
  createTournament: (tournamentData) => 
    api.post('/tournaments', tournamentData),
  
  updateTournament: (id, tournamentData) => 
    api.put(`/tournaments/${id}`, tournamentData),
  
  deleteTournament: (id) => 
    api.delete(`/tournaments/${id}`),
  
  getTournamentMatches: (id, platform = 'steam') => 
    api.get(`/tournaments/${id}/matches?platform=${platform}`),
  
  addMatchesToTournament: (id, matchIds, stage = 'group') => 
    api.post(`/tournaments/${id}/matches`, { matchIds, stage }),
  
  removeMatchFromTournament: (id, matchId) => 
    api.delete(`/tournaments/${id}/matches/${matchId}`),
  
  calculateStandings: (id, platform = 'steam') => 
    api.post(`/tournaments/${id}/calculate-standings`, { platform })
};

// Team API
export const teamApi = {
  getAllTeams: (params = {}) => 
    api.get('/teams', { params }),
  
  getTeamById: (id) => 
    api.get(`/teams/${id}`),
  
  createTeam: (teamData) => 
    api.post('/teams', teamData),
  
  updateTeam: (id, teamData) => 
    api.put(`/teams/${id}`, teamData),
  
  deleteTeam: (id) => 
    api.delete(`/teams/${id}`),
  
  addPlayersToTeam: (id, players) => 
    api.post(`/teams/${id}/players`, { players }),
  
  removePlayerFromTeam: (id, playerId) => 
    api.delete(`/teams/${id}/players/${playerId}`)
};

// Auth API
export const authApi = {
  login: (usernameOrEmail, password) => 
    api.post('/auth/login', { usernameOrEmail, password }),
  
  register: (userData) => 
    api.post('/auth/register', userData),
  
  getCurrentUser: () => 
    api.get('/auth/me'),
  
  refreshToken: (token) => 
    api.post('/auth/refresh', { token })
};

// Export the api instance as default
export default api;
