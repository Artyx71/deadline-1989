import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { MutationResult, StateSnapshot } from '../packages/shared/src/index';
import { randomUUID } from 'node:crypto';

async function snapshot(page: Page): Promise<StateSnapshot> {
  const response = await page.request.get('/api/state');
  expect(response.ok()).toBe(true);
  return response.json() as Promise<StateSnapshot>;
}
async function terminal(page: Page) {
  await page.getByTestId('open-terminal').click();
  await expect(page.getByRole('dialog', { name: 'КОНТРАКТНЫЙ ТЕРМИНАЛ v1.3' })).toBeVisible();
  await expect(page.getByTestId('task-new')).toBeEnabled();
}
async function createTask(page: Page, title: string) {
  await page.getByTestId('task-new').click();
  await page.getByTestId('task-title').fill(title);
  await page.getByTestId('task-description').fill('Изолированная задача для проверки в браузере.');
  await page.getByTestId('task-save').click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
}
async function bootMenu(page: Page) {
  await page.goto('/');
  await page.getByTestId('boot-continue').click();
  await expect(page.getByRole('region', { name: 'Главное меню' })).toBeVisible();
}
async function startGame(page: Page, skip = true) {
  await bootMenu(page);
  await page.getByTestId('menu-start-game').click();
  await expect(page.locator('canvas[data-scene="apartment"]')).toBeVisible();
  await expect(page.locator('canvas')).toHaveAttribute('data-player-x', /\d/);
  if (skip) {
    await page.getByTestId('tutorial-skip').click();
    await expect.poll(async () => (await snapshot(page)).tutorial.skipped).toBe(true);
  }
}
async function position(page: Page) {
  const canvas = page.locator('canvas');
  return { x: Number(await canvas.getAttribute('data-player-x')), y: Number(await canvas.getAttribute('data-player-y')) };
}
async function hold(page: Page, key: string, milliseconds: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(milliseconds);
  await page.keyboard.up(key);
  // Diagnostics refresh every twelve actual frames, independent of this test.
  await page.waitForTimeout(250);
}
async function walkTo(page: Page, x: number, y: number) {
  for (const axis of ['x', 'y'] as const) {
    const target = axis === 'x' ? x : y;
    for (let tries = 0; tries < 35; tries++) {
      const current = await position(page);
      const distance = target - current[axis];
      if (Math.abs(distance) <= 10) break;
      const key = axis === 'x' ? distance > 0 ? 'd' : 'a' : distance > 0 ? 's' : 'w';
      await hold(page, key, Math.max(25, Math.min(150, Math.abs(distance) / 220 * 750)));
      if (tries === 34) throw new Error(`Walk blocked approaching ${axis}=${target}; player=${JSON.stringify(await position(page))}`);
    }
  }
}
async function reachExit(page: Page) {
  // Explicit walking route through the authored bedroom doorway and hall.
  await walkTo(page, 176, 220);
  await walkTo(page, 270, 220);
  await walkTo(page, 270, 300);
  await walkTo(page, 401, 300);
  await walkTo(page, 401, 415);
  await expect(page.locator('.interaction-prompt')).toContainText('ПОКИНУТЬ КВАРТИРУ');
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: 'ДИСПЕТЧЕРСКАЯ / НОЧНАЯ СМЕНА' })).toBeVisible();
}
async function screenshot(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function finishCall(page: Page) {
  const panel = page.getByRole('dialog', { name: 'ВХОДЯЩИЙ ВЫЗОВ' });
  await expect(panel).toBeVisible();
  for (let line = 0; line < 20 && await panel.isVisible(); line++) {
    await panel.getByTestId('dialogue-advance').click();
    await page.waitForTimeout(60);
  }
  await expect(panel).toBeHidden();
}

test.afterEach(async ({ page, request }, info) => {
  const failed = info.status !== info.expectedStatus;
  const fixtures = info.annotations.filter(annotation => annotation.type === 'fixture-task').map(annotation => annotation.description).filter((id): id is string => Boolean(id));
  if (!failed && !fixtures.length) return;
  // Keep the original failure evidence before shutting down any gameplay input.
  if (failed && !page.isClosed()) {
    const path = info.outputPath('failure-before-reservation-cleanup.png');
    await page.screenshot({ path, fullPage: true });
    await info.attach('failure-before-reservation-cleanup', { path, contentType: 'image/png' });
    await page.close();
  }
  const response = await request.get('/api/state');
  expect(response.ok(), 'Failure cleanup could not read authoritative state').toBe(true);
  const current = await response.json() as StateSnapshot;
  if (failed && current.attempt) {
    const settlement = await request.post(`/api/missions/${current.attempt.id}/finish`, {
      headers: { 'Idempotency-Key': randomUUID() },
      data: { outcome: 'abandoned', stats: { kills: 0, shotsFired: current.attempt.spent, hits: 0, meleeKills: 0, durationMs: 0, emptyMagazine: current.attempt.remaining === 0 } },
    });
    expect(settlement.ok(), 'Failed-test reservation cleanup must commit safely').toBe(true);
    await info.attach('failed-test-reservation-cleanup', {
      body: Buffer.from(JSON.stringify({ attemptId: current.attempt.id, spent: current.attempt.spent, returned: current.attempt.remaining })),
      contentType: 'application/json',
    });
  }
  for (const id of fixtures) {
    const deletion = await request.delete(`/api/tasks/${id}`, { headers: { 'Idempotency-Key': randomUUID() } });
    expect(deletion.ok(), 'Delete only this test’s explicitly tracked fixture').toBe(true);
  }
});

test('task CRUD, edit, filtering, once-only rewards and browser reload persistence', async ({ page }, info) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  await terminal(page);
  const before = await snapshot(page);
  await page.getByTestId('task-new').click();
  await expect(page.getByTestId('task-save')).toBeDisabled();
  await page.getByTestId('task-title').fill('   ');
  await expect(page.getByTestId('task-save')).toBeDisabled();
  await page.getByTestId('task-title').fill('E2E / написать письмо');
  await page.getByTestId('task-description').fill('Написать арендодателю до пятницы.');
  await page.getByTestId('task-difficulty').selectOption('normal');
  await page.getByTestId('task-deadline').fill('2026-12-18T15:30');
  await page.getByTestId('task-save').click();
  await expect(page.getByRole('heading', { name: 'E2E / написать письмо', exact: true })).toBeVisible();
  await page.getByTestId('task-edit').click();
  await expect(page.getByTestId('task-description')).toHaveValue('Написать арендодателю до пятницы.');
  await page.getByTestId('task-title').fill('E2E / отправить письмо');
  await page.getByTestId('task-save').click();
  await expect(page.getByRole('heading', { name: 'E2E / отправить письмо', exact: true })).toBeVisible();
  await page.reload();
  await terminal(page);
  await expect(page.getByRole('heading', { name: 'E2E / отправить письмо', exact: true })).toBeVisible();
  await page.getByTestId('task-complete').click();
  await expect(page.getByRole('heading', { name: 'КОНТРАКТ ВЫПОЛНЕН', exact: true })).toBeVisible();
  await page.getByTestId('task-reward-acknowledge').click();
  await page.getByTestId('task-filter-completed').click();
  await expect(page.getByTestId('task-reopen')).toBeVisible();
  const completed = await snapshot(page);
  expect(completed.player.ammo).toBe(before.player.ammo + 6);
  expect(completed.player.xp).toBe(before.player.xp + 100);
  await screenshot(page, info, 'task-terminal-completed');
  await page.getByTestId('task-reopen').click();
  await page.getByTestId('task-filter-active').click();
  await page.getByTestId('task-complete').click();
  await expect.poll(async () => (await snapshot(page)).tasks.find(task => task.title === 'E2E / отправить письмо')?.status).toBe('completed');
  expect((await snapshot(page)).player).toEqual(completed.player);
  await page.getByTestId('task-filter-completed').click();
  await page.getByTestId('task-delete').click();
  await page.getByTestId('task-confirm-delete').click();
  await expect(page.getByRole('heading', { name: 'НЕТ ВЫПОЛНЕННЫХ КОНТРАКТОВ', exact: true })).toBeVisible();
  await expect(page.locator('.task-list [data-testid^="task-row-"]')).toHaveCount(0);
  await page.reload();
  expect((await snapshot(page)).tasks.some(task => task.title === 'E2E / отправить письмо')).toBe(false);
  expect((await snapshot(page)).rewards.length).toBe(before.rewards.length + 1);
  expect(pageErrors).toEqual([]);
});

