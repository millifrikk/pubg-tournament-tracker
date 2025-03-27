// Database initialization script
const { db, initializeDatabase } = require('./connection');

async function init() {
  try {
    console.log('=== PUBG Tournament Tracker - Database Initialization ===');
    console.log('Starting database initialization...');
    
    // Initialize database (run migrations and seeds)
    const success = await initializeDatabase();
    
    if (success) {
      console.log('\nDatabase initialization completed successfully!');
      console.log('\nYou can login with:');
      console.log('  Username: admin');
      console.log('  Password: admin123');
    } else {
      console.error('\nDatabase initialization failed.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.destroy();
  }
}

// Run initialization
init();
