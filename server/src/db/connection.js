const knex = require('knex');
const knexConfig = require('./knexfile');
const { NODE_ENV } = require('../config/environment');

// Get the appropriate configuration based on the environment
const environment = NODE_ENV || 'development';
const config = knexConfig[environment];

// Initialize knex connection
const db = knex(config);

// Test the connection
async function testConnection() {
  try {
    await db.raw('SELECT 1+1 AS result');
    console.log(`Database connection to ${config.connection.database} successful`);
    return true;
  } catch (error) {
    console.error('Error connecting to database:', error);
    return false;
  }
}

// Initialize database (run migrations and seeds in development)
async function initializeDatabase() {
  try {
    console.log('Testing database connection...');
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('Database connection failed. Please check your database configuration.');
      return false;
    }
    
    // Check if tables exist by querying the migrations table
    const migrationsTableExists = await db.schema.hasTable('knex_migrations');
    
    if (!migrationsTableExists) {
      console.log('Running initial migrations...');
      await db.migrate.latest();
      
      // If in development, run seeds
      if (environment === 'development') {
        console.log('Running development seeds...');
        await db.seed.run();
        console.log('Seeds completed successfully');
      }
    } else {
      // Check if users table exists
      const usersTableExists = await db.schema.hasTable('users');
      
      if (!usersTableExists) {
        console.log('Users table does not exist. Running migrations...');
        await db.migrate.latest();
        
        // If in development, run seeds
        if (environment === 'development') {
          console.log('Running development seeds...');
          await db.seed.run();
          console.log('Seeds completed successfully');
        }
      } else {
        console.log('Database schema is already set up.');
        
        // Check if admin user exists
        const adminExists = await db('users').where({ username: 'admin' }).first();
        
        if (!adminExists && environment === 'development') {
          console.log('Admin user does not exist. Running seeds...');
          await db.seed.run();
          console.log('Seeds completed successfully');
        }
      }
    }
    
    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Export the configured knex instance and helper functions
module.exports = {
  db,
  testConnection,
  initializeDatabase
};
