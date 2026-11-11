import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { findPath } from '../apps/web/src/game/pathfinding.ts';
import { lineOfSight, clearPath } from '../apps/web/src/game/geometry.ts';

const origin = 'http://127.0.0.1:5175';
const evidence = new URL('../docs/evidence/', import.meta.url);
await mkdir(evidence, { recursive: true });
const maps = Object.fromEntries(
  await Promise.all(
    ['apartment', 'combat'].map(async (name) => [
      name,
      JSON.parse(
        await readFile(new URL(`../apps/web/public/assets/${name}.json`, import.meta.url), 'utf8'),
      ),
    ]),
  ),
);
const report = {
  started: new Date().toISOString(),
  origin,
  viewport: { width: 1440, height: 1000 },
  inputOnly: true,
  checks: [],
  events: [],
  outcomes: [],
  errors: [],
  networkErrors: [],
};
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
  headless: true,
});
report.browser = browser.version();
const page = await browser.newPage({ viewport: report.viewport });
page.setDefaultTimeout(15000);
page.on('request', (request) => {
  if (request.method() === 'POST' && /\/missions\/.+\/finish$/.test(request.url()))
    report.outcomes.push(request.postDataJSON());
});
page.on('pageerror', (error) => report.errors.push(error.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') report.errors.push(msg.text());
});
page.on('response', (response) => {
  if (response.status() >= 400)
    report.networkErrors.push({ url: response.url(), status: response.status() });
});
page.on('requestfailed', (req) =>
  report.networkErrors.push({ url: req.url(), failure: req.failure()?.errorText }),
);
const snapshot = async () => {
  const r = await page.request.get(`${origin}/api/state`);
  assert(r.ok(), await r.text());
  return r.json();
};
const mutation = async (path, data) => {
  const r = await page.request.post(`${origin}/api${path}`, {
    headers: { 'Idempotency-Key': randomUUID() },
    data,
  });
  assert(r.ok(), await r.text());
  return r.json();
};
const diagnostic = () =>
  page.locator('canvas').evaluate((canvas) => ({
    x: Number(canvas.dataset.playerX),
    y: Number(canvas.dataset.playerY),
    scene: canvas.dataset.scene,
    enemies: JSON.parse(canvas.dataset.enemyActors || '[]'),
    magazine: Number(canvas.dataset.magazine),
    reserve: Number(canvas.dataset.reserve),
    frames: Number(canvas.dataset.frames),
    avgFrameMs: Number(canvas.dataset.avgFrameMs),
    maxFrameMs: Number(canvas.dataset.maxFrameMs),
    paused: canvas.dataset.externallyPaused,
  }));
const screenshot = (name) =>
  page.screenshot({ path: new URL(name, evidence).pathname, fullPage: true });
