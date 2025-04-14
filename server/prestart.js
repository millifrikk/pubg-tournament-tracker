/**
 * PUBG Tournament Tracker - Server Pre-start Script
 * 
 * This script runs before the server starts to ensure the enhanced API service is active.
 */

const fs = require('fs');
const path = require('path');

console.log('Running pre-start checks...');

// Check if enhancedApi is available
const enhancedApiPath = path.join(__dirname, 'src', 'services', 'pubgApiServiceEnhanced.js');
const standardApiPath = path.join(__dirname, 'src', 'services', 'pubgApiService.js');
const backupApiPath = path.join(__dirname, 'src', 'services', 'pubgApiService.js.backup');

if (!fs.existsSync(enhancedApiPath)) {
  console.warn('Warning: Enhanced API service file not found. Some features may not work correctly.');
} else {
  console.log('Enhanced API service file found.');
  
  // Check if we need to activate it
  if (fs.existsSync(standardApiPath)) {
    // If backup doesn't exist, create it
    if (!fs.existsSync(backupApiPath)) {
      try {
        fs.copyFileSync(standardApiPath, backupApiPath);
        console.log('Created backup of standard API service.');
      } catch (error) {
        console.error('Error creating backup:', error.message);
      }
    }
    
    // Compare file sizes to determine if enhanced API is active
    const standardStats = fs.statSync(standardApiPath);
    const enhancedStats = fs.statSync(enhancedApiPath);
    
    if (standardStats.size < enhancedStats.size * 0.8) {
      console.log('Standard API service appears to be different from enhanced service.');
      console.log('Activating enhanced API service...');
      
      try {
        fs.copyFileSync(enhancedApiPath, standardApiPath);
        console.log('Successfully activated enhanced PUBG API service!');
      } catch (error) {
        console.error('Error activating enhanced service:', error.message);
      }
    } else {
      console.log('Enhanced API service appears to be already active.');
    }
  }
}

console.log('Pre-start checks completed.');
