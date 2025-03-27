// Environment variables
module.exports = {
  // Server
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 5433,
  DB_USER: process.env.DB_USER || 'pubgadmin',
  DB_PASSWORD: process.env.DB_PASSWORD || 'your_secure_password',
  DB_NAME: process.env.DB_NAME || 'pubg_tournaments',
  
  // Redis
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || null,
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  
  // PUBG API
  PUBG_API_KEY: process.env.PUBG_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiI4NDEzNDM5MC05NTBhLTAxM2QtZmZlMC0wMmQ1ZjFjNWQ0YzEiLCJpc3MiOiJnYW1lbG9ja2VyIiwiaWF0IjoxNzMzMzg0NTk3LCJwdWIiOiJibHVlaG9sZSIsInRpdGxlIjoicHViZyIsImFwcCI6ImdhbWUtc3RhdHMtcHViIn0.fj4j3RSoYSvqV0i8TeCGJFN3dmh3W1iwzWO5zCi6SZU',
  PUBG_API_BASE_URL: process.env.PUBG_API_BASE_URL || 'https://api.pubg.com',
  
  // API rate limiting
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX || 100, // 100 requests per window
  
  // CORS config
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  // Caching
  CACHE_ENABLED: process.env.CACHE_ENABLED === 'true' || true,
  PLAYER_CACHE_TTL: process.env.PLAYER_CACHE_TTL || 15 * 60, // 15 minutes in seconds
  MATCH_CACHE_TTL: process.env.MATCH_CACHE_TTL || 60 * 60 * 24, // 24 hours in seconds
};
