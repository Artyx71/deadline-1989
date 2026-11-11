import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { MissionStats, MutationResult, StateSnapshot } from '@deadline/shared';
import { createApp, type AppOptions } from '../src/app.js';
import { openDatabase } from '../src/database.js';

const apps: FastifyInstance[] = [];
const directories: string[] = [];
function app(options: AppOptions = {}) {
  const instance = createApp({ dbPath: ':memory:', ...options });
  apps.push(instance);
  return instance;
}
function temporaryDatabase() {
  const directory = mkdtempSync(join(tmpdir(), 'deadline-api-'));
  directories.push(directory);
  return join(directory, 'profile.sqlite');
}
async function mutate(
  instance: FastifyInstance,
  method: 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload: object = {},
  key = randomUUID(),
) {
  return instance.inject({ method, url, payload, headers: { 'idempotency-key': key } });
}
async function successful(
  instance: FastifyInstance,
  method: 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload: object = {},
  key = randomUUID(),
) {
  const response = await mutate(instance, method, url, payload, key);
  expect(response.statusCode, response.body).toBe(200);
  return response.json<MutationResult>();
}
async function state(instance: FastifyInstance) {
  return (await instance.inject({ method: 'GET', url: '/api/state' })).json<StateSnapshot>();
}
async function earn(instance: FastifyInstance, difficulty = 'normal') {
  const created = await successful(instance, 'POST', '/api/tasks', {
    title: `Task ${randomUUID()}`,
    difficulty,
  });
  const task = created.state.tasks.find((item) => !item.rewarded);
  if (!task) throw new Error('Created task missing');
  const result = await successful(instance, 'POST', `/api/tasks/${task.id}/complete`);
  return { id: task.id, result };
}
async function start(instance: FastifyInstance, ammo: number) {
  await successful(instance, 'PATCH', '/api/tutorial', { skipped: true });
  const result = await successful(instance, 'POST', '/api/missions/start', {
    ammo,
    missionId: 'first-shift',
  });
  if (!result.state.attempt) throw new Error('Started attempt missing');
  return result.state.attempt;
}
function stats(shotsFired = 0, extra: Partial<MissionStats> = {}): MissionStats {
  return {
    kills: 0,
    shotsFired,
    hits: 0,
    meleeKills: 0,
    durationMs: 1000,
    emptyMagazine: false,
    ...extra,
  };
}
afterEach(async () => {
  await Promise.all(apps.splice(0).map((instance) => instance.close()));
  directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true }));
});

