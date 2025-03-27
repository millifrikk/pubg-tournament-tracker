const express = require('express');
const router = express.Router();

// Import route modules
const playersRoutes = require('./players');
const matchesRoutes = require('./matches');
const matchesLiteRoutes = require('./matches-lite');
const tournamentsRoutes = require('./tournaments');
const teamsRoutes = require('./teams');
const authRoutes = require('./auth');
const telemetryRoutes = require('./telemetry');
const pubgRoutes = require('./pubgRoutes'); // New PUBG routes

// Mount route modules
router.use('/players', playersRoutes);
router.use('/matches', matchesRoutes);
router.use('/matches-lite', matchesLiteRoutes);
router.use('/tournaments', tournamentsRoutes);
router.use('/teams', teamsRoutes);
router.use('/auth', authRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/pubg', pubgRoutes); // Mount PUBG routes

// API version info
router.get('/', (req, res) => {
  res.json({
    name: 'PUBG Tournament Tracker API',
    version: '1.0.0',
    status: 'online',
    serverTime: new Date().toISOString(),
    endpoints: [
      '/api/players',
      '/api/matches',
      '/api/matches-lite',
      '/api/tournaments',
      '/api/teams',
      '/api/auth',
      '/api/telemetry',
      '/api/pubg' // New PUBG endpoint
    ]
  });
});

// Test endpoint for connectivity checks
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'API server is running correctly',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;