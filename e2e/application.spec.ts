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
  await page.getByTestId('newgame-story').click();
  await expect(page.locator('canvas[data-scene="apartment"]')).toBeVisible();
  await expect(page.locator('canvas')).toHaveAttribute('data-player-x', /\d/);
  await expect(page.locator('canvas')).toHaveAttribute('data-layout-version', 'studio-v3');
  if (skip) {
    // The first call opens automatically; complete it before using the hub.
    await finishCall(page);
    await page.getByTestId('tutorial-skip').click();
    await expect.poll(async () => (await snapshot(page)).tutorial.skipped).toBe(true);
  }
}
async function position(page: Page) {
  const canvas = page.locator('canvas');
  return {
    x: Number(await canvas.getAttribute('data-player-x')),
    y: Number(await canvas.getAttribute('data-player-y')),
  };
}
async function hold(page: Page, key: string, milliseconds: number) {
  await page.keyboard.down(key);
  await page.waitForTimeout(milliseconds);
  await page.keyboard.up(key);
  // Diagnostics refresh every twelve actual frames, independent of this test.
  await page.waitForTimeout(250);
}
async function walkTo(page: Page, x: number, y: number, tolerance = 10) {
  for (const axis of ['x', 'y'] as const) {
    const target = axis === 'x' ? x : y;
    for (let tries = 0; tries < 35; tries++) {
      const current = await position(page);
      const distance = target - current[axis];
      if (Math.abs(distance) <= tolerance) break;
      const key = axis === 'x' ? (distance > 0 ? 'd' : 'a') : distance > 0 ? 's' : 'w';
      await hold(page, key, Math.max(25, Math.min(150, (Math.abs(distance) / 220) * 750)));
      if (tries === 34)
        throw new Error(
          `Walk blocked approaching ${axis}=${target}; player=${JSON.stringify(await position(page))}`,
        );
    }
  }
}
async function reachExit(page: Page) {
  // Walk around the coat stand and unpacked box in the studio entrance.
  await walkTo(page, 248, 232);
  await walkTo(page, 248, 390);
  await walkTo(page, 216, 390);
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
  const lines = new Set<string>();
  for (let line = 0; line < 20 && (await panel.isVisible()); line++) {
    lines.add(await panel.locator('.dialogue-text .sr-only').innerText());
    await panel.getByTestId('dialogue-advance').click();
    await page.waitForTimeout(60);
  }
  await expect(panel).toBeHidden();
  return [...lines].join('\n');
}

test.afterEach(async ({ page, request }, info) => {
  const failed = info.status !== info.expectedStatus;
  const fixtures = info.annotations
    .filter((annotation) => annotation.type === 'fixture-task')
    .map((annotation) => annotation.description)
    .filter((id): id is string => Boolean(id));
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
  const current = (await response.json()) as StateSnapshot;
  if (failed && current.attempt) {
    const settlement = await request.post(`/api/missions/${current.attempt.id}/finish`, {
      headers: { 'Idempotency-Key': randomUUID() },
      data: {
        outcome: 'abandoned',
        stats: {
          kills: 0,
          shotsFired: current.attempt.spent,
          hits: 0,
          meleeKills: 0,
          durationMs: 0,
          emptyMagazine: current.attempt.remaining === 0,
        },
      },
    });
    expect(settlement.ok(), 'Failed-test reservation cleanup must commit safely').toBe(true);
    await info.attach('failed-test-reservation-cleanup', {
      body: Buffer.from(
        JSON.stringify({
          attemptId: current.attempt.id,
          spent: current.attempt.spent,
          returned: current.attempt.remaining,
        }),
      ),
      contentType: 'application/json',
    });
  }
  for (const id of fixtures) {
    // A confirmed clean-profile test may already have removed its fixtures.
    if (!current.tasks.some((task) => task.id === id)) continue;
    const deletion = await request.delete(`/api/tasks/${id}`, {
      headers: { 'Idempotency-Key': randomUUID() },
    });
    expect(deletion.ok(), 'Delete only this test’s explicitly tracked fixture').toBe(true);
  }
});