describe('task API and atomic rewards', () => {
  it('starts empty, validates requests, requires mutation identity, and supports CRUD', async () => {
    const server = app();
    expect((await state(server)).player).toEqual({
      ammo: 0,
      xp: 0,
      deaths: 0,
      consecutiveDeaths: 0,
    });
    expect(
      (await server.inject({ method: 'POST', url: '/api/tasks', payload: { title: 'Unkeyed' } }))
        .statusCode,
    ).toBe(400);
    for (const payload of [
      { title: '' },
      { title: 'x', ammo: 999 },
      { title: 'x', difficulty: 'impossible' },
      { title: 'x', dueAt: 'tomorrow' },
    ]) {
      expect((await mutate(server, 'POST', '/api/tasks', payload)).statusCode).toBe(400);
    }
    const created = await successful(server, 'POST', '/api/tasks', {
      title: '  Write letter  ',
      description: 'Real work',
      dueAt: '2026-11-13T09:00:00.000Z',
    });
    const task = created.state.tasks[0];
    if (!task) throw new Error('Task missing');
    expect(task.title).toBe('Write letter');
    expect(task.rewarded).toBe(false);
    const edited = await successful(server, 'PATCH', `/api/tasks/${task.id}`, {
      title: 'Mail letter',
      dueAt: null,
    });
    expect(edited.state.tasks[0]?.dueAt).toBeNull();
    expect(edited.state.tasks[0]?.description).toBe('Real work');
    const deleted = await successful(server, 'DELETE', `/api/tasks/${task.id}`);
    expect(deleted.state.tasks).toHaveLength(0);
    expect(deleted.state.player.ammo).toBe(0);
    expect((await mutate(server, 'POST', `/api/tasks/${task.id}/complete`)).statusCode).toBe(404);
  });
  it.each([
    ['easy', 3, 50],
    ['normal', 6, 100],
    ['hard', 12, 200],
  ] as const)('issues the server-defined %s reward', async (difficulty, ammo, xp) => {
    const { result } = await earn(app(), difficulty);
    expect(result.state.player.ammo).toBe(ammo);
    expect(result.state.player.xp).toBe(xp);
    expect(result.reward).toMatchObject({ ammo, xp });
  });
  it('replays exact committed results and rejects conflicting key scope or payload', async () => {
    const server = app();
    const key = randomUUID();
    const first = await successful(server, 'POST', '/api/tasks', { title: 'One' }, key);
    const second = await successful(server, 'POST', '/api/tasks', { title: 'One' }, key);
    expect(second).toEqual(first);
    expect((await state(server)).tasks).toHaveLength(1);
    expect((await mutate(server, 'POST', '/api/tasks', { title: 'Two' }, key)).statusCode).toBe(
      409,
    );
    expect((await mutate(server, 'PATCH', '/api/settings', { muted: true }, key)).statusCode).toBe(
      409,
    );
  });
  it('concurrent completion keys and retries grant once; reopen/edit/delete retain claims', async () => {
    const server = app();
    const created = await successful(server, 'POST', '/api/tasks', {
      title: 'One reward',
      difficulty: 'normal',
    });
    const id = created.state.tasks[0]?.id;
    expect(id).toBeDefined();
    const key = randomUUID();
    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        mutate(server, 'POST', `/api/tasks/${id}/complete`, {}, index % 2 ? key : randomUUID()),
      ),
    );
    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    await successful(server, 'POST', `/api/tasks/${id}/reopen`);
    await successful(server, 'PATCH', `/api/tasks/${id}`, { difficulty: 'hard' });
    const recompleted = await successful(server, 'POST', `/api/tasks/${id}/complete`);
    expect(recompleted.reward).toBeUndefined();
    expect(recompleted.state.player).toMatchObject({ ammo: 6, xp: 100 });
    const deleted = await successful(server, 'DELETE', `/api/tasks/${id}`);
    expect(deleted.state.rewards).toHaveLength(1);
    expect(deleted.state.tasks).toHaveLength(0);
    expect(deleted.state.player.ammo).toBe(6);
  });
  it('rolls back task status, claim, balance, revision, and key on an injected failure', async () => {
    let fail = true;
    const server = app({
      failpoint: (point) => {
        if (fail && point === 'completion-after-claim')
          throw new Error('Injected transaction failure');
      },
    });
    const created = await successful(server, 'POST', '/api/tasks', { title: 'Atomic task' });
    const id = created.state.tasks[0]?.id;
    const before = await state(server);
    const key = randomUUID();
    expect((await mutate(server, 'POST', `/api/tasks/${id}/complete`, {}, key)).statusCode).toBe(
      500,
    );
    expect(await state(server)).toEqual(before);
    fail = false;
    const completed = await successful(server, 'POST', `/api/tasks/${id}/complete`, {}, key);
    expect(completed.state.player.ammo).toBe(6);
    expect(completed.state.rewards).toHaveLength(1);
  });
  it('rolls back the fully staged response and resource ledger before commit', async () => {
    let fail = false;
    const server = app({
      failpoint: (point) => {
        if (fail && point === 'mutation-before-commit') throw new Error('Lost before commit');
      },
    });
    const created = await successful(server, 'POST', '/api/tasks', { title: 'All or nothing' });
    const id = created.state.tasks[0]?.id;
    const key = randomUUID();
    fail = true;
    expect((await mutate(server, 'POST', `/api/tasks/${id}/complete`, {}, key)).statusCode).toBe(
      500,
    );
    expect(await state(server)).toEqual(created.state);
    fail = false;
    expect(
      (await successful(server, 'POST', `/api/tasks/${id}/complete`, {}, key)).state.player.ammo,
    ).toBe(6);
  });
  it('enforces once-only rewards across independent database connections', async () => {
    const dbPath = temporaryDatabase();
    const first = app({ dbPath });
    const second = app({ dbPath });
    const created = await successful(first, 'POST', '/api/tasks', {
      title: 'Two connections',
      difficulty: 'hard',
    });
    const id = created.state.tasks[0]?.id;
    const responses = await Promise.all(
      [first, second].map((server) => mutate(server, 'POST', `/api/tasks/${id}/complete`)),
    );
    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    expect((await state(second)).player).toMatchObject({ ammo: 12, xp: 200 });
    expect((await state(first)).rewards).toHaveLength(1);
  });
});

