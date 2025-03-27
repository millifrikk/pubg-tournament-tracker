const axios = require('axios');
const { db, testConnection } = require('../src/db/connection');

async function verifyServer() {
  try {
    console.log('Starting server verification...');
    
    // 1. Test database connection
    console.log('\nChecking database connection...');
    const dbConnected = await testConnection();
    console.log(`Database connection status: ${dbConnected ? 'SUCCESS' : 'FAILED'}`);
    
    if (!dbConnected) {
      console.error('Database connection failed. Check your database configuration and make sure PostgreSQL is running.');
      process.exit(1);
    }
    
    // 2. Check if tables exist
    console.log('\nChecking database schema...');
    const usersTableExists = await db.schema.hasTable('users');
    console.log(`Users table exists: ${usersTableExists ? 'YES' : 'NO'}`);
    
    if (!usersTableExists) {
      console.log('Database tables not found. You need to run migrations.');
      console.log('Try running: npm run migrate');
      process.exit(1);
    }
    
    // 3. Check for admin user
    console.log('\nChecking admin user...');
    const adminUser = await db('users').where({ username: 'admin' }).first();
    console.log(`Admin user exists: ${adminUser ? 'YES' : 'NO'}`);
    
    if (!adminUser) {
      console.log('Admin user not found. You need to run seeds.');
      console.log('Try running: npm run seed');
      process.exit(1);
    }
    
    // 4. Test API server
    console.log('\nTesting API server...');
    try {
      const response = await axios.get('http://localhost:5000/api/test');
      console.log('API server response:', response.data);
      console.log('API server is running correctly');
    } catch (error) {
      console.error('API server test failed:');
      if (error.code === 'ECONNREFUSED') {
        console.error('Connection refused. Make sure the server is running on port 5000.');
      } else {
        console.error('Error message:', error.message);
        if (error.response) {
          console.error('Response status:', error.response.status);
          console.error('Response data:', error.response.data);
        }
      }
      process.exit(1);
    }
    
    // 5. Test authentication endpoint
    console.log('\nTesting authentication endpoint...');
    try {
      const authStatusResponse = await axios.get('http://localhost:5000/api/auth/status');
      console.log('Auth status response:', authStatusResponse.data);
    } catch (error) {
      console.error('Authentication status check failed:');
      console.error('Error message:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      process.exit(1);
    }
    
    console.log('\nServer verification completed successfully! 🎉');
    console.log('You can now use the system with these credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    
    // Close database connection
    await db.destroy();
    
    process.exit(0);
  } catch (error) {
    console.error('\nVerification failed with error:', error);
    process.exit(1);
  }
}

// Run verification
verifyServer();
