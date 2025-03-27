const { db } = require('./src/db/connection');

async function setupDatabase() {
  try {
    console.log('Starting database setup...');
    
    // Check if connection works
    console.log('Testing database connection...');
    const connected = await db.raw('SELECT 1+1 AS result');
    console.log('Database connection successful:', connected.rows[0].result === 2);
    
    // Run migrations
    console.log('Running migrations...');
    await db.migrate.latest();
    console.log('Migrations completed successfully');
    
    // Run seeds
    console.log('Running seeds...');
    await db.seed.run();
    console.log('Seeds completed successfully');
    
    console.log('Database setup completed successfully!');
    console.log('You can now login with:');
    console.log('Username: admin');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase();
