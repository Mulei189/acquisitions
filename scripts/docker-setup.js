#!/usr/bin/env node

/**
 * Cross-platform Docker setup script
 * Detects OS and runs appropriate setup script
 */

import { spawnSync } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = os.platform() === 'win32';

console.log('\n========================================');
console.log('Acquisitions API - Docker Setup');
console.log('========================================\n');

// For Windows, offer to run the batch script
if (isWindows) {
  console.log('Detected Windows system.\n');
  console.log('Running docker-setup.bat interactively...\n');
  
  const batchPath = path.join(__dirname, 'docker-setup.bat');
  
  // Use spawn to keep the batch script interactive
  const result = spawnSync('cmd.exe', ['/c', batchPath], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  process.exit(result.status || 0);
} else {
  // For Unix/Mac/Linux
  console.log('Detected Unix-like system.\n');
  console.log('Running docker-setup.sh interactively...\n');
  
  const shPath = path.join(__dirname, 'docker-setup.sh');
  
  // Make script executable
  fs.chmodSync(shPath, 0o755);
  
  const result = spawnSync('bash', [shPath], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  process.exit(result.status || 0);
}
