const fs = require('fs');
const path = require('path');

const enhancedApi = path.join(__dirname, '../services/pubgApiServiceEnhanced.js');
const standardApi = path.join(__dirname, '../services/pubgApiService.js');
const backupApi = path.join(__dirname, '../services/pubgApiService.js.backup');

const mode = process.argv[2];

if (mode === '--enhanced') {
  // Backup current service if it exists and backup doesn't exist
  if (fs.existsSync(standardApi) && !fs.existsSync(backupApi)) {
    console.log('Backing up current API service...');
    fs.copyFileSync(standardApi, backupApi);
  }
  
  // Copy enhanced service
  if (fs.existsSync(enhancedApi)) {
    console.log('Activating enhanced PUBG API service...');
    fs.copyFileSync(enhancedApi, standardApi);
    console.log('Switched to Enhanced PUBG API Service');
  } else {
    console.error('Error: Enhanced API service file not found at', enhancedApi);
  }
} else if (mode === '--standard') {
  // Restore standard service from backup
  if (fs.existsSync(backupApi)) {
    console.log('Restoring standard PUBG API service...');
    fs.copyFileSync(backupApi, standardApi);
    console.log('Switched to Standard PUBG API Service');
  } else {
    console.error('Error: Backup API service file not found at', backupApi);
  }
} else {
  console.log('Usage: node switchToEnhancedApiService.js --enhanced|--standard');
}