describe('durable mission reservation and settlement', () => {
  it('enforces unlock, one active attempt, and available balance', async () => {
    const server = app();
    expect(
      (await mutate(server, 'POST', '/api/missions/start', { ammo: 0, missionId: 'first-shift' }))
        .statusCode,
    ).toBe(409);
    await successful(server, 'PATCH', '/api/tutorial', { skipped: true });
    expect(
      (await mutate(server, 'POST', '/api/missions/start', { ammo: 1, missionId: 'first-shift' }))
        .statusCode,
    ).toBe(409);
    await start(server, 0);
    expect(
      (await mutate(server, 'POST', '/api/missions/start', { ammo: 0, missionId: 'first-shift' }))
        .statusCode,
    ).toBe(409);
    expect((await mutate(server, 'POST', '/api/game/reset')).statusCode).toBe(409);
  });
  it('serializes reservation races across two real connections', async () => {
    const dbPath = temporaryDatabase();
    const first = app({ dbPath });
    const second = app({ dbPath });
    await earn(first);
    await successful(first, 'PATCH', '/api/tutorial', { skipped: true });
    const responses = await Promise.all(
      [first, second].map((server) =>
        mutate(server, 'POST', '/api/missions/start', { ammo: 6, missionId: 'first-shift' }),
      ),
    );
    expect(responses.map((response) => response.statusCode).sort()).toEqual([200, 409]);
    expect((await state(second)).player.ammo).toBe(0);
  });
  it('rejects overspending, records death without changing tasks, and refunds exactly once', async () => {
    const server = app();
    await earn(server);
    const tasksBefore = (await state(server)).tasks;
    const attempt = await start(server, 4);
    const key = randomUUID();
    const shot = await successful(
      server,
      'POST',
      `/api/missions/${attempt.id}/shots`,
      { count: 1 },
      key,
    );
    expect(
      await successful(server, 'POST', `/api/missions/${attempt.id}/shots`, { count: 1 }, key),
    ).toEqual(shot);
    const finishKey = randomUUID();
    const input = { outcome: 'dead', stats: stats(1) };
    const finished = await successful(
      server,
      'POST',
      `/api/missions/${attempt.id}/finish`,
      input,
      finishKey,
    );
    expect(finished.state.player).toMatchObject({
      ammo: 5,
      xp: 100,
      deaths: 1,
      consecutiveDeaths: 1,
    });
    expect(finished.state.tasks).toEqual(tasksBefore);
    expect(finished.state.attempt).toBeNull();
    expect(
      await successful(server, 'POST', `/api/missions/${attempt.id}/finish`, input, finishKey),
    ).toEqual(finished);
    expect(
      (await mutate(server, 'POST', `/api/missions/${attempt.id}/finish`, input)).statusCode,
    ).toBe(409);
    const next = await start(server, 2);
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        mutate(server, 'POST', `/api/missions/${next.id}/shots`, { count: 1 }),
      ),
    );
    expect(responses.filter((response) => response.statusCode === 200)).toHaveLength(2);
    expect(responses.filter((response) => response.statusCode === 409)).toHaveLength(3);
    expect((await state(server)).attempt).toMatchObject({ spent: 2, remaining: 0 });
    expect(
      (
        await mutate(server, 'POST', `/api/missions/${next.id}/finish`, {
          outcome: 'dead',
          stats: stats(1),
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await mutate(server, 'POST', `/api/missions/${next.id}/finish`, {
          outcome: 'cleared',
          stats: stats(2, { kills: 5 }),
        })
      ).statusCode,
    ).toBe(409);
    const settled = await successful(server, 'POST', `/api/missions/${next.id}/finish`, {
      outcome: 'abandoned',
      stats: stats(2),
    });
    expect(settled.state.player.ammo).toBe(3);
  });
  it('supports melee-only victory without awarding combat resources', async () => {
    const server = app();
    const attempt = await start(server, 0);
    expect(
      (await mutate(server, 'POST', `/api/missions/${attempt.id}/shots`, { count: 1 })).statusCode,
    ).toBe(409);
    const result = await successful(server, 'POST', `/api/missions/${attempt.id}/finish`, {
      outcome: 'cleared',
      stats: stats(0, { kills: 6, meleeKills: 6, durationMs: 12000 }),
    });
    expect(result.state.progress).toMatchObject({ completions: 1, bestTimeMs: 12000 });
    expect(result.state.player).toMatchObject({ ammo: 0, xp: 0 });
  });
  it('persists tasks, spent rounds, active reservation, settings, and replay results across restart', async () => {
    const dbPath = temporaryDatabase();
    const first = app({ dbPath });
    await earn(first);
    const attempt = await start(first, 6);
    const key = randomUUID();
    const committed = await successful(
      first,
      'POST',
      `/api/missions/${attempt.id}/shots`,
      { count: 1 },
      key,
    );
    await successful(first, 'PATCH', '/api/settings', { muted: true, musicVolume: 0.25 });
    await first.close();
    const restarted = app({ dbPath });
    const loaded = await state(restarted);
    expect(loaded.attempt).toMatchObject({ id: attempt.id, reserved: 6, spent: 1, remaining: 5 });
    expect(loaded.player.ammo).toBe(0);
    expect(loaded.tasks[0]?.status).toBe('completed');
    expect(loaded.settings).toMatchObject({ muted: true, musicVolume: 0.25 });
    expect(loaded.tutorial).toEqual({ step: 'complete', completed: true, skipped: true });
    expect(
      await successful(restarted, 'POST', `/api/missions/${attempt.id}/shots`, { count: 1 }, key),
    ).toEqual(committed);
    const settled = await successful(restarted, 'POST', `/api/missions/${attempt.id}/finish`, {
      outcome: 'abandoned',
      stats: stats(1),
    });
    expect(settled.state.player.ammo).toBe(5);
    expect((await state(restarted)).player.ammo).toBe(5);
  });
});