test('terminal position and size stay fixed across long task details, editors, and filters', async ({ page }, info) => {
  await page.goto('/');
  await terminal(page);
  const dialog = page.getByRole('dialog', { name: 'КОНТРАКТНЫЙ ТЕРМИНАЛ v1.3' });
  const baseline = await dialog.boundingBox();
  if (!baseline) throw new Error('Terminal dialog has no bounds');
  const bounds: { view: string; x: number; y: number; width: number; height: number }[] = [{ view: 'initial', ...baseline }];
  const assertStable = async (view: string) => {
    // Measure the outer window after React has committed the selected view.
    // Long content must scroll inside the window without moving its borders.
    const current = await dialog.boundingBox();
    if (!current) throw new Error(`Terminal dialog has no bounds in ${view}`);
    bounds.push({ view, ...current });
    for (const dimension of ['x', 'y', 'width', 'height'] as const) {
      expect(Math.abs(current[dimension] - baseline[dimension]), `${view}: terminal ${dimension} changed`).toBeLessThanOrEqual(1);
    }
  };

  const title = `E2E / длинное описание ${randomUUID()}`;
  const description = 'Проверить каждую страницу макета, записать замечания редактора и согласовать исправления перед отправкой в печать.\n'.repeat(16);
  await page.getByTestId('task-new').click();
  await expect(page.getByTestId('task-title')).toBeVisible();
  await assertStable('new-editor');
  await page.getByTestId('task-title').fill(title);
  await page.getByTestId('task-description').fill(description);
  await page.getByTestId('task-save').click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const fixture = (await snapshot(page)).tasks.find(task => task.title === title);
  if (!fixture) throw new Error('Long-description fixture was not persisted');
  info.annotations.push({ type: 'fixture-task', description: fixture.id });
  await assertStable('long-description-detail');
  const inspector = dialog.locator('.terminal-inspector');
  expect(await inspector.evaluate(element => element.scrollHeight > element.clientHeight), 'Long task content should scroll inside the inspector').toBe(true);
  await page.getByTestId('task-edit').click();
  await expect(page.getByTestId('task-description')).toHaveValue(description);
  await assertStable('edit-long-description');

  for (const filter of ['completed', 'all', 'receipts', 'active'] as const) {
    await page.getByTestId(`task-filter-${filter}`).click();
    await expect(page.getByTestId(`task-filter-${filter}`)).toHaveClass('active');
    await assertStable(`filter-${filter}`);
  }
  await page.getByTestId(`task-row-${fixture.id}`).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await assertStable('selected-long-description-again');
  await screenshot(page, info, 'terminal-stable-russian');
  await info.attach('terminal-window-bounds', { body: Buffer.from(JSON.stringify(bounds, null, 2)), contentType: 'application/json' });
});

