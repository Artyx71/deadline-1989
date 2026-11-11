import { beforeAll, describe, expect, it } from 'vitest';
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import { createService } from '@deadline/domain';
import type { MutationResult, StateSnapshot } from '@deadline/shared';
import { openSqlStore } from './sqlStore';
import { executeProfile } from './engine';
import type { ProfileRequest, ProfileStorage } from './protocol';

let SQL: SqlJsStatic;
beforeAll(async () => { SQL = await initSqlJs(); });

function storageFixture() {
  let saved: Uint8Array | undefined;
  let rejectWrites = false;
  const storage: ProfileStorage = {
    load: async () => saved?.slice(),
    save: async bytes => { if (rejectWrites) throw new Error('Disk full'); saved = bytes.slice(); },
  };
  const request = (path: string, method: ProfileRequest['method'] = 'GET', body?: unknown, key: string = crypto.randomUUID()) => executeProfile(SQL, storage, { id: crypto.randomUUID(), path, method, body, key });
  return { storage, request, rejectWrites: (value: boolean) => { rejectWrites = value; } };
}

describe('real SQL.js domain adapter and persisted SQLite bytes', () => {
  it('runs shared migrations, CRUD and once-only completion across fresh DB instances', async () => {
    const { request } = storageFixture();
    const created = (await request('/tasks', 'POST', { title: 'Закончить отчёт', difficulty: 'hard' })).body as MutationResult;
    const id = created.state.tasks[0]!.id;
    const key = crypto.randomUUID();
    const complete = (await request(`/tasks/${id}/complete`, 'POST', {}, key)).body as MutationResult;
    expect(complete.state.player).toMatchObject({ ammo: 12, xp: 200 });
    expect((await request(`/tasks/${id}/complete`, 'POST', {}, key)).body).toEqual(complete);
    await request(`/tasks/${id}/reopen`, 'POST');
    await request(`/tasks/${id}/complete`, 'POST');
    const reloaded = (await request('/state')).body as StateSnapshot;
    expect(reloaded.rewards).toHaveLength(1);
    expect(reloaded.player.ammo).toBe(12);
    await request(`/tasks/${id}`, 'PATCH', { title: 'Готовый отчёт' });
    await request(`/tasks/${id}`, 'DELETE');
    expect(((await request('/state')).body as StateSnapshot).rewards).toHaveLength(1);
    expect(((await request('/tasks')).body as unknown[])).toHaveLength(0);
  });

  it('uses SQLite RETURNING debits, persists spent rounds and refunds only unused rounds', async () => {
    const { request } = storageFixture();
    const created = (await request('/tasks', 'POST', { title: 'Учебная тестовая задача', difficulty: 'hard' })).body as MutationResult;
    const id = created.state.tasks[0]!.id;
    await request(`/tasks/${id}/complete`, 'POST');
    await request('/tutorial', 'PATCH', { skipped: true, completed: true });
    const started = (await request('/missions/start', 'POST', { missionId: 'first-shift', ammo: 6 })).body as MutationResult;
    const attemptId = started.state.attempt!.id;
    const shotKey = crypto.randomUUID();
    await request(`/missions/${attemptId}/shots`, 'POST', { count: 1 }, shotKey);
    await request(`/missions/${attemptId}/shots`, 'POST', { count: 1 }, shotKey);
    const reload = (await request('/state')).body as StateSnapshot;
    expect(reload.attempt).toMatchObject({ spent: 1, remaining: 5 });
    await request(`/missions/${attemptId}/finish`, 'POST', { outcome: 'dead', stats: { kills: 0, shotsFired: 1, hits: 0, meleeKills: 0, durationMs: 1000, emptyMagazine: false } });
    const final = (await request('/state')).body as StateSnapshot;
    expect(final.player).toMatchObject({ ammo: 11, xp: 200, deaths: 1 });
    expect(final.tasks[0]?.status).toBe('completed');
  });

  it('does not acknowledge a mutation whose SQLite byte persistence fails', async () => {
    const fixture = storageFixture();
    await fixture.request('/state');
    const key = crypto.randomUUID();
    fixture.rejectWrites(true);
    await expect(fixture.request('/tasks', 'POST', { title: 'Не потерять данные' }, key)).rejects.toThrow('Не удалось сохранить');
    expect(((await fixture.request('/state')).body as StateSnapshot).tasks).toHaveLength(0);
    fixture.rejectWrites(false);
    await fixture.request('/tasks', 'POST', { title: 'Не потерять данные' }, key);
    await fixture.request('/tasks', 'POST', { title: 'Не потерять данные' }, key);
    expect(((await fixture.request('/state')).body as StateSnapshot).tasks).toHaveLength(1);
  });

  it('rolls back task completion, claim and balances together on a domain failure', async () => {
    const { raw, store } = await openSqlStore(SQL);
    try {
      const normal = createService(store);
      normal.mutate('create', 'POST /api/tasks', {}, () => normal.createTask({ title: 'Проверить откат', description: '', difficulty: 'normal', dueAt: null }));
      const id = normal.snapshot().tasks[0]!.id;
      const failing = createService(store, { failpoint: point => { if (point === 'completion-after-claim') throw new Error('Injected rollback'); } });
      expect(() => failing.mutate('complete', 'POST /api/complete', {}, () => failing.completeTask(id))).toThrow('Injected rollback');
      expect(normal.snapshot()).toMatchObject({ player: { ammo: 0, xp: 0 }, rewards: [], tasks: [{ status: 'active' }] });
    } finally { raw.close(); }
  });

  it('keeps a completion uncommitted on storage failure and rewards once after retry', async () => {
    const fixture = storageFixture();
    const created = (await fixture.request('/tasks', 'POST', { title: 'Атомарное сохранение', difficulty: 'normal' })).body as MutationResult;
    const id = created.state.tasks[0]!.id;
    const key = crypto.randomUUID();
    fixture.rejectWrites(true);
    await expect(fixture.request(`/tasks/${id}/complete`, 'POST', {}, key)).rejects.toThrow('Не удалось сохранить');
    expect((await fixture.request('/state')).body).toMatchObject({ tasks: [{ status: 'active' }], rewards: [], player: { ammo: 0, xp: 0 } });
    fixture.rejectWrites(false);
    await fixture.request(`/tasks/${id}/complete`, 'POST', {}, key);
    await fixture.request(`/tasks/${id}/complete`, 'POST', {}, key);
    const durable = (await fixture.request('/state')).body as StateSnapshot;
    expect(durable.rewards).toHaveLength(1);
    expect(durable.player).toMatchObject({ ammo: 6, xp: 100 });
  });

  it('rejects invalid requests and conflicting request keys without changing tasks', async () => {
    const { request } = storageFixture();
    await request('/tasks', 'POST', { title: 'Оригинал' }, 'same-key');
    await expect(request('/tasks', 'POST', { title: 'Другая задача' }, 'same-key')).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    await expect(request('/tasks', 'POST', { title: 'Подмена', ammo: 999 })).rejects.toThrow();
    expect(((await request('/state')).body as StateSnapshot).tasks).toHaveLength(1);
  });

  it('requires reset confirmation and retains settings after a clean profile reset', async () => {
    const { request } = storageFixture();
    await request('/tasks', 'POST', { title: 'Удаление только с согласием' });
    await request('/settings', 'PATCH', { muted: true });
    await expect(request('/profile/reset', 'POST', {})).rejects.toThrow();
    expect(((await request('/state')).body as StateSnapshot).tasks).toHaveLength(1);
    await request('/profile/reset', 'POST', { confirmation: 'УДАЛИТЬ' });
    expect((await request('/state')).body).toMatchObject({ tasks: [], rewards: [], settings: { muted: true }, player: { ammo: 0, xp: 0 } });
  });
});