describe('tutorial, dialogue, and gameplay reset', () => {
  it('persists acknowledgements, enforces eligibility, and applies contextual cooldown', async () => {
    let clock = new Date('2026-11-11T12:00:00.000Z');
    const dbPath = temporaryDatabase();
    const server = app({ dbPath, now: () => clock });
    const next = async () =>
      (await server.inject({ method: 'GET', url: '/api/dialogue/next' })).json<{
        next: string | null;
      }>().next;
    expect(await next()).toBe('first-call');
    expect(
      (await mutate(server, 'POST', '/api/dialogue/first-victory/acknowledge')).statusCode,
    ).toBe(409);
    await successful(server, 'POST', '/api/dialogue/first-call/acknowledge', { ignored: false });
    expect(await next()).toBeNull();
    const attempt = await start(server, 0);
    await successful(server, 'POST', `/api/missions/${attempt.id}/finish`, {
      outcome: 'dead',
      stats: stats(),
    });
    expect(await next()).toBe('first-death');
    await successful(server, 'POST', '/api/dialogue/first-death/acknowledge', { ignored: true });
    expect(await next()).toBeNull();
    clock = new Date(clock.getTime() + 61000);
    expect(await next()).toBe('no-kills');
    expect(
      (await state(server)).dialogueHistory.find((item) => item.id === 'first-death')?.ignored,
    ).toBe(true);
    await successful(server, 'POST', '/api/dialogue/no-kills/acknowledge');
    await server.close();
    const restarted = app({ dbPath, now: () => clock });
    expect((await state(restarted)).dialogueHistory).toHaveLength(3);
    expect(
      (await restarted.inject({ method: 'GET', url: '/api/dialogue/next' })).json<{
        next: string | null;
      }>().next,
    ).toBeNull();
  });
  it('gameplay reset preserves real tasks, resources, receipts, and settings', async () => {
    const server = app();
    await earn(server, 'hard');
    await successful(server, 'PATCH', '/api/settings', { reducedMotion: true });
    await successful(server, 'PATCH', '/api/tutorial', { skipped: true });
    const before = await state(server);
    const reset = await successful(server, 'POST', '/api/game/reset');
    expect(reset.state.tasks).toEqual(before.tasks);
    expect(reset.state.rewards).toEqual(before.rewards);
    expect(reset.state.player.ammo).toBe(12);
    expect(reset.state.player.xp).toBe(200);
    expect(reset.state.settings).toEqual(before.settings);
    expect(reset.state.tutorial).toEqual({ step: 'wake', completed: false, skipped: false });
    expect(reset.state.progress.unlocked).toBe(false);
  });
});

