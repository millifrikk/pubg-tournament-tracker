/**
 * Enhanced error handling middleware
 * Specifically handles ECONNRESET errors from PUBG API
 */

const errorHandlingMiddleware = (err, req, res, next) => {
  // Log the error for debugging
  console.error('API Error:', err);
  
  // Check for ECONNRESET errors specifically
  if (err.code === 'ECONNRESET') {
    console.error('Connection reset by API server - special handling');
    return res.status(503).json({
      error: 'Connection reset by the API server',
      message: 'The request was interrupted. Please try again in a few moments or use the Lite endpoint for more reliability.',
      code: 'ECONNRESET'
    });
  }
  
  // Handle request timeout errors
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return res.status(504).json({
      error: 'Request timed out',
      message: 'The API server is taking too long to respond. Try using the Lite endpoint for more reliability.',
      code: 'TIMEOUT'
    });
  }
  
  // Handle proxy errors
  if (err.message?.includes('Proxy Error')) {
    return res.status(502).json({
      error: 'Proxy Error',
      message: 'There was an issue connecting to the PUBG API. Please try using the Lite endpoint instead.',
      code: 'PROXY_ERROR'
    });
  }
  
  // Handle rate limiting errors
  if (err.response?.status === 429 || err.message?.includes('rate limit')) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'The PUBG API rate limit has been reached. Please wait a few minutes and try again.',
      code: 'RATE_LIMIT'
    });
  }
  
  // Default error handling
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandlingMiddleware;