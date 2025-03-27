/**
 * PUBG API Connection Fix Installation Script
 * 
 * This script applies all the necessary fixes to resolve ECONNRESET issues
 * when connecting to the PUBG API.
 * 
 * Run with: node apply-api-fixes.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const serverRoot = path.join(__dirname, 'server');
const clientRoot = path.join(__dirname, 'client');

console.log('PUBG Tournament Tracker - API Connection Fix Installation');
console.log('======================================================');
console.log('This script will apply all fixes for the ECONNRESET issues.');
console.log();

function copyFile(source, destination) {
  try {
    fs.copyFileSync(source, destination);
    console.log(`✅ Copied ${path.basename(source)} to ${path.basename(destination)}`);
    return true;
  } catch (err) {
    console.error(`❌ Error copying ${path.basename(source)}: ${err.message}`);
    return false;
  }
}

function backupFile(filePath) {
  const backupPath = `${filePath}.backup`;
  
  // Check if backup already exists
  if (fs.existsSync(backupPath)) {
    console.log(`⚠️ Backup already exists for ${path.basename(filePath)}`);
    return backupPath;
  }
  
  try {
    fs.copyFileSync(filePath, backupPath);
    console.log(`✅ Created backup of ${path.basename(filePath)}`);
    return backupPath;
  } catch (err) {
    console.error(`❌ Error creating backup of ${path.basename(filePath)}: ${err.message}`);
    return null;
  }
}

function applyServerFixes() {
  console.log('\n📦 Applying server-side fixes...');
  
  // Ensure services directory exists
  const servicesDir = path.join(serverRoot, 'src', 'services');
  if (!fs.existsSync(servicesDir)) {
    console.error(`❌ Services directory not found at ${servicesDir}`);
    return false;
  }
  
  // Backup existing pubgApiService.js
  const pubgApiServicePath = path.join(servicesDir, 'pubgApiService.js');
  if (fs.existsSync(pubgApiServicePath)) {
    backupFile(pubgApiServicePath);
  }
  
  // Copy enhanced service
  const enhancedServicePath = path.join(__dirname, 'server', 'src', 'services', 'pubgApiServiceEnhanced.js');
  if (fs.existsSync(enhancedServicePath)) {
    copyFile(enhancedServicePath, pubgApiServicePath);
  } else {
    console.error('❌ Enhanced API service not found. Please ensure all fix files are present.');
    return false;
  }
  
  // Ensure middleware directory exists
  const middlewareDir = path.join(serverRoot, 'src', 'middleware');
  if (!fs.existsSync(middlewareDir)) {
    fs.mkdirSync(middlewareDir, { recursive: true });
    console.log('✅ Created middleware directory');
  }
  
  // Copy error handling middleware
  const errorMiddlewarePath = path.join(middlewareDir, 'errorHandling.js');
  if (!fs.existsSync(errorMiddlewarePath)) {
    const sourceErrorPath = path.join(__dirname, 'server', 'src', 'middleware', 'errorHandling.js');
    copyFile(sourceErrorPath, errorMiddlewarePath);
  }
  
  // Create sample cache directory if it doesn't exist
  const cacheDir = path.join(serverRoot, 'cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    console.log('✅ Created cache directory');
  }
  
  console.log('✅ Server-side fixes applied successfully');
  return true;
}

function applyClientFixes() {
  console.log('\n📦 Applying client-side fixes...');
  
  // Ensure services directory exists
  const servicesDir = path.join(clientRoot, 'src', 'services');
  if (!fs.existsSync(servicesDir)) {
    console.error(`❌ Services directory not found at ${servicesDir}`);
    return false;
  }
  
  // Copy enhanced match service
  const enhancedServicePath = path.join(__dirname, 'client', 'src', 'services', 'matchesServiceEnhanced.js');
  if (fs.existsSync(enhancedServicePath)) {
    const destPath = path.join(servicesDir, 'matchesServiceEnhanced.js');
    copyFile(enhancedServicePath, destPath);
  } else {
    console.error('❌ Enhanced match service not found. Please ensure all fix files are present.');
    return false;
  }
  
  // Backup and update index.js
  const indexPath = path.join(clientRoot, 'src', 'index.js');
  if (fs.existsSync(indexPath)) {
    backupFile(indexPath);
    const sourceIndexPath = path.join(__dirname, 'client', 'src', 'index.js');
    copyFile(sourceIndexPath, indexPath);
  }
  
  // Ensure toggle switch CSS exists
  const stylesDir = path.join(clientRoot, 'src', 'styles');
  if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
    console.log('✅ Created styles directory');
  }
  
  const toggleCssPath = path.join(stylesDir, 'toggle-switch.css');
  if (!fs.existsSync(toggleCssPath)) {
    const sourceTogglePath = path.join(__dirname, 'client', 'src', 'styles', 'toggle-switch.css');
    copyFile(sourceTogglePath, toggleCssPath);
  }
  
  console.log('✅ Client-side fixes applied successfully');
  return true;
}

function restartServices() {
  console.log('\n🔄 Restarting services...');
  
  try {
    console.log('➡️ Installing any new dependencies...');
    execSync('npm install', { stdio: 'inherit', cwd: serverRoot });
    execSync('npm install', { stdio: 'inherit', cwd: clientRoot });
    
    console.log('✅ Dependency installation complete');
    return true;
  } catch (err) {
    console.error(`❌ Error during service restart: ${err.message}`);
    return false;
  }
}

function main() {
  let success = true;
  
  success = applyServerFixes() && success;
  success = applyClientFixes() && success;
  success = restartServices() && success;
  
  if (success) {
    console.log('\n✨ All fixes have been successfully applied!');
    console.log('\nNext steps:');
    console.log('1. Start your server with: npm start');
    console.log('2. Start your client with: npm start (in the client directory)');
    console.log('3. When using the app, toggle to "Enhanced Mode" for better reliability');
    console.log('\nIf you encounter any issues, please refer to the PUBG_API_CONNECTION_FIX.md file for details.');
  } else {
    console.log('\n⚠️ Some fixes could not be applied. Please check the error messages above.');
    console.log('You may need to apply the remaining fixes manually.');
  }
}

// Run the installation
main();
