const jwt = require('jsonwebtoken');
const { JWT_SECRET, NODE_ENV } = require('../config/environment');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateJWT = (req, res, next) => {
  // Log authentication attempt
  console.log(`Authentication attempt for ${req.method} ${req.path}`);
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authorization header is missing or invalid',
      message: 'Please provide a valid Bearer token in the Authorization header'
    });
  }
  
  // Extract the token - format 'Bearer TOKEN'
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token is missing' });
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Log successful verification
    console.log('Token verified for user:', decoded.id);
    
    // Attach the decoded user to the request object
    req.user = decoded;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('JWT Verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token format or signature' });
    }
    
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware to check for admin role
 * Must be used after authenticateJWT
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

module.exports = {
  authenticateJWT,
  requireAdmin
};