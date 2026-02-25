#!/usr/bin/env node

/**
 * Infinite Realms CLI
 *
 * Starts the pre-built Next.js standalone server.
 * Uses PGlite (embedded PostgreSQL) — no external database needed.
 * On first run, generates .env.local with encryption key.
 *
 * Usage:
 *   infinite-realms              # Start the server (runs setup if needed)
 *   infinite-realms setup        # Run setup only (generate .env)
 *   infinite-realms --port 3001  # Start on a custom port
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

// ─── Paths ─────────────────────────────────────────────────────
const PKG_ROOT = path.join(__dirname, '..');
const STANDALONE_DIR = path.join(PKG_ROOT, '.next', 'standalone');
const STANDALONE_SERVER = path.join(STANDALONE_DIR, 'server.js');
const STATIC_SRC = path.join(PKG_ROOT, '.next', 'static');
const STATIC_DEST = path.join(STANDALONE_DIR, '.next', 'static');
const PUBLIC_SRC = path.join(PKG_ROOT, 'public');
const PUBLIC_DEST = path.join(STANDALONE_DIR, 'public');

// User data directory — persistent across npm updates
const DATA_DIR = path.join(os.homedir(), '.infinite-realms');
const ENV_FILE = path.join(DATA_DIR, '.env.local');
const PGDATA_DIR = path.join(DATA_DIR, 'pgdata');

// ─── Colors ────────────────────────────────────────────────────
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

// ─── Helpers ───────────────────────────────────────────────────
function log(msg) { console.log(msg); }
function info(msg) { log(`${GREEN}✓${NC} ${msg}`); }
function warn(msg) { log(`${YELLOW}⚠${NC} ${msg}`); }
function error(msg) { log(`${RED}✗${NC} ${msg}`); }
function step(n, total, msg) { log(`\n${BLUE}[${n}/${total}]${NC} ${BOLD}${msg}${NC}`); }

// ─── Node.js Check ─────────────────────────────────────────────
function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  if (major < 18) {
    error(`Node.js 18+ required. You have ${version}.`);
    log(`  Install a newer version: ${CYAN}https://nodejs.org${NC}`);
    process.exit(1);
  }
  info(`Node.js ${version}`);
}

// ─── Environment Setup ─────────────────────────────────────────
function setupEnv() {
  // Create data directory
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(ENV_FILE)) {
    info('.env.local already exists');
    return;
  }

  const encryptionKey = crypto.randomBytes(32).toString('hex');

  const envContent = `# Infinite Realms Configuration
# Generated on ${new Date().toISOString()}

# Encryption key for API tokens (32-byte hex string)
ENCRYPTION_KEY=${encryptionKey}

# Node environment
NODE_ENV=production

# PGlite data directory (embedded PostgreSQL — no external DB needed)
PGLITE_DATA_DIR=${PGDATA_DIR}

# To use an external PostgreSQL instead of PGlite, uncomment:
# DATABASE_URL=postgresql://user@localhost:5432/dndsolo
`;

  fs.writeFileSync(ENV_FILE, envContent);
  info('.env.local created');
  log(`  ${DIM}Location: ${ENV_FILE}${NC}`);
  log(`  ${DIM}Edit this file to add your AI API keys${NC}`);
}

// ─── Database Directory ────────────────────────────────────────
function setupDataDir() {
  if (!fs.existsSync(PGDATA_DIR)) {
    fs.mkdirSync(PGDATA_DIR, { recursive: true });
  }
  info(`Database: ${DIM}${PGDATA_DIR}${NC}`);
}

// ─── Standalone Build Check ────────────────────────────────────
function checkStandaloneBuild() {
  if (!fs.existsSync(STANDALONE_SERVER)) {
    error('Pre-built standalone server not found.');
    log('  This usually means the npm package was not built correctly.');
    log(`  If you're developing locally, run: ${CYAN}npm run build${NC}`);
    process.exit(1);
  }

  // Copy static assets into standalone dir if not present
  if (!fs.existsSync(STATIC_DEST) && fs.existsSync(STATIC_SRC)) {
    log('  Copying static assets...');
    fs.cpSync(STATIC_SRC, STATIC_DEST, { recursive: true });
  }

  // Copy public directory into standalone dir if not present
  if (!fs.existsSync(PUBLIC_DEST) && fs.existsSync(PUBLIC_SRC)) {
    log('  Copying public assets...');
    fs.cpSync(PUBLIC_SRC, PUBLIC_DEST, { recursive: true });
  }

  info('Standalone build verified');
}

// ─── Setup Command ─────────────────────────────────────────────
function runSetup() {
  log(`\n${BLUE}${BOLD}╔═══════════════════════════════════════════╗${NC}`);
  log(`${BLUE}${BOLD}║      Infinite Realms — First-Time Setup   ║${NC}`);
  log(`${BLUE}${BOLD}╚═══════════════════════════════════════════╝${NC}`);

  const totalSteps = 4;

  step(1, totalSteps, 'Checking Node.js...');
  checkNodeVersion();

  step(2, totalSteps, 'Configuring environment...');
  setupEnv();

  step(3, totalSteps, 'Setting up database directory...');
  setupDataDir();

  step(4, totalSteps, 'Verifying build...');
  checkStandaloneBuild();

  log(`\n${GREEN}${BOLD}╔═══════════════════════════════════════════╗${NC}`);
  log(`${GREEN}${BOLD}║            Setup Complete!                ║${NC}`);
  log(`${GREEN}${BOLD}╠═══════════════════════════════════════════╣${NC}`);
  log(`${GREEN}${BOLD}║                                           ║${NC}`);
  log(`${GREEN}${BOLD}║  Database: embedded (PGlite, no setup!)  ║${NC}`);
  log(`${GREEN}${BOLD}║  Config:   ~/.infinite-realms/.env.local  ║${NC}`);
  log(`${GREEN}${BOLD}║                                           ║${NC}`);
  log(`${GREEN}${BOLD}║  Next steps:                              ║${NC}`);
  log(`${GREEN}${BOLD}║  1. Run: infinite-realms                  ║${NC}`);
  log(`${GREEN}${BOLD}║  2. Open http://localhost:3000            ║${NC}`);
  log(`${GREEN}${BOLD}║  3. Add your AI API key in Settings      ║${NC}`);
  log(`${GREEN}${BOLD}║  4. Create a campaign & start playing!   ║${NC}`);
  log(`${GREEN}${BOLD}║                                           ║${NC}`);
  log(`${GREEN}${BOLD}╚═══════════════════════════════════════════╝${NC}`);
}

// ─── Start Server ──────────────────────────────────────────────
function startServer(port) {
  // Load .env.local into environment
  if (fs.existsSync(ENV_FILE)) {
    const envContent = fs.readFileSync(ENV_FILE, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx);
        const val = trimmed.slice(eqIdx + 1);
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }

  // Always set PGlite data dir
  if (!process.env.PGLITE_DATA_DIR) {
    process.env.PGLITE_DATA_DIR = PGDATA_DIR;
  }

  log(`\n${CYAN}${BOLD}⚔  Infinite Realms${NC}`);
  log(`${DIM}   Server:   http://localhost:${port}${NC}`);
  log(`${DIM}   Database: PGlite (embedded)${NC}`);
  log(`${DIM}   Data:     ${PGDATA_DIR}${NC}\n`);

  const server = spawn('node', [STANDALONE_SERVER], {
    cwd: STANDALONE_DIR,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: String(port),
      HOSTNAME: '0.0.0.0',
    },
  });

  server.on('error', (err) => {
    error(`Failed to start server: ${err.message}`);
    process.exit(1);
  });

  server.on('close', (code) => {
    if (code !== 0 && code !== null) {
      error(`Server exited with code ${code}`);
    }
    process.exit(code || 0);
  });

  // Graceful shutdown
  const shutdown = () => {
    log(`\n${DIM}Shutting down...${NC}`);
    server.kill('SIGTERM');
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// ─── Main ──────────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let port = 3000;
  let command = 'start';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === 'setup') {
      command = 'setup';
    } else if (args[i] === '--port' || args[i] === '-p') {
      port = parseInt(args[++i]) || 3000;
    } else if (args[i] === '--help' || args[i] === '-h') {
      command = 'help';
    } else if (args[i] === '--version' || args[i] === '-v') {
      command = 'version';
    }
  }

  if (command === 'help') {
    log(`
${BOLD}Infinite Realms${NC} — AI-Powered Solo D&D 5e

${BOLD}Usage:${NC}
  infinite-realms              Start the server
  infinite-realms setup        Run first-time setup
  infinite-realms --port 3001  Start on custom port
  infinite-realms --help       Show this help
  infinite-realms --version    Show version

${BOLD}Configuration:${NC}
  ~/.infinite-realms/.env.local    Environment variables & AI API keys
  ~/.infinite-realms/pgdata/       Database (embedded PostgreSQL via PGlite)

${BOLD}No external database needed!${NC} PGlite runs PostgreSQL embedded in the app.
`);
    process.exit(0);
  }

  if (command === 'version') {
    const pkg = require(path.join(PKG_ROOT, 'package.json'));
    log(`infinite-realms v${pkg.version}`);
    process.exit(0);
  }

  if (command === 'setup') {
    runSetup();
    process.exit(0);
  }

  // Default: start
  // Check if first run (no .env.local)
  if (!fs.existsSync(ENV_FILE)) {
    log(`${YELLOW}First time running Infinite Realms!${NC}`);
    log(`Running setup...\n`);
    runSetup();
    log('');
  }

  // Verify build exists
  checkStandaloneBuild();

  // Start
  startServer(port);
}

main();
