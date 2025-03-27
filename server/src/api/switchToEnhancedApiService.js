const fs = require('fs');
const path = require('path');

/**
 * Utility script to switch between standard and enhanced PUBG API services
 * Run this with node: 
 * - node src/api/switchToEnhancedApiService.js --enhanced
 * - node src/api/switchToEnhancedApiService.js --standard
 */

// Define paths
const standardApiPath = path.join(__dirname, '..', 'services', 'pubgApiService.js');
const enhancedApiPath = path.join(__dirname, '..', 'services', 'pubgApiServiceEnhanced.js');
const backupPath = path.join(__dirname, '..', 'services', 'pubgApiService.js.backup');

// Get command line argument
const args = process.argv.slice(2);
const shouldUseEnhanced = args.includes('--enhanced');
const shouldUseStandard = args.includes('--standard');

async function switchApiService() {
  try {
    // Validate arguments
    if (!shouldUseEnhanced && !shouldUseStandard) {
      console.error('Please specify either --enhanced or --standard');
      process.exit(1);
    }
    
    if (shouldUseEnhanced) {
      console.log('Switching to enhanced PUBG API service with improved rate limiting and error handling...');
      
      // Check if enhanced API service exists
      if (!fs.existsSync(enhancedApiPath)) {
        console.error('Enhanced API service not found at:', enhancedApiPath);
        process.exit(1);
      }
      
      // Backup standard API service if not already backed up
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(standardApiPath, backupPath);
        console.log('Standard API service backed up to:', backupPath);
      }
      
      // Copy enhanced API service to standard API path
      fs.copyFileSync(enhancedApiPath, standardApiPath);
      console.log('Enhanced API service now active');
    } else if (shouldUseStandard) {
      console.log('Switching back to standard PUBG API service...');
      
      // Check if backup exists
      if (!fs.existsSync(backupPath)) {
        console.error('No backup of standard API service found');
        process.exit(1);
      }
      
      // Restore standard API service from backup
      fs.copyFileSync(backupPath, standardApiPath);
      console.log('Standard API service restored from backup');
    }
    
    console.log('API service switched successfully. Please restart the server for changes to take effect.');
  } catch (error) {
    console.error('Error switching API service:', error);
    process.exit(1);
  }
}

// Run the script
switchApiService();