test('task CRUD, edit, filtering, once-only rewards and browser reload persistence', async ({
  page,
}, info) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
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
  await expect(
    page.getByRole('heading', { name: 'E2E / написать письмо', exact: true }),
  ).toBeVisible();
  await page.getByTestId('task-edit').click();
  await expect(page.getByTestId('task-description')).toHaveValue(
    'Написать арендодателю до пятницы.',
  );
  await page.getByTestId('task-title').fill('E2E / отправить письмо');
  await page.getByTestId('task-save').click();
  await expect(
    page.getByRole('heading', { name: 'E2E / отправить письмо', exact: true }),
  ).toBeVisible();
  await page.reload();
  await terminal(page);
  await expect(
    page.getByRole('heading', { name: 'E2E / отправить письмо', exact: true }),
  ).toBeVisible();
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
  await expect
    .poll(
      async () =>
        (await snapshot(page)).tasks.find((task) => task.title === 'E2E / отправить письмо')
          ?.status,
    )
    .toBe('completed');
  expect((await snapshot(page)).player).toEqual(completed.player);
  await page.getByTestId('task-filter-completed').click();
  await page.getByTestId('task-delete').click();
  await page.getByTestId('task-confirm-delete').click();
  await expect(
    page.getByRole('heading', { name: 'НЕТ ВЫПОЛНЕННЫХ КОНТРАКТОВ', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.task-list [data-testid^="task-row-"]')).toHaveCount(0);
  await page.reload();
  expect((await snapshot(page)).tasks.some((task) => task.title === 'E2E / отправить письмо')).toBe(
    false,
  );
  expect((await snapshot(page)).rewards.length).toBe(before.rewards.length + 1);
  expect(pageErrors).toEqual([]);
});

test('terminal position and size stay fixed across long task details, editors, and filters', async ({
  page,
}, info) => {
  await page.goto('/');
  await terminal(page);
  const dialog = page.getByRole('dialog', { name: 'КОНТРАКТНЫЙ ТЕРМИНАЛ v1.3' });
  const baseline = await dialog.boundingBox();
  if (!baseline) throw new Error('Terminal dialog has no bounds');
  const bounds: { view: string; x: number; y: number; width: number; height: number }[] = [
    { view: 'initial', ...baseline },
  ];
  const assertStable = async (view: string) => {
    // Measure the outer window after React has committed the selected view.
    // Long content must scroll inside the window without moving its borders.
    const current = await dialog.boundingBox();
    if (!current) throw new Error(`Terminal dialog has no bounds in ${view}`);
    bounds.push({ view, ...current });
    for (const dimension of ['x', 'y', 'width', 'height'] as const) {
      expect(
        Math.abs(current[dimension] - baseline[dimension]),
        `${view}: terminal ${dimension} changed`,
      ).toBeLessThanOrEqual(1);
    }
  };

  const title = `E2E / длинное описание ${randomUUID()}`;
  const description =
    'Проверить каждую страницу макета, записать замечания редактора и согласовать исправления перед отправкой в печать.\n'.repeat(
      16,
    );
  await page.getByTestId('task-new').click();
  await expect(page.getByTestId('task-title')).toBeVisible();
  await assertStable('new-editor');
  await page.getByTestId('task-title').fill(title);
  await page.getByTestId('task-description').fill(description);
  await page.getByTestId('task-save').click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const fixture = (await snapshot(page)).tasks.find((task) => task.title === title);
  if (!fixture) throw new Error('Long-description fixture was not persisted');
  info.annotations.push({ type: 'fixture-task', description: fixture.id });
  await assertStable('long-description-detail');
  const inspector = dialog.locator('.terminal-inspector');
  expect(
    await inspector.evaluate((element) => element.scrollHeight > element.clientHeight),
    'Long task content should scroll inside the inspector',
  ).toBe(true);
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
  await info.attach('terminal-window-bounds', {
    body: Buffer.from(JSON.stringify(bounds, null, 2)),
    contentType: 'application/json',
  });
});

test('terminal remains usable after renderer import failure and retries an uncertain committed create safely', async ({
  page,
}, info) => {
  await page.route('**/src/game/createGame*', (route) => route.abort('failed'));
  let droppedResponse = false;
  await page.route('**/api/tasks', async (route) => {
    if (route.request().method() === 'POST' && !droppedResponse) {
      droppedResponse = true;
      await route.fetch();
      await route.abort('connectionreset');
    } else await route.continue();
  });
  await page.goto('/');
  await terminal(page);
  await createTask(page, 'E2E / восстановить потерянное подтверждение');
  const stored = (await snapshot(page)).tasks.filter(
    (task) => task.title === 'E2E / восстановить потерянное подтверждение',
  );
  expect(droppedResponse).toBe(true);
  expect(stored).toHaveLength(1);
  await screenshot(page, info, 'terminal-game-unavailable');
  await page.getByTestId('task-delete').click();
  await page.getByTestId('task-confirm-delete').click();
});

test('apartment movement, furniture collision, pause, and text focus suppress game controls', async ({
  page,
}, info) => {
  await startGame(page);
  await screenshot(page, info, 'apartment-initial');
  const initial = await position(page);
  await hold(page, 'a', 900);
  const blocked = await position(page);
  expect(blocked.x).toBeLessThan(initial.x - 30);
  // The studio plant occupies x=90..132; the player's half-width is seven.
  expect(blocked.x).toBeGreaterThanOrEqual(139);
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

test('FIRST CALL is playable through isolated training, persists after reload, and unlocks the mission', async ({
  page,
}, info) => {
  const fetchedAudio = new Set<string>();
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname;
    if (path.startsWith('/assets/audio/') && path.endsWith('.wav') && response.ok())
      fetchedAudio.add(path);
  });
  const playedSfx = async () =>
    JSON.parse((await page.locator('html').getAttribute('data-played-sfx')) ?? '{}') as Record<
      string,
      number
    >;
  await startGame(page, false);
  const before = await snapshot(page);
  // No phone button or movement triggers the initial call.
  await expect(page.getByRole('dialog', { name: 'ВХОДЯЩИЙ ВЫЗОВ' })).toHaveClass(/dialogue-intro/);
  await screenshot(page, info, 'first-call-dialogue');
  const explanation = await finishCall(page);
  expect(explanation).toContain('список реальных дел');
  expect(explanation).toContain('один раз');
  expect(explanation).toContain('Бой не выполняет задачи');
  expect(explanation).toContain('выполнять её ради обучения не нужно');
  await expect.poll(async () => (await snapshot(page)).tutorial.step).toBe('computer');
  await walkTo(page, 280, 220);
  await walkTo(page, 458, 220);
  await walkTo(page, 458, 160);
  await expect(page.locator('.interaction-prompt')).toContainText('ОТКРЫТЬ КОМПЬЮТЕР');
  await page.keyboard.press('e');
  await expect(page.getByTestId('task-new')).toBeEnabled();
  await createTask(page, 'E2E / настоящий план на завтра');
  await page
    .getByRole('dialog', { name: 'КОНТРАКТНЫЙ ТЕРМИНАЛ v1.3' })
    .locator('.close-button')
    .click();
  await expect.poll(async () => (await snapshot(page)).tutorial.step).toBe('rewards');
  await page.reload();
  await page.getByTestId('boot-continue').click();
  await page.getByTestId('menu-continue').click();
  await expect(page.getByTestId('tutorial-training')).toBeVisible();
  await page.getByTestId('tutorial-training').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'training');
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Training canvas has no bounds');
  await page.mouse.move(box.x + (box.width * 604) / 768, box.y + (box.height * 290) / 480);
  await expect.poll(async () => (await snapshot(page)).tutorial.step).toBe('shoot');
  const beforeShot = await playedSfx();
  await page.mouse.click(box.x + (box.width * 604) / 768, box.y + (box.height * 290) / 480);
  await expect.poll(async () => (await snapshot(page)).tutorial.step).toBe('reload');
  await expect
    .poll(async () => (await playedSfx()).gunshot ?? 0)
    .toBeGreaterThan(beforeShot.gunshot ?? 0);
  await expect
    .poll(async () => Number(await page.locator('html').getAttribute('data-effect-rms-peak')))
    .toBeGreaterThan(0);
  await page.keyboard.press('r');
  await expect.poll(async () => (await snapshot(page)).tutorial.step).toBe('melee');
  await walkTo(page, 568, 290, 4);
  const beforeMelee = await playedSfx();
  await screenshot(page, info, 'training-practice');
  await page.keyboard.press('f');
  await expect
    .poll(async () => (await playedSfx()).melee ?? 0)
    .toBeGreaterThan(beforeMelee.melee ?? 0);
  expect(fetchedAudio.has('/assets/audio/sfx-gunshot.wav')).toBe(true);
  expect(fetchedAudio.has('/assets/audio/sfx-melee.wav')).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-audio-error', '');
  await info.attach('training-real-audio', {
    body: Buffer.from(
      JSON.stringify(
        {
          fetchedAudio: [...fetchedAudio],
          playedSfx: await playedSfx(),
          effectRmsPeak: Number(await page.locator('html').getAttribute('data-effect-rms-peak')),
        },
        null,
        2,
      ),
    ),
    contentType: 'application/json',
  });
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'apartment');
  await walkTo(page, 280, 220);
  await walkTo(page, 440, 220);
  await walkTo(page, 440, 265);
  await walkTo(page, 479, 265);
  await expect(page.locator('.interaction-prompt')).toContainText('ОТВЕТИТЬ НА ЗВОНОК');
  await page.keyboard.press('e');
  await finishCall(page);
  const after = await snapshot(page);
  expect(after.tutorial).toEqual({ step: 'complete', completed: true, skipped: false });
  expect(after.progress.unlocked).toBe(true);
  expect(after.player.ammo).toBe(before.player.ammo);
  expect(after.player.xp).toBe(before.player.xp);
  expect(after.tasks.find((task) => task.title === 'E2E / настоящий план на завтра')?.status).toBe(
    'active',
  );
});

