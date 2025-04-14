// client/src/services/teamService.js

import apiService from './api';

const BASE_URL = '/api/teams';

class TeamService {
  // Get all teams
  async getAllTeams() {
    return apiService.get(BASE_URL);
  }
  
  // Get team by ID
  async getTeamById(teamId) {
    return apiService.get(`${BASE_URL}/${teamId}`);
  }
  
  // Create new team
  async createTeam(teamData) {
    console.log('TeamService: Creating team with data:', teamData);
    
    // Ensure fields match what the server expects
    const processedData = {
      name: teamData.name,
      tag: teamData.tag || teamData.name.substring(0, 4).toUpperCase(),
      logoUrl: teamData.logoUrl
    };
    
    // Log processed data and headers
    console.log('Sending to server:', processedData);
    console.log('Auth header present:', !!localStorage.getItem('token'));
    
    return apiService.post(BASE_URL, processedData);
  }
  
  // Update team
  async updateTeam(teamId, teamData) {
    return apiService.put(`${BASE_URL}/${teamId}`, teamData);
  }
  
  // Delete team
  async deleteTeam(teamId) {
    return apiService.delete(`${BASE_URL}/${teamId}`);
  }
  
  // Get team players
  async getTeamPlayers(teamId) {
    return apiService.get(`${BASE_URL}/${teamId}/players`);
  }
  
  // Add player to team
  async addPlayerToTeam(teamId, playerData) {
    console.log('TeamService: Adding player to team', teamId, 'with data:', playerData);
    try {
      const response = await apiService.post(`${BASE_URL}/${teamId}/players`, playerData);
      console.log('Add player response:', response);
      return response;
    } catch (error) {
      console.error('Error in addPlayerToTeam:', error);
      throw error;
    }
  }
  
  // Remove player from team
  async removePlayerFromTeam(teamId, playerId) {
    return apiService.delete(`${BASE_URL}/${teamId}/players/${playerId}`);
  }
  
  // Update player
  async updatePlayer(playerId, playerData) {
    return apiService.put(`/api/players/${playerId}`, {
      pubgName: playerData.pubgName,
      pubgId: playerData.pubgId,
      platform: playerData.platform
    });
  }
}

export default new TeamService();