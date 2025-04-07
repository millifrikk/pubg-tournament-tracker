const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { db } = require('../db/connection');
const { JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV } = require('../config/environment');
const { authenticateJWT } = require('../middleware/auth');

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role = 'user' // Default role
    } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    // Check if username already exists
    const existingUsername = await db('users')
      .where({ username })
      .first();
    
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Check if email already exists
    const existingEmail = await db('users')
      .where({ email })
      .first();
    
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // For security, only allow admin role to be set internally
    const safeRole = role === 'admin' ? 'user' : role;
    
    // Create user
    const [user] = await db('users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        role: safeRole,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning(['id', 'username', 'email', 'role', 'created_at']);
    
    // Generate JWT token with a standardized payload structure
    const tokenPayload = { 
      id: user.id, 
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: new Date().toISOString()
    };
    
    console.log('Generating token with payload:', JSON.stringify(tokenPayload));
    
    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Verify token to ensure it's generated correctly
    const decodedToken = jwt.verify(token, JWT_SECRET);
    console.log('Token verified with ID:', decodedToken.id);
    
    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ 
      error: 'Error registering user',
      details: error.message
    });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    
    console.log('Login attempt:', usernameOrEmail);
    console.log('Request body:', req.body);
    console.log('Headers:', req.headers);
    
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }
    
    // Check if users table exists
    const usersTableExists = await db.schema.hasTable('users');
    if (!usersTableExists) {
      console.error('Users table does not exist!');
      return res.status(500).json({ error: 'Database schema is not properly set up' });
    }
    
    // Find user by username or email
    const user = await db('users')
      .where({ username: usernameOrEmail })
      .orWhere({ email: usernameOrEmail })
      .first();
    
    if (!user) {
      console.log(`User not found: ${usernameOrEmail}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log(`User found: ${user.username}`);
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      console.log('Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('Password validated successfully');
    
    // Update last login timestamp
    await db('users')
      .where({ id: user.id })
      .update({ 
        last_login: new Date(),
        updated_at: new Date()
      });
    
    // Generate JWT token with a standardized payload structure
    const tokenPayload = { 
      id: user.id, 
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: new Date().toISOString()
    };
    
    console.log('Generating token with payload:', JSON.stringify(tokenPayload));
    
    const token = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Verify token to ensure it's generated correctly
    const decodedToken = jwt.verify(token, JWT_SECRET);
    console.log('Token verified with ID:', decodedToken.id);
    
    // Return user data without password
    const { password_hash, ...userData } = user;
    
    console.log('Login successful');
    
    res.json({
      message: 'Login successful',
      user: userData,
      token
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ 
      error: 'Error logging in',
      details: error.message
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user
 * @access Private
 */
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    // Get user from database
    const user = await db('users')
      .where({ id: req.user.id })
      .first();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user data without password
    const { password_hash, ...userData } = user;
    
    res.json({
      user: userData
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ 
      error: 'Error getting current user',
      details: error.message
    });
  }
});

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token
 * @access Private
 */
router.post('/refresh', async (req, res) => {
  try {
    // Get token from body
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    // Check if token is not too old (e.g., not more than 30 days)
    const tokenIssuedAt = new Date(decoded.iat * 1000);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    if (tokenIssuedAt < thirtyDaysAgo) {
      return res.status(401).json({ error: 'Token too old, please login again' });
    }
    
    // Get user from database
    const user = await db('users')
      .where({ id: decoded.id })
      .first();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate new JWT token with standardized payload structure
    const tokenPayload = { 
      id: user.id, 
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: new Date().toISOString()
    };
    
    console.log('Generating refresh token with payload:', JSON.stringify(tokenPayload));
    
    const newToken = jwt.sign(
      tokenPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Verify token to ensure it's generated correctly
    const decodedToken = jwt.verify(newToken, JWT_SECRET);
    console.log('Refresh token verified with ID:', decodedToken.id);
    
    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    res.status(500).json({ 
      error: 'Error refreshing token',
      details: error.message
    });
  }
});

/**
 * @route GET /api/auth/status
 * @desc Check authentication status and system health
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      auth: {
        jwtSecret: JWT_SECRET ? 'configured' : 'missing',
        jwtExpiry: JWT_EXPIRES_IN || 'default'
      },
      database: {
        connected: false,
        tablesExist: false,
        adminUserExists: false
      },
      system: {
        environment: NODE_ENV,
        serverTime: new Date().toISOString(),
        version: process.version
      }
    };
    
    // Check database connection
    try {
      await db.raw('SELECT 1+1 AS result');
      status.database.connected = true;
      
      // Check if tables exist
      const usersTableExists = await db.schema.hasTable('users');
      status.database.tablesExist = usersTableExists;
      
      if (usersTableExists) {
        // Check if admin user exists
        const adminUser = await db('users').where({ username: 'admin' }).first();
        status.database.adminUserExists = !!adminUser;
      }
    } catch (dbError) {
      console.error('Database error in status check:', dbError);
      status.database.error = dbError.message;
    }
    
    res.json(status);
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.status(500).json({ 
      error: 'Error checking auth status',
      details: error.message
    });
  }
});

// Development only route to reset admin password (only available in development)
if (NODE_ENV === 'development') {
  router.post('/reset-admin', async (req, res) => {
    try {
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash('admin123', saltRounds);
      
      // Find admin user
      const adminUser = await db('users').where({ username: 'admin' }).first();
      
      if (adminUser) {
        // Update password
        await db('users')
          .where({ username: 'admin' })
          .update({ 
            password_hash: passwordHash,
            updated_at: new Date()
          });
        
        return res.json({ message: 'Admin password reset to admin123' });
      }
      
      // If admin doesn't exist, create it
      await db('users').insert({
        id: '00000000-0000-0000-0000-000000000000', // Default UUID for development
        username: 'admin',
        email: 'admin@example.com',
        password_hash: passwordHash,
        role: 'admin',
        created_at: new Date(),
        updated_at: new Date()
      });
      
      res.json({ message: 'Admin user created with password: admin123' });
    } catch (error) {
      console.error('Error resetting admin password:', error);
      res.status(500).json({ 
        error: 'Error resetting admin password',
        details: error.message
      });
    }
  });
  
  // Special endpoint to directly login as admin in development
  router.get('/dev-login', async (req, res) => {
    try {
      // Find or create admin user
      let adminUser = await db('users').where({ username: 'admin' }).first();
      
      if (!adminUser) {
        // Create admin user if it doesn't exist
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash('admin123', saltRounds);
        
        [adminUser] = await db('users')
          .insert({
            id: '00000000-0000-0000-0000-000000000000', // Default UUID for development
            username: 'admin',
            email: 'admin@example.com',
            password_hash: passwordHash,
            role: 'admin',
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning(['id', 'username', 'email', 'role', 'created_at']);
      }
      
      // Generate JWT token with a standardized payload structure
      const tokenPayload = { 
        id: adminUser.id, 
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role,
        createdAt: new Date().toISOString()
      };
      
      console.log('Generating admin token with payload:', JSON.stringify(tokenPayload));
      
      const token = jwt.sign(
        tokenPayload,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // Verify token to ensure it's generated correctly
      const decodedToken = jwt.verify(token, JWT_SECRET);
      console.log('Admin token verified with ID:', decodedToken.id);
      
      // Return user data without password
      const { password_hash, ...userData } = adminUser;
      
      console.log('Development auto-login successful');
      
      res.json({
        message: 'Development auto-login successful',
        user: userData,
        token
      });
    } catch (error) {
      console.error('Error in dev-login:', error);
      res.status(500).json({ 
        error: 'Error in dev-login',
        details: error.message
      });
    }
  });
}

module.exports = router;
