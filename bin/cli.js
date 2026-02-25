#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const projectRoot = path.join(__dirname, '..');

// FORCE CD into the project root to ensure Next.js finds tsconfig.json and aliases
process.chdir(projectRoot);

// Check for .env.local
const envFile = path.join(projectRoot, '.env.local');
if (!fs.existsSync(envFile)) {
  console.log('Environment file .env.local not found. Creating a default one...');
  const defaultEnv = `
# Database connection
DATABASE_URL=postgresql://${process.env.USER}@localhost:5432/dndsolo

# Encryption key for API tokens (32-byte hex string)
ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}

# Node environment
NODE_ENV=development
  `.trim();
  fs.writeFileSync(envFile, defaultEnv);
  console.log('✓ Created .env.local with default settings.');
}

// Check if .next directory exists
const nextDir = path.join(projectRoot, '.next');
if (!fs.existsSync(nextDir)) {
  console.log(`Project not built. Running build in ${projectRoot}...`);
  try {
    // We use 'npx next build' while inside the projectRoot
    execSync('npx next build', { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
  } catch (err) {
    console.error('Failed to build the project. Please ensure you have all dependencies installed.');
    process.exit(1);
  }
}

console.log('\nStarting Infinite Realms...');
console.log('Access the application at http://localhost:3000\n');

const start = spawn('npx', ['next', 'start'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'production' }
});

start.on('close', (code) => {
  process.exit(code);
});
