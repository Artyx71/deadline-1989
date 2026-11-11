import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

// Real compiled server, isolated profile, real process shutdown and restart.
const directory = await mkdtemp(join(tmpdir(), 'deadline-production-'));
const origin = 'http://127.0.0.1:3005';
let server;
let output = '';
async function start() {
  server = spawn(process.execPath, ['apps/server/dist/index.js'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: '3005', DATABASE_PATH: join(directory, 'profile.sqlite') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try { if ((await fetch(`${origin}/api/health`)).ok) return; } catch { /* Startup can precede listen. */ }
    await delay(50);
  }
  throw new Error(`Server startup timed out: ${output}`);
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  const exited = once(server, 'exit');
  server.kill('SIGTERM');
  await exited;
}
async function api(path, method = 'GET', body, key = randomUUID()) {
  const response = await fetch(`${origin}/api${path}`, {
    method, headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json();
  assert.equal(response.status, 200, `${method} ${path}: ${JSON.stringify(value)}`);
  return value;
}
try {
  await start();
  const document = await fetch(origin);
  assert.equal(document.status, 200);
  assert.match(document.headers.get('content-type'), /text\/html/);
  assert.match(await document.text(), /DEADLINE/);
  assert.equal((await fetch(`${origin}/api/nonexistent`)).status, 404);
  const task = (await api('/tasks', 'POST', { title: 'Production restart fixture', difficulty: 'hard' })).state.tasks[0];
  const rewardKey = randomUUID();
  await api(`/tasks/${task.id}/complete`, 'POST', {}, rewardKey);
  await api('/tutorial', 'PATCH', { skipped: true });
  await api('/settings', 'PATCH', { masterVolume: 0.31, muted: true });
  const allocated = await api('/missions/start', 'POST', { missionId: 'first-shift', ammo: 6 });
  const attempt = allocated.state.attempt;
  const shotKey = randomUUID();
  await api(`/missions/${attempt.id}/shots`, 'POST', { count: 1 }, shotKey);
  await stop();
  await start();
  let state = await api('/state');
  assert.equal(state.tasks[0].status, 'completed');
  assert.equal(state.rewards.length, 1);
  assert.equal(state.player.xp, 200);
  assert.equal(state.player.ammo, 6);
  assert.equal(state.attempt.spent, 1);
  assert.equal(state.settings.masterVolume, 0.31);
  assert.equal(state.settings.muted, true);
  assert.equal(state.tutorial.skipped, true);
  await api(`/tasks/${task.id}/complete`, 'POST', {}, rewardKey);
  await api(`/missions/${attempt.id}/shots`, 'POST', { count: 1 }, shotKey);
  state = await api('/state');
  assert.equal(state.attempt.spent, 1);
  const finish = await api(`/missions/${attempt.id}/finish`, 'POST', { outcome: 'abandoned', stats: { kills: 0, shotsFired: 1, hits: 0, meleeKills: 0, durationMs: 1000, emptyMagazine: false } });
  assert.equal(finish.state.player.ammo, 11);
  assert.equal(finish.state.player.xp, 200);
  assert.equal(finish.state.attempt, null);
  console.log('PASS: compiled static serving, API errors, real server restart, task/reward/settings/tutorial persistence, durable shot replay and unused-round recovery.');
} finally {
  await stop();
  await rm(directory, { recursive: true, force: true });
}
