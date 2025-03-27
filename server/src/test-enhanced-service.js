// Simple script to test if the enhanced PUBG API service is working
require('dotenv').config();
const pubgApiService = require('./services/pubgApiService');

// Check if the enhanced service methods are available
console.log('\n===== ENHANCED SERVICE TEST =====');
console.log('Enhanced methods available:');
console.log('- searchCustomMatches:', typeof pubgApiService.searchCustomMatches === 'function' ? 'YES ✅' : 'NO ❌');
console.log('- isLikelyCustomMatch:', typeof pubgApiService.isLikelyCustomMatch === 'function' ? 'YES ✅' : 'NO ❌');
console.log('- getMatchType:', typeof pubgApiService.getMatchType === 'function' ? 'YES ✅' : 'NO ❌');

// Check Redis configuration
console.log('\nRedis Configuration:');
const hasRedisConfig = !!(process.env.REDIS_HOST && process.env.REDIS_PORT);
console.log('Redis config present:', hasRedisConfig ? 'YES ✅' : 'NO ❌');
console.log('Cache enabled:', process.env.CACHE_ENABLED === 'true' ? 'YES ✅' : 'NO ❌');

// Check rate limiter configuration
console.log('\nRate Limiter Configuration:');
if (pubgApiService.rateLimiter) {
  console.log('Rate limiter available: YES ✅');
  console.log(`Max requests: ${pubgApiService.rateLimiter.maxRequests} per minute`);
} else {
  // Check if there's a function level rate limiter in the code
  const serviceCode = require('fs').readFileSync('./src/services/pubgApiService.js', 'utf8');
  const hasRateLimiterCode = serviceCode.includes('rateLimiter') || 
                            serviceCode.includes('rate limit') || 
                            serviceCode.includes('Rate limiter');
  console.log('Rate limiter in code:', hasRateLimiterCode ? 'YES ✅' : 'NO ❌');
}

console.log('\n===== TEST COMPLETE =====');
console.log('Result: The enhanced PUBG API service appears to be', 
  (typeof pubgApiService.searchCustomMatches === 'function' && 
   typeof pubgApiService.isLikelyCustomMatch === 'function') 
    ? 'ACTIVE ✅' : 'NOT ACTIVE ❌');
console.log('You can now restart your server and test the "Find Match" feature.\n');