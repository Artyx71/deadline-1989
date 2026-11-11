import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every suite gets a new profile. Never open/delete the normal development DB.
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = mkdtempSync(join(tmpdir(), 'deadline-e2e-'));
const child = spawn(process.execPath, ['scripts/workspace.mjs', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  detached: true,
  env: {
    ...process.env,
    DEADLINE_NO_WATCH: '1',
    PORT: '3002',
    VITE_PORT: '5174',
    VITE_API_TARGET: 'http://127.0.0.1:3002',
    DATABASE_PATH: join(directory, 'profile.sqlite'),
  },
});
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}
process.once('SIGTERM', stop);
process.once('SIGINT', stop);
child.once('error', (error) => {
  console.error(error);
  rmSync(directory, { recursive: true, force: true });
  process.exitCode = 1;
});
child.once('exit', (code) => {
  rmSync(directory, { recursive: true, force: true });
  process.exitCode = stopping ? 0 : (code ?? 1);
});