let held = new Set();
async function keys(next) {
  const requested = new Set(next);
  for (const key of held) if (!requested.has(key)) await page.keyboard.up(key);
  for (const key of requested) if (!held.has(key)) await page.keyboard.down(key);
  held = requested;
}
async function aim(point) {
  const box = await page.locator('canvas').boundingBox();
  assert(box);
  await page.mouse.move(box.x + (point.x / 768) * box.width, box.y + (point.y / 480) * box.height);
}
async function ready(scene) {
  await page.waitForFunction((expected) => {
    const c = document.querySelector('canvas');
    return c?.dataset.scene === expected && !!c.dataset.playerX && !!c.dataset.playerY;
  }, scene);
  await page.waitForTimeout(300);
}
let lastShot = 0;
// Mouse click uses current pointer; never click DOM UI while attacking.
async function attack(state) {
  const targets = state.enemies
    .filter((e) => e.hp > 0 && lineOfSight(state, e, maps.combat.colliders))
    .sort(
      (a, b) => Math.hypot(a.x - state.x, a.y - state.y) - Math.hypot(b.x - state.x, b.y - state.y),
    );
  if (!targets.length) return false;
  const enemy = targets[0];
  await aim(enemy);
  if (Math.hypot(enemy.x - state.x, enemy.y - state.y) < 55) await page.keyboard.press('f');
  if (state.magazine === 0 && state.reserve > 0) await page.keyboard.press('r');
  else if (state.magazine > 0 && Date.now() - lastShot > 270) {
    await page.mouse.down();
    await page.waitForTimeout(20);
    await page.mouse.up();
    lastShot = Date.now();
  }
  return enemy;
}
async function walkTo(x, y, { combat = false, deadline = 15000, attacking = true } = {}) {
  const began = Date.now();
  let lastPosition = null,
    stuck = 0;
  while (Date.now() - began < deadline) {
    const state = await diagnostic();
    if (combat && (await page.getByTestId('outcome-return').isVisible())) {
      await keys([]);
      return false;
    }
    if (Math.hypot(x - state.x, y - state.y) < 10) {
      await keys([]);
      return true;
    }
    const map = maps[combat ? 'combat' : 'apartment'];
    if (combat && attacking) {
      const target = await attack(state);
      if (target) {
        const direction = Math.floor(Date.now() / 450) % 2 ? 1 : -1;
        const strafe =
          target.type === 'gunner' &&
          clearPath(state, { x: state.x + direction * 45, y: state.y }, map.colliders, 6.5);
        await keys(strafe ? [direction > 0 ? 'd' : 'a'] : []);
        await page.waitForTimeout(90);
        continue;
      }
    }
    let destination = { x, y };
    if (!clearPath(state, destination, map.colliders, 6.5)) {
      const path = findPath(state, destination, map.colliders, map.width, map.height, 8);
      if (!path.length) throw Error(`No walking path from ${JSON.stringify(state)} to ${x},${y}`);
      destination =
        [...path].reverse().find((p) => clearPath(state, p, map.colliders, 6.5)) || path[0];
    }
    const dx = destination.x - state.x,
      dy = destination.y - state.y;
    const move = [];
    if (Math.abs(dx) > 5) move.push(dx > 0 ? 'd' : 'a');
    if (Math.abs(dy) > 5) move.push(dy > 0 ? 's' : 'w');
    await keys(move);
    await page.waitForTimeout(Math.max(25, Math.min(140, (Math.hypot(dx, dy) / 220) * 750)));
    await keys([]);
    await page.waitForTimeout(220);
    if (lastPosition && Math.hypot(state.x - lastPosition.x, state.y - lastPosition.y) < 1) stuck++;
    else stuck = 0;
    lastPosition = state;
    if (stuck > 35) throw Error(`Stuck at ${state.x},${state.y} heading ${x},${y}`);
  }
  await keys([]);
  throw Error(`Walk timeout ${x},${y}; ${JSON.stringify(await diagnostic())}`);
}
async function enterMission(ammo) {
  await ready('apartment');
  for (const [x, y] of [
    [248, 232],
    [248, 390],
    [216, 390],
  ])
    await walkTo(x, y);
  await page.keyboard.press('e');
  await page.getByRole('slider', { name: 'Патроны с собой' }).fill(String(ammo));
  await page.getByTestId('mission-launch').click();
  await ready('combat');
  const state = await diagnostic();
  assert.equal(state.enemies.filter((e) => e.hp > 0).length, 6);
  report.events.push({ type: 'mission-enter', diagnostic: state });
  console.log('Entered combat', JSON.stringify(state));
}
async function dismissIntro() {
  const tutorial = (await snapshot()).tutorial;
  if (tutorial.completed || tutorial.skipped) return;
  const panel = page.getByRole('dialog', { name: 'ВХОДЯЩИЙ ВЫЗОВ' });
  await panel.waitFor();
  for (let line = 0; line < 20 && (await panel.isVisible()); line++) {
    await panel.getByTestId('dialogue-advance').click();
    await page.waitForTimeout(60);
  }
  await page.getByTestId('tutorial-skip').click();
}
async function boot() {
  if (await page.getByTestId('recover-mission').isVisible())
    await page.getByTestId('recover-mission').click();
  await page.getByTestId('boot-continue').click();
  await page.getByTestId('menu-continue').click();
  await ready('apartment');
  await dismissIntro();
}
try {
  report.beforeRecovery = await snapshot();
  await page.goto(origin);
  if (report.beforeRecovery.attempt?.status === 'active') {
    await page.getByTestId('recover-mission').click();
    await page.waitForTimeout(300);
  }
  let current = await snapshot();
  report.afterRecovery = current;
  while (current.player.ammo < 42) {
    const title = `Проверка боевой системы ${randomUUID()}`;
    const created = await mutation('/tasks', {
      title,
      description: 'Изолированная тестовая задача для проверки боя.',
      difficulty: 'hard',
      dueAt: null,
    });
    const task = created.state.tasks.find((t) => t.title === title);
    assert(task);
    current = (await mutation(`/tasks/${task.id}/complete`, {})).state;
  }
  report.baseline = current;
  await boot();
  report.initialMemory = await page.evaluate(() => ({
    heap: performance.memory?.usedJSHeapSize ?? null,
    canvases: document.querySelectorAll('canvas').length,
  }));
  await enterMission(36);
  await screenshot('combat-revised.png');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: 'СИГНАЛ ПРИОСТАНОВЛЕН' }).waitFor();
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.externallyPaused === 'true',
  );
  await page.waitForTimeout(500);
  const pausedBefore = await diagnostic();
  await page.keyboard.down('d');
  await page.waitForTimeout(700);
  await page.keyboard.up('d');
  const pausedAfter = await diagnostic();
  assert.equal(pausedAfter.x, pausedBefore.x);
  assert.equal(pausedAfter.y, pausedBefore.y);
  assert.deepEqual(pausedAfter.enemies, pausedBefore.enemies);
  report.checks.push({ name: 'pause-freezes-player-and-enemies', status: 'PASS' });
  await page.getByTestId('pause-resume').click();
  // Actual walking route through all authored service corridor doorways.
  for (const [x, y] of [
    [152, 389],
    [152, 264],
    [152, 191],
    [152, 264],
    [376, 264],
    [376, 192],
    [376, 264],
    [376, 319],
    [376, 404],
    [456, 408],
    [376, 404],
    [376, 264],
    [632, 264],
    [632, 193],
    [632, 264],
    [632, 389],
  ]) {
    if (!(await walkTo(x, y, { combat: true, deadline: 20000 }))) break;
    const state = await diagnostic();
    report.events.push({ type: 'waypoint', target: [x, y], diagnostic: state });
    console.log('Waypoint', x, y, 'kills', state.enemies.filter((e) => e.hp === 0).length);
    if (
      y === 264 &&
      state.magazine < 6 &&
      state.reserve > 0 &&
      !state.enemies.some((e) => e.hp > 0 && lineOfSight(state, e, maps.combat.colliders))
    ) {
      await page.keyboard.press('r');
      await page.waitForTimeout(1200);
    }
  }
  const deadline = Date.now() + 15000;
  while (!(await page.getByTestId('outcome-return').isVisible()) && Date.now() < deadline) {
    await attack(await diagnostic());
    await page.waitForTimeout(100);
  }
  await page.getByTestId('outcome-return').waitFor();
  await keys([]);
  const victory = await snapshot();
  report.victory = victory;
  const victoryOutcome = report.outcomes.at(-1);
  report.victoryOutcome = victoryOutcome;
  assert.equal(
    victoryOutcome?.outcome,
    'cleared',
    `Expected input-earned victory: ${JSON.stringify(victoryOutcome)}`,
  );
  assert.equal(victory.progress.completions, report.baseline.progress.completions + 1);
  assert.equal(victory.attempt, null);
  assert.equal(victoryOutcome.stats.kills, 6);
  assert.equal(victory.player.xp, report.baseline.player.xp);
  assert.deepEqual(victory.tasks, report.baseline.tasks);
  assert.equal(victory.player.ammo, report.baseline.player.ammo - victoryOutcome.stats.shotsFired);
  await screenshot('victory-initial.png');
  report.checks.push({
    name: 'real-six-enemy-victory-and-authoritative-settlement',
    status: 'PASS',
    stats: victoryOutcome.stats,
  });
  await page.getByTestId('outcome-return').click();
  await ready('apartment');
  await enterMission(0);
  const beforeDeath = await snapshot();
  await walkTo(152, 389, { combat: true, attacking: false });
  await walkTo(152, 264, { combat: true, attacking: false });
  await walkTo(152, 192, { combat: true, attacking: false });
  await keys([]);
  await page.getByTestId('outcome-return').waitFor({ timeout: 20000 });
  const death = await snapshot();
  report.death = death;
  const deathOutcome = report.outcomes.at(-1);
  report.deathOutcome = deathOutcome;
  assert.equal(deathOutcome?.outcome, 'dead');
  assert.equal(death.attempt, null);
  assert.equal(death.player.deaths, beforeDeath.player.deaths + 1);
  assert.equal(death.player.ammo, beforeDeath.player.ammo);
  assert.equal(death.player.xp, report.baseline.player.xp);
  assert.deepEqual(death.tasks, report.baseline.tasks);
  await screenshot('death-initial.png');
  report.checks.push({
    name: 'enemy-caused-one-hit-death-with-zero-ammo-and-task-preservation',
    status: 'PASS',
    stats: deathOutcome.stats,
  });
  await page.getByTestId('outcome-return').click();
  await ready('apartment');
  const returnPosition = await diagnostic();
  await walkTo(248, 232);
  assert.notEqual((await diagnostic()).x, returnPosition.x);
  await page.waitForLoadState('networkidle');
  await page.reload();
  await page.getByTestId('boot-continue').click();
  await page.getByTestId('menu-continue').click();
  await ready('apartment');
  const afterReload = await snapshot();
  assert.deepEqual(afterReload.tasks, report.baseline.tasks);
  assert.equal(afterReload.player.ammo, death.player.ammo);
  assert.equal(afterReload.player.xp, death.player.xp);
  report.afterReload = afterReload;
  report.finalMemory = await page.evaluate(() => ({
    heap: performance.memory?.usedJSHeapSize ?? null,
    canvases: document.querySelectorAll('canvas').length,
  }));
  assert.equal(report.finalMemory.canvases, 1);
  report.checks.push({
    name: 'repeated-scenes-apartment-movement-and-reload-resource-persistence',
    status: 'PASS',
  });
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.networkErrors, []);
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.failure = error.stack;
  console.error(error);
  try {
    report.failureDiagnostic = await diagnostic();
    report.failureState = await snapshot();
    await screenshot('combat-revised.png');
  } catch {}
  process.exitCode = 1;
} finally {
  await keys([]).catch(() => {});
  report.finished = new Date().toISOString();
  await writeFile(new URL('combat-smoke.json', evidence), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(
    JSON.stringify({ status: report.status, checks: report.checks, failure: report.failure }),
  );
}