test('studio task brief creates a real task directly in a focused editor', async ({
  page,
}, info) => {
  await startGame(page);
  const brief = page.getByTestId('task-brief');
  await expect(brief.getByRole('heading', { name: 'МОИ ДЕЛА' })).toBeVisible();
  await expect(brief).toContainText('Выполненное дело');
  const before = await snapshot(page);
  await page.getByTestId('task-brief-create').click();
  await expect(page.getByTestId('task-title')).toBeFocused();
  await expect(page.getByTestId('task-title')).toHaveValue('');
  const title = `E2E / записать дело из студии ${randomUUID()}`;
  await page.getByTestId('task-title').fill(title);
  await page.getByTestId('task-save').click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  const after = await snapshot(page);
  const fixture = after.tasks.find((task) => task.title === title);
  if (!fixture) throw new Error('Task brief fixture was not persisted');
  info.annotations.push({ type: 'fixture-task', description: fixture.id });
  expect(fixture.status).toBe('active');
  expect(after.player).toEqual(before.player);
  await page
    .getByRole('dialog', { name: 'КОНТРАКТНЫЙ ТЕРМИНАЛ v1.3' })
    .locator('.close-button')
    .click();
  await expect(brief.getByRole('button', { name: title, exact: true })).toBeVisible();
  await screenshot(page, info, 'studio-task-brief');
  await page.getByTestId('task-brief-open').click();
  await expect(page.getByTestId('task-new')).toBeEnabled();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.getByTestId('task-title')).toBeHidden();
});

