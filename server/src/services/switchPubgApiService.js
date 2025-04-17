/**
 * PUBG API Service Switcher Script
 * This script allows switching between different PUBG API service implementations
 * without restarting the server.
 * 
 * Usage:
 * node switchPubgApiService.js --fixed     (use the fixed implementation)
 * node switchPubgApiService.js --original  (revert to original implementation)
 */

const fs = require('fs');
const path = require('path');

// Paths to service files
const SERVICES_DIR = path.join(__dirname);
const PUBG_API_SERVICE = path.join(SERVICES_DIR, 'pubgApiService.js');
const ORIGINAL_BACKUP = path.join(SERVICES_DIR, 'pubgApiService.js.original');
const FIXED_SERVICE = path.join(SERVICES_DIR, 'fixedPubgApiService.js');

// Check command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || !['-f', '--fixed', '-o', '--original'].includes(args[0])) {
  console.log('Usage:');
  console.log('  node switchPubgApiService.js --fixed     (use the fixed implementation)');
  console.log('  node switchPubgApiService.js --original  (revert to original implementation)');
  process.exit(1);
}

// Determine which mode to use
const useFixed = args[0] === '-f' || args[0] === '--fixed';

function backupOriginalIfNeeded() {
  if (!fs.existsSync(ORIGINAL_BACKUP)) {
    console.log('Creating backup of original pubgApiService.js...');
    fs.copyFileSync(PUBG_API_SERVICE, ORIGINAL_BACKUP);
    console.log('Backup created.');
  }
}

// Switch to fixed implementation
if (useFixed) {
  try {
    // Backup the original file if needed
    backupOriginalIfNeeded();
    
    // Write the fixed proxy to pubgApiService.js
    const proxyContent = `/**
 * This is a proxy to the fixed PUBG API service implementation
 * It avoids circular dependencies that were causing issues with the enhanced service
 */
const fixedPubgApiService = require('./fixedPubgApiService');

// Log that we're using the fixed service
console.log('Using fixed PUBG API service with enhanced capabilities');

// Export the fixed service directly
module.exports = fixedPubgApiService;`;
    
    fs.writeFileSync(PUBG_API_SERVICE, proxyContent);
    console.log('Switched to fixed PUBG API service implementation.');
    
    // Also update the enhanced service to use the fixed implementation
    const enhancedContent = `/**
 * This file is a legacy compatibility layer.
 * The enhanced functionality has been directly incorporated into fixedPubgApiService.js
 * which is what pubgApiService.js now uses.
 */
const fixedPubgApiService = require('./fixedPubgApiService');

// Log that we're using the fixed service directly
console.log('Using integrated enhanced PUBG API service');

// Export the fixed service directly
module.exports = fixedPubgApiService;`;
    
    fs.writeFileSync(path.join(SERVICES_DIR, 'pubgApiServiceEnhanced.js'), enhancedContent);
    console.log('Updated enhanced service to use fixed implementation.');
    
  } catch (error) {
    console.error('Error switching to fixed implementation:', error);
    process.exit(1);
  }
} else {
  // Revert to original implementation
  try {
    if (!fs.existsSync(ORIGINAL_BACKUP)) {
      console.error('Cannot revert: No backup file found.');
      process.exit(1);
    }
    
    fs.copyFileSync(ORIGINAL_BACKUP, PUBG_API_SERVICE);
    console.log('Reverted to original PUBG API service implementation.');
  } catch (error) {
    console.error('Error reverting to original implementation:', error);
    process.exit(1);
  }
}

console.log('Done. You may need to restart your server for changes to take effect.');
