import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { findPath } from '../apps/web/src/game/pathfinding.ts';
import { clearPath } from '../apps/web/src/game/geometry.ts';

// Dedicated visual QA profile. Never point this script at the user's main app.
const origin = 'http://127.0.0.1:5175';
const evidence = new URL('../docs/evidence/', import.meta.url);
await mkdir(evidence, { recursive: true });
const maps = Object.fromEntries(
  await Promise.all(
    ['apartment', 'training'].map(async (name) => [
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
  televisionMocked: false,
  checks: [],
  positions: [],
  pageErrors: [],
  failedRequests: [],
  audioFetches: [],
};
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
  headless: true,
});
report.browser = browser.version();
const page = await browser.newPage({ viewport: report.viewport });
page.setDefaultTimeout(15000);
page.on('pageerror', (error) => report.pageErrors.push(error.message));
page.on('requestfailed', (request) =>
  report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }),
);
page.on('response', (response) => {
  if (new URL(response.url()).pathname.startsWith('/assets/audio/'))
    report.audioFetches.push({ url: response.url(), status: response.status() });
});
const sleep = (milliseconds) => page.waitForTimeout(milliseconds);
const screenshot = (name) =>
  page.screenshot({ path: new URL(name, evidence).pathname, fullPage: true });
const state = async () => {
  const response = await page.request.get(`${origin}/api/state`);
  assert(response.ok(), await response.text());
  return response.json();
};
const diagnostic = () =>
  page.locator('canvas').evaluate((canvas) => ({
    x: Number(canvas.dataset.playerX),
    y: Number(canvas.dataset.playerY),
    scene: canvas.dataset.scene,
    frames: Number(canvas.dataset.frames),
    paused: canvas.dataset.externallyPaused,
    layoutVersion: canvas.dataset.layoutVersion,
    enemies: JSON.parse(canvas.dataset.enemyActors || '[]'),
  }));
const audio = () =>
  page.locator('html').evaluate((html) => ({
    counts: JSON.parse(html.dataset.playedSfx || '{}'),
    rmsPeak: Number(html.dataset.effectRmsPeak || 0),
    context: html.dataset.audioContext,
    error: html.dataset.audioError,
    silenced: html.dataset.audioSilenced,
  }));
