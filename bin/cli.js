#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const projectRoot = path.join(__dirname, '..');
const pkg = require(path.join(projectRoot, 'package.json'));

console.log(`Infinite Realms CLI v${pkg.version}`);
console.log(`Working Directory: ${projectRoot}`);

// FORCE CD into the project root
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
  console.log(`Project build not found. Running fresh build...`);
  try {
    // Run build with absolute paths to be safe
    const nextBin = path.join(projectRoot, 'node_modules', '.bin', 'next');
    execSync(`${nextBin} build`, { 
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
  } catch (err) {
    console.error('Build failed. Please check the errors above.');
    process.exit(1);
  }
}

console.log('\nStarting Infinite Realms...');
console.log('Access the application at http://localhost:3000\n');

const nextBin = path.join(projectRoot, 'node_modules', '.bin', 'next');
const start = spawn(nextBin, ['start'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'production' }
});

start.on('close', (code) => {
  process.exit(code);
});
