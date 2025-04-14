/**
 * Service Validator
 * 
 * Validates that essential services are properly configured and functioning.
 * This runs at server startup to ensure critical components are working.
 */

const pubgApiService = require('./pubgApiService');
const fs = require('fs');
const path = require('path');

console.log('Validating PUBG API Service...');

// Check if the pubgApiService has necessary functions
const hasSearchFunction = typeof pubgApiService.searchCustomMatches === 'function';
const hasMatchFunction = typeof pubgApiService.getMatch === 'function';
const hasTelemetryFunction = typeof pubgApiService.getTelemetry === 'function' || 
                             typeof pubgApiService.extractTelemetryUrl === 'function';

// Check if this is the enhanced service by checking file size
const enhancedApiPath = path.join(__dirname, 'pubgApiServiceEnhanced.js');
const currentApiPath = path.join(__dirname, 'pubgApiService.js');

let isEnhanced = false;
try {
  if (fs.existsSync(enhancedApiPath) && fs.existsSync(currentApiPath)) {
    const enhancedStats = fs.statSync(enhancedApiPath);
    const currentStats = fs.statSync(currentApiPath);
    
    // Enhanced service is typically larger due to added retry logic
    isEnhanced = currentStats.size > enhancedStats.size * 0.8;
  }
} catch (error) {
  console.error('Error checking service files:', error.message);
}

// Log validation results
console.log('Service Validation Results:');
console.log('- searchCustomMatches function exists:', hasSearchFunction);
console.log('- getMatch function exists:', hasMatchFunction);
console.log('- Telemetry functions exist:', hasTelemetryFunction);
console.log('- Using Enhanced API Service:', isEnhanced);

// Alert if any required functions are missing
if (!hasSearchFunction || !hasMatchFunction || !hasTelemetryFunction) {
  console.error('WARNING: PUBG API Service is missing required functions!');
  console.error('This may cause errors when using the application.');
  console.error('Try running: node src/api/switchToEnhancedApiService.js --enhanced');
}

// Alert if not using enhanced service
if (!isEnhanced) {
  console.warn('WARNING: Not using Enhanced PUBG API Service.');
  console.warn('The standard service may have issues with rate limiting and connection resets.');
  console.warn('Consider switching to the enhanced service for better stability.');
  console.warn('Run: node src/api/switchToEnhancedApiService.js --enhanced');
}

console.log('Service validation complete.');

module.exports = {
  isValid: hasSearchFunction && hasMatchFunction && hasTelemetryFunction,
  isEnhanced: isEnhanced
};