async function until(check, message, timeout = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return;
    await sleep(60);
  }
  throw new Error(message);
}
async function ready(scene) {
  await page.waitForFunction((expected) => {
    const canvas = document.querySelector('canvas');
    return (
      canvas?.dataset.scene === expected && !!canvas.dataset.playerX && !!canvas.dataset.playerY
    );
  }, scene);
  assert.equal((await diagnostic()).layoutVersion, 'studio-v3');
}
async function finishCall() {
  const panel = page.getByRole('dialog', { name: 'ВХОДЯЩИЙ ВЫЗОВ' });
  await panel.waitFor();
  for (let step = 0; step < 20 && (await panel.isVisible()); step++) {
    await panel.getByTestId('dialogue-advance').click();
    await sleep(60);
  }
  assert(!(await panel.isVisible()), 'Dialogue must close after its actual lines');
}
async function freshAfterRelease() {
  const frames = (await diagnostic()).frames;
  await page.waitForFunction(
    (previous) => Number(document.querySelector('canvas')?.dataset.frames) > previous,
    frames,
    { timeout: 2000 },
  );
}
async function walk(x, y, tolerance = 5) {
  const started = Date.now();
  while (Date.now() - started < 16000) {
    const current = await diagnostic();
    const distance = Math.hypot(x - current.x, y - current.y);
    if (distance <= tolerance) {
      report.positions.push({ target: [x, y], actual: current });
      return;
    }
    const map = maps[current.scene];
    assert(map, `No navigation map for ${current.scene}`);
    let goal = { x, y };
    if (!clearPath(current, goal, map.colliders, 6.5)) {
      const path = findPath(current, goal, map.colliders, map.width, map.height, 8);
      assert(path.length, `No clear walking path ${current.x},${current.y} -> ${x},${y}`);
      goal =
        [...path].reverse().find((point) => clearPath(current, point, map.colliders, 6.5)) ||
        path[0];
    }
    const dx = goal.x - current.x,
      dy = goal.y - current.y;
    const keys = [];
    if (Math.abs(dx) > 2) keys.push(dx > 0 ? 'd' : 'a');
    if (Math.abs(dy) > 2) keys.push(dy > 0 ? 's' : 'w');
    for (const key of keys) await page.keyboard.down(key);
    await sleep(Math.max(18, Math.min(140, (Math.hypot(dx, dy) / 220) * 750)));
    for (const key of keys) await page.keyboard.up(key);
    await freshAfterRelease();
  }
  throw new Error(`Walking timed out for ${x},${y}: ${JSON.stringify(await diagnostic())}`);
}
async function interact(text) {
  await until(
    async () =>
      (await page.locator('.interaction-prompt').allTextContents()).some((label) =>
        label.includes(text),
      ),
    `Missing Russian prompt ${text}`,
  );
  await page.keyboard.press('e');
}
async function closeDialog() {
  await page.getByRole('dialog').locator('.close-button').click();
}
try {
  const initial = await state();
  await page.goto(origin);
  if (initial.attempt?.status === 'active') {
    await page.getByTestId('recover-mission').click();
    await page.getByTestId('recover-mission').waitFor({ state: 'hidden' });
  }
  if (
    initial.attempt?.status !== 'active' ||
    (await page.getByTestId('boot-continue').isVisible())
  ) {
    await page.getByTestId('boot-continue').click();
    await page.getByTestId('menu-continue').click();
  }
  await ready('apartment');
  const resumed = await state();
  const tutorial = resumed.tutorial;
  if (!tutorial.completed && !tutorial.skipped) {
    if (
      ['wake', 'movement', 'first-call'].includes(tutorial.step) &&
      !resumed.dialogueHistory.some((entry) => entry.id === 'first-call')
    )
      await finishCall();
    await page.getByTestId('tutorial-skip').click();
  }
  report.before = await state();
  const audioSettings = report.before.settings;
  if (audioSettings.muted || audioSettings.masterVolume === 0 || audioSettings.sfxVolume === 0) {
    await page.getByTestId('open-settings').click();
    if (audioSettings.muted) await page.getByTestId('settings-muted').uncheck();
    if (audioSettings.masterVolume === 0)
      await page.getByTestId('settings-masterVolume').fill('0.65');
    if (audioSettings.sfxVolume === 0) await page.getByTestId('settings-sfxVolume').fill('0.7');
    await until(async () => {
      const settings = (await state()).settings;
      return !settings.muted && settings.masterVolume > 0 && settings.sfxVolume > 0;
    }, 'Audible QA settings must commit through the real settings UI');
    await closeDialog();
    report.audioSettingsAdjustedThroughUI = true;
  }
  await page.getByTestId('task-brief-create').click();
  await until(
    async () =>
      page.getByTestId('task-title').evaluate((input) => document.activeElement === input),
    'Task brief must focus the real editor',
  );
  await closeDialog();
  report.checks.push({ name: 'task-brief-opens-focused-editor', status: 'PASS' });

  await walk(458, 160);
  await interact('ОТКРЫТЬ КОМПЬЮТЕР');
  await page.getByTestId('task-new').waitFor();
  await closeDialog();
  report.checks.push({ name: 'computer-E-at-authored-position', status: 'PASS' });
  await walk(479, 265);
  await interact('ОТВЕТИТЬ НА ЗВОНОК');
  await finishCall();
  report.checks.push({ name: 'telephone-E-at-authored-position', status: 'PASS' });

  await walk(292, 384, 3);
  await interact('СМОТРЕТЬ ТЕЛЕВИЗОР');
  const television = page.getByRole('dialog', { name: 'ТЕЛЕВИЗОР / КАНАЛ 03' });
  await television.waitFor();
  const source = await page.getByTestId('television-frame').getAttribute('src');
  assert(source);
  const playerUrl = new URL(source);
  assert.equal(playerUrl.origin, 'https://www.youtube-nocookie.com');
  assert.equal(playerUrl.searchParams.get('mute'), '1');
  await until(
    async () =>
      ['ЭФИР ПОДКЛЮЧЁН', 'СИГНАЛ НЕДОСТУПЕН'].includes(
        await television.getByRole('status').innerText(),
      ),
    'TV must report real playback or a truthful no-signal fallback',
    15000,
  );
  report.televisionStatus = await television.getByRole('status').innerText();
  report.networkVideoPlaybackObserved = report.televisionStatus === 'ЭФИР ПОДКЛЮЧЁН';
  await until(async () => (await diagnostic()).paused === 'true', 'TV must pause gameplay');
  assert.equal((await audio()).silenced, 'true');
  const paused = await diagnostic();
  await page.keyboard.down('d');
  await sleep(250);
  await page.keyboard.up('d');
  await freshAfterRelease();
  const stillPaused = await diagnostic();
  assert.equal(stillPaused.x, paused.x);
  assert.equal(stillPaused.y, paused.y);
  await screenshot('studio-television-network.png');
  await page.getByTestId('television-close').click();
  await until(
    async () => (await diagnostic()).paused === 'false',
    'Closing TV must resume gameplay',
  );
  assert.equal((await audio()).silenced, 'false');
  await walk(280, 384);
  report.checks.push({
    name: 'television-E-real-network-truthful-status-pause-close-and-movement',
    status: 'PASS',
    networkVideoPlaybackObserved: report.networkVideoPlaybackObserved,
  });

  await walk(566, 383);
  await interact('ПРОВЕРИТЬ СНАРЯЖЕНИЕ');
  await page.getByTestId('mission-launch').waitFor();
  await closeDialog();
  report.checks.push({ name: 'cabinet-E-at-authored-position', status: 'PASS' });
  await walk(661, 382);
  await interact('ТРЕНИРОВКА');
  await ready('training');
  assert.equal((await diagnostic()).enemies.length, 1);
  await screenshot('studio-separate-training.png');
  const settings = (await state()).settings;
  assert(
    !settings.muted && settings.masterVolume > 0 && settings.sfxVolume > 0,
    'Isolated QA audio settings must be audible',
  );
  const beforeGun = await audio();
  const box = await page.locator('canvas').boundingBox();
  assert(box);
  await page.mouse.move(box.x + (box.width * 604) / 768, box.y + (box.height * 290) / 480);
  await page.mouse.down();
  await sleep(20);
  await page.mouse.up();
  await until(
    async () => ((await audio()).counts.gunshot || 0) > (beforeGun.counts.gunshot || 0),
    'Real training shot must start its sound source',
  );
  await until(
    async () => (await audio()).rmsPeak > 0,
    'Real SFX bus must carry a nonzero waveform',
  );
  await page.keyboard.press('r');
  await sleep(1200);
  await walk(568, 290, 4);
  const beforeMelee = await audio();
  await page.keyboard.press('f');
  await until(
    async () => ((await audio()).counts.melee || 0) > (beforeMelee.counts.melee || 0),
    'Real melee must start its sound source',
  );
  await until(
    async () => ((await audio()).counts.impact || 0) > (beforeMelee.counts.impact || 0),
    'Actual melee contact must start its impact source',
  );
  report.audio = await audio();
  for (const sound of ['gunshot', 'melee'])
    assert(
      report.audioFetches.some(
        (response) => response.url.endsWith(`/sfx-${sound}.wav`) && response.status === 200,
      ),
      `Real ${sound} WAV was not fetched successfully`,
    );
  assert.equal(report.audio.error, '');
  await walk(500, 355);
  await interact('ВЕРНУТЬСЯ В КВАРТИРУ');
  await ready('apartment');
  report.checks.push({
    name: 'training-door-E-separate-map-real-gun-melee-impact-audio-and-return-E',
    status: 'PASS',
  });

  await walk(216, 400);
  await interact('ПОКИНУТЬ КВАРТИРУ');
  await page.getByTestId('mission-launch').waitFor();
  await closeDialog();
  report.checks.push({ name: 'exit-door-E-at-authored-position', status: 'PASS' });
  report.after = await state();
  assert.deepEqual(report.after.tasks, report.before.tasks);
  assert.deepEqual(report.after.player, report.before.player);
  report.checks.push({
    name: 'studio-training-preserves-real-tasks-ammo-XP-and-deaths',
    status: 'PASS',
  });
  await screenshot('studio-objects-verified.png');
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.failure = error.stack;
  process.exitCode = 1;
  console.error(error);
  try {
    report.failureDiagnostic = await diagnostic();
    await screenshot('studio-smoke-failure.png');
  } catch (captureError) {
    report.captureError = String(captureError);
  }
} finally {
  report.finished = new Date().toISOString();
  await writeFile(new URL('studio-smoke.json', evidence), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(
    JSON.stringify({
      status: report.status,
      checks: report.checks,
      televisionStatus: report.televisionStatus,
      audio: report.audio,
      failure: report.failure,
    }),
  );
}
