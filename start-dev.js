const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Define base directory
const baseDir = __dirname;
const serverDir = path.join(baseDir, 'server');
const clientDir = path.join(baseDir, 'client');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to check if a directory exists
function directoryExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (err) {
    return false;
  }
}

// Validate that directories exist
if (!directoryExists(serverDir)) {
  console.error(`${colors.red}Server directory not found: ${serverDir}${colors.reset}`);
  process.exit(1);
}

if (!directoryExists(clientDir)) {
  console.error(`${colors.red}Client directory not found: ${clientDir}${colors.reset}`);
  process.exit(1);
}

// Start backend server
console.log(`${colors.cyan}Starting backend server...${colors.reset}`);
const server = spawn('npm', ['start'], {
  cwd: serverDir,
  env: { ...process.env, PORT: 5000 },
  shell: true
});

server.stdout.on('data', (data) => {
  console.log(`${colors.green}[SERVER] ${data.toString().trim()}${colors.reset}`);
});

server.stderr.on('data', (data) => {
  console.error(`${colors.red}[SERVER ERROR] ${data.toString().trim()}${colors.reset}`);
});

// Give the server some time to start up before starting the client
setTimeout(() => {
  console.log(`${colors.cyan}Starting frontend client...${colors.reset}`);
  const client = spawn('npm', ['start'], {
    cwd: clientDir,
    env: { ...process.env, PORT: 3000, BROWSER: 'none' },
    shell: true
  });

  client.stdout.on('data', (data) => {
    console.log(`${colors.blue}[CLIENT] ${data.toString().trim()}${colors.reset}`);
  });

  client.stderr.on('data', (data) => {
    console.error(`${colors.magenta}[CLIENT ERROR] ${data.toString().trim()}${colors.reset}`);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log(`${colors.yellow}Stopping all processes...${colors.reset}`);
    client.kill();
    server.kill();
    process.exit();
  });
}, 5000); // 5 second delay to allow server to start

console.log(`${colors.yellow}Development environment starting...${colors.reset}`);
console.log(`${colors.yellow}Server will be available at: http://localhost:5000${colors.reset}`);
console.log(`${colors.yellow}Client will be available at: http://localhost:3000${colors.reset}`);
console.log(`${colors.yellow}Press Ctrl+C to stop both servers.${colors.reset}`);
