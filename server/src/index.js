const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import socket.io setup
const { initializeSocketServer } = require('./socket');

// Import configurations
const { PORT, NODE_ENV } = require('./config/environment');

// Import database connection
const { initializeDatabase } = require('./db/connection');

// Import API routes
const apiRoutes = require('./api');

// Import error handling middleware
const errorHandlingMiddleware = require('./middleware/errorHandling');

// Run service validator
const serviceValidator = require('./services/serviceValidator');

// Initialize app
const app = express();

// Middleware
app.use(helmet()); // Set security headers
app.use(express.json({ limit: '5mb' })); // Parse JSON bodies with increased limit
app.use(express.urlencoded({ extended: true, limit: '5mb' })); // Parse URL-encoded bodies with increased limit
// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Request logging
if (NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting to API routes
app.use('/api', apiLimiter);

// Routes
app.use('/api', apiRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date(),
    services: {
      pubgApi: {
        isValid: serviceValidator.isValid,
        isEnhanced: serviceValidator.isEnhanced
      }
    }
  });
});

// Apply the enhanced error handling middleware
app.use(errorHandlingMiddleware);

// Create HTTP server with increased timeout
const server = http.createServer(app);

// Increase the server timeout to handle longer requests
server.timeout = 120000; // 2 minutes

// Initialize Socket.IO
const io = initializeSocketServer(server);

// Make io accessible from req object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Initialize the database and start the server
async function startServer() {
  try {
    // Initialize database first (run migrations and seeds if necessary)
    await initializeDatabase();
    
    // Start the server after database initialization
    server.listen(PORT || 5000, () => {
      console.log(`Server running on port ${PORT || 5000} in ${NODE_ENV} mode`);
      console.log('Login with:');
      console.log('  Username: admin');
      console.log('  Password: admin123');
      
      // Show API status
      console.log('PUBG API Service Status:');
      console.log('- Enhanced API Service:', serviceValidator.isEnhanced ? 'Active ✅' : 'Inactive ❌');
      console.log('- API Functions Available:', serviceValidator.isValid ? 'Yes ✅' : 'No ❌');
      
      if (!serviceValidator.isEnhanced) {
        console.log('');
        console.log('To enable the Enhanced API Service with better error handling:');
        console.log('node src/api/switchToEnhancedApiService.js --enhanced');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Log error but don't crash the server in production
  if (NODE_ENV === 'production') {
    console.error('Unhandled Rejection (CRITICAL):', err);
  } else {
    // Close server & exit process in development to make issues more visible
    server.close(() => process.exit(1));
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Log error but don't crash the server in production
  if (NODE_ENV === 'production') {
    console.error('Uncaught Exception (CRITICAL):', err);
  } else {
    // Close server & exit process in development
    server.close(() => process.exit(1));
  }
});

module.exports = app; // Export for testing