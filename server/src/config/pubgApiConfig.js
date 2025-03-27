module.exports = {
  pubg: {
    baseUrl: 'https://api.pubg.com',
    rateLimits: {
      requestsPerMinute: 9,
      timeout: 10000 // 10 seconds
    },
    platforms: {
      steam: 'steam',
      xbox: 'xbox',
      playstation: 'psn'
    }
  },
  caching: {
    enabled: true,
    ttl: 300 // 5 minutes cache duration
  },
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
  }
};