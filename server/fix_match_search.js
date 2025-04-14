/**
 * PUBG Tournament Tracker - Fix Match Search ECONNRESET Issues
 * 
 * This script activates the enhanced API service with retry logic and better error handling
 * to resolve the "read ECONNRESET" errors when searching for matches.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('Starting PUBG API Enhancement Process...');

// Step 1: Ensure the enhanced API service exists
const enhancedApiPath = path.join(__dirname, 'src', 'services', 'pubgApiServiceEnhanced.js');
if (!fs.existsSync(enhancedApiPath)) {
  console.error('Error: Enhanced API service file not found at', enhancedApiPath);
  console.log('This script requires the pubgApiServiceEnhanced.js file to be present.');
  process.exit(1);
}

// Step 2: Run the script to switch to the enhanced API service
console.log('Switching to enhanced PUBG API service...');
const activateScript = path.join(__dirname, 'src', 'api', 'switchToEnhancedApiService.js');

const child = spawn('node', [activateScript, '--enhanced'], { stdio: 'inherit' });

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`Activation script exited with code ${code}`);
    process.exit(code);
  }
  
  console.log('Successfully activated enhanced PUBG API service!');
  console.log('\nFixes implemented:');
  console.log('1. Enhanced API service with retry logic');
  console.log('2. Better error handling for ECONNRESET errors');
  console.log('3. Rate limiting to prevent API overload');
  console.log('4. Improved error messages for users');
  
  console.log('\nNext steps:');
  console.log('1. Restart the server to apply changes');
  console.log('2. Try searching for matches again');
  console.log('3. If you still encounter issues, try searching with a more specific player name');
  
  process.exit(0);
});
