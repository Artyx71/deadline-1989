import { expect, test, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import type { MutationResult, StateSnapshot } from '../packages/shared/src/index';

// Exercise the actual production Worker protocol with normal validated routes.
// No application test bridge, resource injection or database editing is used.
const workerFile = readdirSync('apps/web/dist-pages/assets').find((name) =>
  /^profile\.worker-.*\.js$/.test(name),
);
if (!workerFile) throw new Error('Build Pages before running its browser tests');
async function request(page: Page, path: string, method = 'GET', body?: unknown, key?: string) {
  return page.evaluate(
    async ({ workerFile, path, method, body, key }) => {
      const worker = new Worker(new URL(`assets/${workerFile}`, location.href), { type: 'module' });
      try {
        return await new Promise<{ status: number; body: unknown }>((resolve, reject) => {
          worker.onmessage = (event) => resolve(event.data);
          worker.onerror = (event) => reject(new Error(event.message));
          worker.postMessage({
            id: crypto.randomUUID(),
            path,
            method,
            body,
            key: key ?? crypto.randomUUID(),
          });
        });
      } finally {
        worker.terminate();
      }
    },
    { workerFile, path, method, body, key },
  );
}
async function state(page: Page): Promise<StateSnapshot> {
  const response = await request(page, '/state');
  expect(response.status).toBe(200);
  return response.body as StateSnapshot;
}
async function terminal(page: Page) {
  await page.getByTestId('open-terminal').click();
  await expect(page.getByTestId('task-new')).toBeEnabled();
}
async function call(page: Page) {
  const dialogue = page.getByRole('dialog', { name: 'ВХОДЯЩИЙ ВЫЗОВ' });
  await expect(dialogue).toBeVisible();
  for (let i = 0; i < 20 && (await dialogue.isVisible()); i++) {
    await page.getByTestId('dialogue-advance').click();
    await page.waitForTimeout(60);
  }
  await expect(dialogue).toBeHidden();
}

test('Pages subpath: real task UI persists in IndexedDB without an API server', async ({
  page,
}) => {
  const errors: string[] = [];
  const apiRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
  });
  await page.goto('./');
  await terminal(page);
  await page.getByTestId('task-new').click();
  await page.getByTestId('task-title').fill('Pages / написать настоящий план');
  await page.getByTestId('task-save').click();
  await expect(
    page.getByRole('heading', { name: 'Pages / написать настоящий план', exact: true }),
  ).toBeVisible();
  await page.reload();
  await terminal(page);
  await expect(
    page.getByRole('heading', { name: 'Pages / написать настоящий план', exact: true }),
  ).toBeVisible();
  await page.getByTestId('task-edit').click();
  await page.getByTestId('task-title').fill('Pages / отправить настоящий план');
  await page.getByTestId('task-save').click();
  await page.getByTestId('task-complete').click();
  await page.getByTestId('task-reward-acknowledge').click();
  const completed = await state(page);
  expect(completed.player.ammo).toBe(6);
  expect(completed.player.xp).toBe(100);
  await page.getByTestId('task-filter-completed').click();
  await page.getByTestId('task-reopen').click();
  await page.getByTestId('task-filter-active').click();
  await page.getByTestId('task-complete').click();
  await expect.poll(async () => (await state(page)).tasks[0]?.status).toBe('completed');
  expect((await state(page)).player).toEqual(completed.player);
  await page.getByTestId('task-filter-completed').click();
  await page.getByTestId('task-delete').click();
  await page.getByTestId('task-confirm-delete').click();
  await expect.poll(async () => (await state(page)).tasks.length).toBe(0);
  await page.reload();
  expect((await state(page)).tasks).toHaveLength(0);
  expect((await state(page)).player.ammo).toBe(6);
  expect(apiRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('Pages SQLite serializes tabs, deduplicates rewards, and persists confirmed new-game reset', async ({
  page,
  context,
}) => {
  await page.goto('./');
  const created = await request(page, '/tasks', 'POST', {
    title: 'Pages / concurrency',
    difficulty: 'hard',
  });
  const task = (created.body as MutationResult).state.tasks[0];
  if (!task) throw new Error('Missing created task');
  const second = await context.newPage();
  await second.goto('./');
  const key = crypto.randomUUID();
  const responses = await Promise.all([
    request(page, `/tasks/${task.id}/complete`, 'POST', {}, key),
    request(second, `/tasks/${task.id}/complete`, 'POST', {}, key),
    request(second, `/tasks/${task.id}/complete`, 'POST', {}, crypto.randomUUID()),
  ]);
  expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
  expect((await state(second)).player).toMatchObject({ ammo: 12, xp: 200 });
  expect((await state(page)).rewards).toHaveLength(1);
  await page.reload();
  await page.getByTestId('boot-continue').click();
  await page.getByTestId('menu-start-game').click();
  await page.getByTestId('newgame-clean').click();
  await expect(page.getByTestId('newgame-confirm-clean')).toBeDisabled();
  expect((await state(page)).tasks).toHaveLength(1);
  await page.getByTestId('newgame-confirm').check();
  await page.getByTestId('newgame-confirm-clean').click();
  await expect.poll(async () => (await state(second)).tasks.length).toBe(0);
  await page.reload();
  expect((await state(page)).player).toMatchObject({ ammo: 0, xp: 0 });
  expect((await state(page)).rewards).toHaveLength(0);
});

test('Pages gameplay loads assets, separate training, dispatch, real shot and durable refresh recovery', async ({
  page,
}, info) => {
  const errors: string[] = [];
  const failedAssets: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && response.url().includes('/assets/'))
      failedAssets.push(response.url());
  });
  await page.goto('./');
  const created = await request(page, '/tasks', 'POST', {
    title: 'Pages / mission fixture',
    difficulty: 'normal',
  });
  const task = (created.body as MutationResult).state.tasks[0];
  if (!task) throw new Error('Missing fixture');
  await request(page, `/tasks/${task.id}/complete`, 'POST', {});
  await page.reload();
  await page.getByTestId('boot-continue').click();
  await page.getByTestId('menu-start-game').click();
  await page.getByTestId('newgame-story').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'apartment');
  await call(page);
  // Existing real task creation proceeds through the supported tutorial button.
  await page.getByTestId('tutorial-terminal').click();
  await page.getByTestId('task-new').click();
  await page.getByTestId('task-title').fill('Pages / practice later');
  await page.getByTestId('task-save').click();
  await page
    .getByRole('dialog', { name: 'КОНТРАКТНЫЙ ТЕРМИНАЛ v1.3' })
    .locator('.close-button')
    .click();
  await page.getByTestId('tutorial-training').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'training');
  await page.screenshot({ path: info.outputPath('pages-training.png') });
  await page.getByTestId('tutorial-skip').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'apartment');
  await page.getByTestId('mission-dispatch').click();
  await page.getByRole('slider', { name: 'Патроны с собой' }).fill('3');
  await page.getByTestId('mission-launch').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-scene', 'combat');
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('No combat canvas');
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.7);
  await expect.poll(async () => (await state(page)).attempt?.spent).toBe(1);
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('task-new')).toBeEnabled();
  await expect
    .poll(async () => Number(await page.locator('html').getAttribute('data-effect-rms-peak')))
    .toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByTestId('recover-mission')).toBeVisible();
  await page.getByTestId('recover-mission').click();
  await expect.poll(async () => (await state(page)).attempt).toBeNull();
  const recovered = await state(page);
  expect(recovered.player).toMatchObject({ ammo: 5, xp: 100 });
  expect(recovered.tasks).toHaveLength(2);
  expect(failedAssets).toEqual([]);
  expect(errors).toEqual([]);
});