describe('explicit confirmed profile reset', () => {
  it('rejects missing, incorrect, extra, or unkeyed confirmation without changing the profile', async () => {
    const server = app({ dbPath: temporaryDatabase() });
    await earn(server, 'hard');
    const before = await state(server);
    for (const payload of [
      {},
      { confirmation: 'DELETE' },
      { confirmation: 'удалить' },
      { confirmation: 'УДАЛИТЬ', extra: true },
    ]) {
      expect((await mutate(server, 'POST', '/api/profile/reset', payload)).statusCode).toBe(400);
      expect(await state(server)).toEqual(before);
    }
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/profile/reset',
          payload: { confirmation: 'УДАЛИТЬ' },
        })
      ).statusCode,
    ).toBe(400);
    expect(await state(server)).toEqual(before);
    const normalReplay = await successful(server, 'POST', '/api/game/reset');
    expect(normalReplay.state.tasks).toEqual(before.tasks);
    expect(normalReplay.state.rewards).toEqual(before.rewards);
    expect(normalReplay.state.player).toEqual(before.player);
  });

  it('refuses a clean reset while a durable mission reservation is active', async () => {
    const server = app({ dbPath: temporaryDatabase() });
    await earn(server);
    await start(server, 4);
    const before = await state(server);
    const response = await mutate(server, 'POST', '/api/profile/reset', {
      confirmation: 'УДАЛИТЬ',
    });
    expect(response.statusCode).toBe(409);
    expect(response.json<{ error: { code: string } }>().error.code).toBe('ACTIVE_ATTEMPT');
    expect(await state(server)).toEqual(before);
  });

  it('clears the confirmed profile transactionally while retaining settings and retry history', async () => {
    const dbPath = temporaryDatabase();
    const server = app({ dbPath });
    await earn(server, 'hard');
    await successful(server, 'POST', '/api/tasks', { title: 'An unfinished isolated fixture' });
    const attempt = await start(server, 3);
    await successful(server, 'POST', `/api/missions/${attempt.id}/shots`, { count: 1 });
    await successful(server, 'POST', `/api/missions/${attempt.id}/finish`, {
      outcome: 'dead',
      stats: stats(1),
    });
    await successful(server, 'POST', '/api/dialogue/first-death/acknowledge', { ignored: true });
    await successful(server, 'PATCH', '/api/settings', {
      muted: true,
      musicVolume: 0.25,
      reducedMotion: true,
    });
    const before = await state(server);
    const result = await successful(server, 'POST', '/api/profile/reset', {
      confirmation: 'УДАЛИТЬ',
    });
    expect(result.state).toEqual({
      revision: before.revision + 1,
      tasks: [],
      rewards: [],
      player: { ammo: 0, xp: 0, deaths: 0, consecutiveDeaths: 0 },
      attempt: null,
      progress: { missionId: 'first-shift', unlocked: false, completions: 0, bestTimeMs: null },
      tutorial: { step: 'wake', completed: false, skipped: false },
      dialogueHistory: [],
      settings: before.settings,
    });
    const database = openDatabase(dbPath);
    try {
      for (const table of [
        'tasks',
        'reward_claims',
        'resource_ledger',
        'mission_attempts',
        'dialogue_history',
      ]) {
        expect(database.sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()).toEqual({
          count: 0,
        });
      }
      const operations = database.sqlite
        .prepare('SELECT COUNT(*) AS count FROM idempotency_operations')
        .get() as { count: number };
      expect(operations.count).toBeGreaterThan(0);
    } finally {
      database.sqlite.close();
    }
    await server.close();
    const restarted = app({ dbPath });
    expect(await state(restarted)).toEqual(result.state);
  });

  it('does not purge newly created tasks or restore old resources when old request keys replay after restart', async () => {
    const dbPath = temporaryDatabase();
    const server = app({ dbPath });
    const oldCreateKey = randomUUID();
    const oldCreated = await successful(
      server,
      'POST',
      '/api/tasks',
      { title: 'Before clean reset' },
      oldCreateKey,
    );
    const oldId = oldCreated.state.tasks[0]?.id;
    const oldCompleteKey = randomUUID();
    await successful(server, 'POST', `/api/tasks/${oldId}/complete`, {}, oldCompleteKey);
    const resetKey = randomUUID();
    const reset = await successful(
      server,
      'POST',
      '/api/profile/reset',
      { confirmation: 'УДАЛИТЬ' },
      resetKey,
    );
    const newCreated = await successful(server, 'POST', '/api/tasks', {
      title: 'Keep after clean reset',
    });
    expect(newCreated.state.revision).toBeGreaterThan(reset.state.revision);
    await server.close();
    const restarted = app({ dbPath });
    expect(
      await successful(
        restarted,
        'POST',
        '/api/profile/reset',
        { confirmation: 'УДАЛИТЬ' },
        resetKey,
      ),
    ).toEqual(reset);
    expect(
      await successful(
        restarted,
        'POST',
        '/api/tasks',
        { title: 'Before clean reset' },
        oldCreateKey,
      ),
    ).toEqual(oldCreated);
    await successful(restarted, 'POST', `/api/tasks/${oldId}/complete`, {}, oldCompleteKey);
    expect(await state(restarted)).toEqual(newCreated.state);
    expect((await state(restarted)).player).toMatchObject({ ammo: 0, xp: 0 });
  });

  it('rolls a failed clean reset back completely and permits safe retry with the same key', async () => {
    let fail = false;
    const server = app({
      dbPath: temporaryDatabase(),
      failpoint: (point) => {
        if (fail && point === 'mutation-before-commit') throw new Error('Reset commit failure');
      },
    });
    await earn(server);
    const before = await state(server);
    const key = randomUUID();
    fail = true;
    expect(
      (await mutate(server, 'POST', '/api/profile/reset', { confirmation: 'УДАЛИТЬ' }, key))
        .statusCode,
    ).toBe(500);
    expect(await state(server)).toEqual(before);
    fail = false;
    const result = await successful(
      server,
      'POST',
      '/api/profile/reset',
      { confirmation: 'УДАЛИТЬ' },
      key,
    );
    expect(result.state.tasks).toHaveLength(0);
    expect(result.state.rewards).toHaveLength(0);
    expect(result.state.player.ammo).toBe(0);
    expect(result.state.revision).toBe(before.revision + 1);
  });
});