test('terminal remains usable after renderer import failure and retries an uncertain committed create safely', async ({ page }, info) => {
  await page.route('**/src/game/createGame*', route => route.abort('failed'));
  let droppedResponse = false;
  await page.route('**/api/tasks', async route => {
    if (route.request().method() === 'POST' && !droppedResponse) {
      droppedResponse = true;
      await route.fetch();
      await route.abort('connectionreset');
    } else await route.continue();
  });
  await page.goto('/');
  await terminal(page);
  await createTask(page, 'E2E / восстановить потерянное подтверждение');
  const stored = (await snapshot(page)).tasks.filter(task => task.title === 'E2E / восстановить потерянное подтверждение');
  expect(droppedResponse).toBe(true);
  expect(stored).toHaveLength(1);
  await screenshot(page, info, 'terminal-game-unavailable');
  await page.getByTestId('task-delete').click();
  await page.getByTestId('task-confirm-delete').click();
});

test('apartment movement, furniture collision, pause, and text focus suppress game controls', async ({ page }, info) => {
  await startGame(page);
  await screenshot(page, info, 'apartment-initial');
  const initial = await position(page);
  await hold(page, 'a', 900);
  const blocked = await position(page);
  expect(blocked.x).toBeLessThan(initial.x - 30);
  expect(blocked.x).toBeGreaterThanOrEqual(98);
  await hold(page, 'a', 500);
  expect(Math.abs((await position(page)).x - blocked.x)).toBeLessThan(3);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'СИГНАЛ ПРИОСТАНОВЛЕН' })).toBeVisible();
  const paused = await position(page);
  await hold(page, 'd', 450);
  expect(await position(page)).toEqual(paused);
  await page.getByTestId('pause-terminal').click();
  await page.getByTestId('task-new').click();
  await page.getByTestId('task-title').pressSequentially('wasd WASD');
  await page.getByTestId('task-title').press('Tab');
  await expect(page.getByTestId('task-description')).toBeFocused();
  expect(await position(page)).toEqual(paused);
  await screenshot(page, info, 'focused-terminal-pauses-game');
});

