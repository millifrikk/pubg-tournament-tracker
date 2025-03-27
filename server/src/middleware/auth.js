const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/environment');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateJWT = (req, res, next) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is missing' });
  }
  
  // Extract the token - format 'Bearer TOKEN'
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token is missing' });
  }
  
  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach the decoded user to the request object
    req.user = decoded;
    
    // Continue to the next middleware or route handler
    next();
  } catch (error) {
    console.error('JWT Verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
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