test('studio television opens with E, requests a muted player, and restores gameplay on close', async ({
  page,
}, info) => {
  // Exercise the official iframe URL and player message protocol in isolation.
  // This fixture verifies integration; it does not claim network video playback.
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><html lang="ru"><body data-commands="[]">Тест видеоплеера<script>
      const commands = [];
      window.addEventListener('message', event => {
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.event !== 'command') return;
        commands.push(message);
        document.body.dataset.commands = JSON.stringify(commands);
        if (message.func === 'playVideo') parent.postMessage(JSON.stringify({ event: 'infoDelivery', info: { playerState: 1, muted: true, volume: 0 } }), '*');
      });
    </script></body></html>`,
    }),
  );
  await startGame(page);
  await walkTo(page, 248, 232);
  await walkTo(page, 248, 400);
  await walkTo(page, 298, 400, 4);
  await walkTo(page, 298, 384, 4);
  await expect(page.locator('.interaction-prompt')).toContainText('СМОТРЕТЬ ТЕЛЕВИЗОР');
  await page.keyboard.press('e');
  const television = page.getByRole('dialog', { name: 'ТЕЛЕВИЗОР / КАНАЛ 03' });
  await expect(television).toBeVisible();
  const frame = page.getByTestId('television-frame');
  const source = await frame.getAttribute('src');
  if (!source) throw new Error('Television iframe has no source');
  const url = new URL(source);
  expect(url.origin).toBe('https://www.youtube-nocookie.com');
  expect(url.pathname).toBe('/embed/UgXM7ivgYTo');
  expect(url.searchParams.get('autoplay')).toBe('1');
  expect(url.searchParams.get('mute')).toBe('1');
  expect(url.searchParams.get('controls')).toBe('0');
  expect(url.searchParams.get('disablekb')).toBe('1');
  await expect(television.getByRole('status')).toHaveText('ЭФИР ПОДКЛЮЧЁН');
  const fixturePlayer = page.frameLocator('#deadline-tv-player').locator('body');
  await expect
    .poll(async () => {
      const commands = JSON.parse((await fixturePlayer.getAttribute('data-commands')) ?? '[]') as {
        func: string;
        args: number[];
      }[];
      return (
        commands.some((command) => command.func === 'mute') &&
        commands.some((command) => command.func === 'setVolume' && command.args[0] === 0)
      );
    })
    .toBe(true);
  await expect
    .poll(async () => page.locator('canvas').getAttribute('data-externally-paused'))
    .toBe('true');
  const paused = await position(page);
  await hold(page, 'd', 350);
  expect(await position(page)).toEqual(paused);
  await screenshot(page, info, 'studio-television-muted-fixture');
  await page.getByTestId('television-close').click();
  await expect(frame).toHaveCount(0);
  await expect(page.getByTestId('task-brief')).toBeVisible();
  await hold(page, 'a', 200);
  expect((await position(page)).x).toBeLessThan(paused.x - 5);

  // The lower aisle is narrow: keep the body below the TV cabinet and above
  // the exterior wall while approaching the equipment cabinet from the left.
  await walkTo(page, 248, 407, 3);
  await walkTo(page, 566, 407);
  await walkTo(page, 566, 383);
  await expect(page.locator('.interaction-prompt')).toContainText('ПРОВЕРИТЬ СНАРЯЖЕНИЕ');
  await page.keyboard.press('e');
  const loadout = page.getByRole('dialog', { name: 'ДИСПЕТЧЕРСКАЯ / НОЧНАЯ СМЕНА' });
  await expect(loadout).toBeVisible();
  await loadout.locator('.close-button').click();
  await walkTo(page, 566, 330);
  await walkTo(page, 661, 330);
  await walkTo(page, 661, 382);
  await expect(page.locator('.interaction-prompt')).toContainText('ТРЕНИРОВКА');
  await page.keyboard.press('e');
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'training');
  await page.locator('.training-return').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'apartment');
  await expect(page.locator('canvas')).toHaveAttribute('data-layout-version', 'studio-v3');
});

test('audio state transitions and persisted accessible settings follow the interface', async ({
  page,
}, info) => {
  await startGame(page);
  await expect(page.locator('html')).toHaveAttribute('data-music-state', 'APARTMENT');
  await expect(page.locator('html')).toHaveAttribute('data-audio-context', 'running');
  await terminal(page);
  await expect(page.locator('html')).toHaveAttribute('data-music-state', 'TASK_TERMINAL');
  await page
    .getByRole('dialog', { name: 'КОНТРАКТНЫЙ ТЕРМИНАЛ v1.3' })
    .locator('.close-button')
    .click();
  await page.getByTestId('open-settings').click();
  // These controls reflect committed server state, which changes asynchronously.
  const mute = page.getByTestId('settings-muted');
  const reducedMotion = page.getByTestId('settings-reducedMotion');
  if (!(await mute.isChecked())) await mute.click();
  await expect(mute).toBeChecked();
  if (!(await reducedMotion.isChecked())) await reducedMotion.click();
  await expect(reducedMotion).toBeChecked();
  await page.getByTestId('settings-musicVolume').focus();
  await page.keyboard.press('Home');
  await expect.poll(async () => (await snapshot(page)).settings.musicVolume).toBe(0);
  for (let step = 1; step <= 5; step++) {
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(async () => (await snapshot(page)).settings.musicVolume)
      .toBeCloseTo(step * 0.05);
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

test('refresh during a mission explicitly reconciles its durable reservation without restoring spent rounds', async ({
  page,
}, info) => {
  await startGame(page);
  // Fund this isolated scenario through the real task/reward API; no other test
  // needs to run first and no gameplay state or outcome is fabricated.
  const title = `E2E / проверка перезагрузки миссии ${randomUUID()}`;
  const created = await page.request.post('/api/tasks', {
    headers: { 'Idempotency-Key': randomUUID() },
    data: { title, difficulty: 'easy' },
  });
  expect(created.ok()).toBe(true);
  const fixture = ((await created.json()) as MutationResult).state.tasks.find(
    (task) => task.title === title,
  );
  if (!fixture) throw new Error('Mission scenario task fixture was not persisted');
  info.annotations.push({ type: 'fixture-task', description: fixture.id });
  const completion = await page.request.post(`/api/tasks/${fixture.id}/complete`, {
    headers: { 'Idempotency-Key': randomUUID() },
    data: {},
  });
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
  await expect(
    page.getByRole('dialog', { name: 'ПРЕРВАННОЕ ЗАДАНИЕ / ВОССТАНОВЛЕНИЕ' }),
  ).toBeVisible();
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

test('New Game preserves story resources or clears the isolated profile only after explicit consent', async ({
  page,
}, info) => {
  // The native suite owns a fresh temporary SQLite profile on 5174/3002.
  // Only synthetic fixtures in that profile are subject to this reset.
  await page.goto('/');
  const fixtureIds: string[] = [];
  for (const difficulty of ['normal', 'easy'] as const) {
    const title = `E2E / новая игра ${difficulty} ${randomUUID()}`;
    const created = await page.request.post('/api/tasks', {
      headers: { 'Idempotency-Key': randomUUID() },
      data: { title, difficulty },
    });
    expect(created.ok()).toBe(true);
    const fixture = ((await created.json()) as MutationResult).state.tasks.find(
      (task) => task.title === title,
    );
    if (!fixture) throw new Error('New Game fixture was not persisted');
    fixtureIds.push(fixture.id);
    info.annotations.push({ type: 'fixture-task', description: fixture.id });
    if (difficulty === 'normal') {
      const completed = await page.request.post(`/api/tasks/${fixture.id}/complete`, {
        headers: { 'Idempotency-Key': randomUUID() },
        data: {},
      });
      expect(completed.ok()).toBe(true);
    }
  }
  const before = await snapshot(page);
  expect(
    before.tasks.some((task) => fixtureIds.includes(task.id) && task.status === 'active'),
  ).toBe(true);
  expect(
    before.tasks.some((task) => fixtureIds.includes(task.id) && task.status === 'completed'),
  ).toBe(true);
  expect(before.player.ammo).toBeGreaterThanOrEqual(6);
  expect(before.player.xp).toBeGreaterThanOrEqual(100);

  await bootMenu(page);
  await page.getByTestId('menu-start-game').click();
  await expect(page.getByRole('dialog', { name: 'НОВАЯ ИГРА', exact: true })).toBeVisible();
  await expect(page.getByTestId('newgame-clean')).toHaveClass(/button-primary/);
  await expect(page.getByTestId('newgame-story')).toHaveClass(/button-secondary/);
  await page.getByTestId('newgame-story').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'apartment');
  const story = await snapshot(page);
  expect(story.tasks).toEqual(before.tasks);
  expect(story.rewards).toEqual(before.rewards);
  expect(story.player.ammo).toBe(before.player.ammo);
  expect(story.player.xp).toBe(before.player.xp);
  expect(story.settings).toEqual(before.settings);

  await bootMenu(page);
  await page.getByTestId('menu-start-game').click();
  await page.getByTestId('newgame-clean').click();
  const warning = page.getByRole('dialog', { name: 'НОВАЯ ИГРА', exact: true });
  await expect(
    warning.getByRole('heading', { name: 'Удалить все данные профиля?', exact: true }),
  ).toBeVisible();
  await expect(warning).toContainText('Все настоящие задачи, в том числе выполненные.');
  await expect(warning).toContainText('История наград, патроны и опыт.');
  await expect(page.getByTestId('newgame-confirm')).not.toBeChecked();
  await expect(page.getByTestId('newgame-confirm-clean')).toBeDisabled();
  const unconfirmed = await snapshot(page);
  expect(unconfirmed.tasks).toEqual(before.tasks);
  expect(unconfirmed.player.ammo).toBe(before.player.ammo);
  expect(unconfirmed.player.xp).toBe(before.player.xp);
  await page.getByTestId('newgame-confirm').check();
  await expect(page.getByTestId('newgame-confirm-clean')).toBeEnabled();
  await warning.getByRole('button', { name: '← ВЕРНУТЬСЯ К ВЫБОРУ', exact: true }).click();
  await page.getByTestId('newgame-clean').click();
  await expect(page.getByTestId('newgame-confirm')).not.toBeChecked();
  await expect(page.getByTestId('newgame-confirm-clean')).toBeDisabled();
  await screenshot(page, info, 'newgame-clean-warning');
  await page.getByTestId('newgame-confirm').check();
  await page.getByTestId('newgame-confirm-clean').click();
  await expect.poll(async () => (await snapshot(page)).tasks.length).toBe(0);
  const cleared = await snapshot(page);
  expect(cleared.rewards).toEqual([]);
  expect(cleared.player).toEqual({ ammo: 0, xp: 0, deaths: 0, consecutiveDeaths: 0 });
  expect(cleared.attempt).toBeNull();
  expect(cleared.progress.completions).toBe(0);
  expect(cleared.tutorial.completed).toBe(false);
  expect(cleared.tutorial.skipped).toBe(false);
  expect(cleared.settings).toEqual(before.settings);
  await page.reload();
  await terminal(page);
  const persisted = await snapshot(page);
  expect(persisted.tasks).toEqual([]);
  expect(persisted.rewards).toEqual([]);
  expect(persisted.player).toEqual(cleared.player);
  expect(persisted.settings).toEqual(before.settings);
  await expect(page.locator('.task-list [data-testid^="task-row-"]')).toHaveCount(0);
  await screenshot(page, info, 'newgame-clean-profile-persisted');
});
