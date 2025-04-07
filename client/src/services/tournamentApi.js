// client/src/services/tournamentApi.js

import api from './api';

// Base URL for tournament endpoints
const BASE_URL = '/api/tournaments';

// Tournament API service
const tournamentApi = {
  // Get all tournaments
  getAllTournaments: () => {
    return api.get(BASE_URL);
  },
  
  // Get tournament by ID
  getTournament: (id) => {
    return api.get(`${BASE_URL}/${id}`);
  },
  
  // Create new tournament
  createTournament: (tournamentData) => {
    return api.post(BASE_URL, tournamentData);
  },
  
  // Update tournament
  updateTournament: (id, tournamentData) => {
    return api.put(`${BASE_URL}/${id}`, tournamentData);
  },
  
  // Delete tournament
  deleteTournament: (id) => {
    return api.delete(`${BASE_URL}/${id}`);
  },
  
  // Get tournament matches
  getTournamentMatches: (id) => {
    return api.get(`${BASE_URL}/${id}/matches`);
  },
  
  // Add match to tournament
  addMatchToTournament: (tournamentId, matchId) => {
    return api.post(`${BASE_URL}/${tournamentId}/matches`, { matchId });
  },
  
  // Remove match from tournament
  removeMatchFromTournament: (tournamentId, matchId) => {
    return api.delete(`${BASE_URL}/${tournamentId}/matches/${matchId}`);
  },
  
  // Get tournament teams
  getTournamentTeams: (id) => {
    return api.get(`${BASE_URL}/${id}/teams`);
  },
  
  // Add team to tournament
  addTeamToTournament: (tournamentId, teamId) => {
    return api.post(`${BASE_URL}/${tournamentId}/teams`, { teamId });
  },
  
  // Remove team from tournament
  removeTeamFromTournament: (tournamentId, teamId) => {
    return api.delete(`${BASE_URL}/${tournamentId}/teams/${teamId}`);
  },
  
  // Get tournament leaderboard
  getTournamentLeaderboard: (id) => {
    return api.get(`${BASE_URL}/${id}/leaderboard`);
  },
  
  // Join tournament (alias for addTeamToTournament)
  joinTournament: (tournamentId, teamId) => {
    return api.post(`${BASE_URL}/${tournamentId}/teams`, { teamId });
  }
};

export default tournamentApi;