test('FIRST CALL is playable through isolated training, persists after reload, and unlocks the mission', async ({ page }, info) => {
  await startGame(page, false);
  const before = await snapshot(page);
  await expect.poll(async () => (await snapshot(page)).tutorial.step).toBe('movement');
  await hold(page, 'd', 250);
  await expect(page.getByTestId('tutorial-answer')).toBeVisible();
  await page.getByTestId('tutorial-answer').click();
  await screenshot(page, info, 'first-call-dialogue');
  await finishCall(page);
  await page.getByTestId('tutorial-terminal').click();
  await createTask(page, 'E2E / настоящий план на завтра');
  await page.getByRole('dialog', { name: 'КОНТРАКТНЫЙ ТЕРМИНАЛ v1.3' }).locator('.close-button').click();
  await expect.poll(async () => (await snapshot(page)).tutorial.step).toBe('rewards');
  await page.reload();
  await page.getByTestId('boot-continue').click();
  await page.getByTestId('menu-continue').click();
  await expect(page.getByTestId('tutorial-training')).toBeVisible();
  await page.getByTestId('tutorial-training').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'training');
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Training canvas has no bounds');
  await page.mouse.move(box.x + box.width * 604 / 768, box.y + box.height * 290 / 480);
  await expect.poll(async () => (await snapshot(page)).tutorial.step).toBe('shoot');
  await page.mouse.click(box.x + box.width * 604 / 768, box.y + box.height * 290 / 480);
  await expect.poll(async () => (await snapshot(page)).tutorial.step).toBe('reload');
  await page.keyboard.press('r');
  await expect.poll(async () => (await snapshot(page)).tutorial.step).toBe('melee');
  await screenshot(page, info, 'training-practice');
  await page.keyboard.press('f');
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'apartment');
  await page.getByTestId('tutorial-answer').click();
  await finishCall(page);
  const after = await snapshot(page);
  expect(after.tutorial).toEqual({ step: 'complete', completed: true, skipped: false });
  expect(after.progress.unlocked).toBe(true);
  expect(after.player.ammo).toBe(before.player.ammo);
  expect(after.player.xp).toBe(before.player.xp);
  expect(after.tasks.find(task => task.title === 'E2E / настоящий план на завтра')?.status).toBe('active');
});

