// Special launcher for WSL2 environment
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Define special Puppeteer arguments for WSL2
const puppeteerArgs = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--single-process'
];

// Set environment variables for the child process
const env = {
  ...process.env,
  PUPPETEER_ARGS: puppeteerArgs.join(' '),
  NODE_OPTIONS: '--unhandled-rejections=strict'
};

console.log('Starting WhatsApp Assistant with WSL2 configuration...');
console.log('Puppeteer Args:', env.PUPPETEER_ARGS);

// Spawn the main application
const appProcess = spawn('node', ['index.js'], {
  env,
  stdio: 'inherit'
});

// Handle process events
appProcess.on('exit', (code) => {
  console.log(`Child process exited with code ${code}`);
});

// Handle signals
process.on('SIGINT', () => {
  console.log('Received SIGINT, forwarding to child process...');
  appProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, forwarding to child process...');
  appProcess.kill('SIGTERM');
});