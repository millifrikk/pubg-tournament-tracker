const path = require('path');
const { spawn } = require('child_process');

// Path to the switchToEnhancedApiService.js script
const scriptPath = path.join(__dirname, '..', 'api', 'switchToEnhancedApiService.js');

// Execute the script with the --enhanced flag
const child = spawn('node', [scriptPath, '--enhanced'], { stdio: 'inherit' });

child.on('close', (code) => {
  console.log(`Script exited with code ${code}`);
  process.exit(code);
});