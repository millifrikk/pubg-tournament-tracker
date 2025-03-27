const socketIO = require('socket.io');
const { db } = require('../db/connection');

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO server instance
 */
function initializeSocketServer(server) {
  const io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    // TODO: Verify JWT token (same logic as API authentication)
    // For now, allow all connections
    next();
  });

  // Socket event handlers
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    // Join tournament room
    socket.on('join-tournament', (tournamentId) => {
      socket.join(`tournament:${tournamentId}`);
      console.log(`${socket.id} joined tournament:${tournamentId}`);
    });
    
    // Leave tournament room
    socket.on('leave-tournament', (tournamentId) => {
      socket.leave(`tournament:${tournamentId}`);
      console.log(`${socket.id} left tournament:${tournamentId}`);
    });
    
    // Join match room
    socket.on('join-match', (matchId) => {
      socket.join(`match:${matchId}`);
      console.log(`${socket.id} joined match:${matchId}`);
    });
    
    // Leave match room
    socket.on('leave-match', (matchId) => {
      socket.leave(`match:${matchId}`);
      console.log(`${socket.id} left match:${matchId}`);
    });
    
    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });

  // Expose functions to emit events from other parts of the application
  io.emitTournamentUpdate = (tournamentId, data) => {
    io.to(`tournament:${tournamentId}`).emit('tournament-update', data);
  };
  
  io.emitMatchUpdate = (matchId, data) => {
    io.to(`match:${matchId}`).emit('match-update', data);
  };
  
  io.emitStandingsUpdate = (tournamentId, standings) => {
    io.to(`tournament:${tournamentId}`).emit('standings-update', standings);
  };
  
  return io;
}

module.exports = { initializeSocketServer };
