#!/usr/bin/env node

/**
 * This is a startup script that ensures the fixed PUBG API service is used.
 * It will start the server with the correct service implementation.
 */

// First, ensure our fixed service is in place
const fs = require('fs');
const path = require('path');

// Paths to service files
const SERVICES_DIR = path.join(__dirname, 'src', 'services');
const PUBG_API_SERVICE = path.join(SERVICES_DIR, 'pubgApiService.js');
const PUBG_API_SERVICE_ENHANCED = path.join(SERVICES_DIR, 'pubgApiServiceEnhanced.js');
const FIXED_SERVICE = path.join(SERVICES_DIR, 'fixedPubgApiService.js');

// Check if the fixed service exists
if (!fs.existsSync(FIXED_SERVICE)) {
  console.error('ERROR: Fixed PUBG API service not found. Please check the installation.');
  process.exit(1);
}

// Ensure pubgApiService.js is using the fixed implementation
const correctApiServiceContent = `/**
 * This is a proxy to the fixed PUBG API service implementation
 * It avoids circular dependencies that were causing issues with the enhanced service
 */
const fixedPubgApiService = require('./fixedPubgApiService');

// Log that we're using the fixed service
console.log('Using fixed PUBG API service with enhanced capabilities');

// Export the fixed service directly
module.exports = fixedPubgApiService;`;

fs.writeFileSync(PUBG_API_SERVICE, correctApiServiceContent);
console.log('Updated pubgApiService.js to use the fixed implementation');

// Ensure pubgApiServiceEnhanced.js is also using the fixed implementation
const correctEnhancedServiceContent = `/**
 * This file is a legacy compatibility layer.
 * The enhanced functionality has been directly incorporated into fixedPubgApiService.js
 * which is what pubgApiService.js now uses.
 */
const fixedPubgApiService = require('./fixedPubgApiService');

// Log that we're using the fixed service directly
console.log('Using integrated enhanced PUBG API service');

// Export the fixed service directly
module.exports = fixedPubgApiService;`;

fs.writeFileSync(PUBG_API_SERVICE_ENHANCED, correctEnhancedServiceContent);
console.log('Updated pubgApiServiceEnhanced.js to use the fixed implementation');

console.log('All services have been configured correctly');

// Now start the server
require('./src/index.js');