test('audio state transitions and persisted accessible settings follow the interface', async ({ page }, info) => {
  await startGame(page);
  await expect(page.locator('html')).toHaveAttribute('data-music-state', 'APARTMENT');
  await expect(page.locator('html')).toHaveAttribute('data-audio-context', 'running');
  await terminal(page);
  await expect(page.locator('html')).toHaveAttribute('data-music-state', 'TASK_TERMINAL');
  await page.getByRole('dialog', { name: 'КОНТРАКТНЫЙ ТЕРМИНАЛ v1.3' }).locator('.close-button').click();
  await page.getByTestId('open-settings').click();
  // These controls reflect committed server state, which changes asynchronously.
  const mute = page.getByTestId('settings-muted');
  const reducedMotion = page.getByTestId('settings-reducedMotion');
  if (!await mute.isChecked()) await mute.click();
  await expect(mute).toBeChecked();
  if (!await reducedMotion.isChecked()) await reducedMotion.click();
  await expect(reducedMotion).toBeChecked();
  await page.getByTestId('settings-musicVolume').focus();
  await page.keyboard.press('Home');
  await expect.poll(async () => (await snapshot(page)).settings.musicVolume).toBe(0);
  for (let step = 1; step <= 5; step++) {
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await snapshot(page)).settings.musicVolume).toBeCloseTo(step * 0.05);
  }
  await expect.poll(async () => (await snapshot(page)).settings.musicVolume).toBeCloseTo(0.25);
  await screenshot(page, info, 'settings-accessibility');
  await page.reload();
  await page.getByTestId('open-settings').click();
  await expect(page.getByTestId('settings-muted')).toBeChecked();
  await expect(page.getByTestId('settings-reducedMotion')).toBeChecked();
  expect((await snapshot(page)).settings.streamerMode).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-audio-error', '');
});

test('refresh during a mission explicitly reconciles its durable reservation without restoring spent rounds', async ({ page }, info) => {
  await startGame(page);
  // Fund this isolated scenario through the real task/reward API; no other test
  // needs to run first and no gameplay state or outcome is fabricated.
  const title = `E2E / проверка перезагрузки миссии ${randomUUID()}`;
  const created = await page.request.post('/api/tasks', {
    headers: { 'Idempotency-Key': randomUUID() }, data: { title, difficulty: 'easy' },
  });
  expect(created.ok()).toBe(true);
  const fixture = (await created.json() as MutationResult).state.tasks.find(task => task.title === title);
  if (!fixture) throw new Error('Mission scenario task fixture was not persisted');
  info.annotations.push({ type: 'fixture-task', description: fixture.id });
  const completion = await page.request.post(`/api/tasks/${fixture.id}/complete`, { headers: { 'Idempotency-Key': randomUUID() }, data: {} });
  expect(completion.ok()).toBe(true);
  await page.reload();
  await page.getByTestId('boot-continue').click();
  await page.getByTestId('menu-continue').click();
  await expect(page.locator('canvas[data-scene="apartment"]')).toBeVisible();
  const before = await snapshot(page);
  expect(before.player.ammo).toBeGreaterThanOrEqual(3);
  await reachExit(page);
  await page.getByRole('slider', { name: 'Патроны с собой' }).focus();
  await page.keyboard.press('Home');
  for (let round = 0; round < 3; round++) await page.keyboard.press('ArrowRight');
  await page.getByTestId('mission-launch').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'combat');
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Combat canvas has no bounds');
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.7);
  await expect.poll(async () => (await snapshot(page)).attempt?.spent).toBeGreaterThanOrEqual(1);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('dialog', { name: 'КОНТРАКТНЫЙ ТЕРМИНАЛ v1.3' })).toBeVisible();
  const active = await snapshot(page);
  if (!active.attempt) throw new Error('Mission settled before refresh scenario');
  expect(active.player.ammo).toBe(before.player.ammo - 3);
  await screenshot(page, info, 'combat-terminal-paused');
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'ПРЕРВАННОЕ ЗАДАНИЕ / ВОССТАНОВЛЕНИЕ' })).toBeVisible();
  expect((await snapshot(page)).attempt?.spent).toBe(active.attempt.spent);
  await screenshot(page, info, 'mission-refresh-recovery');
  await page.getByTestId('recover-mission').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'apartment');
  await expect.poll(async () => (await snapshot(page)).attempt).toBeNull();
  const recovered = await snapshot(page);
  expect(recovered.player.ammo).toBe(before.player.ammo - active.attempt.spent);
  expect(recovered.tasks).toEqual(before.tasks);
  expect(recovered.player.xp).toBe(before.player.xp);
});
