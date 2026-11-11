import { z } from 'zod';
import { settingsSchema, taskInputSchema, tutorialSteps } from '@deadline/shared';
import type { ApiErrorBody, Difficulty, MissionStats, MutationResult, Settings, StateSnapshot, TaskInput, TutorialProgress } from '@deadline/shared';

const taskSchema = taskInputSchema.extend({
  id: z.string(), status: z.enum(['active', 'completed']), createdAt: z.string(), updatedAt: z.string(),
  completedAt: z.string().nullable(), rewarded: z.boolean(),
});
const statsSchema = z.object({ kills: z.number(), shotsFired: z.number(), hits: z.number(), meleeKills: z.number(), durationMs: z.number(), emptyMagazine: z.boolean() });
const snapshotSchema = z.object({
  revision: z.number().int(), tasks: z.array(taskSchema),
  rewards: z.array(z.object({ id: z.string(), taskId: z.string(), title: z.string(), ammo: z.number(), xp: z.number(), createdAt: z.string() })),
  player: z.object({ ammo: z.number().nonnegative(), xp: z.number().nonnegative(), deaths: z.number(), consecutiveDeaths: z.number() }),
  attempt: z.object({ id: z.string(), missionId: z.string(), status: z.enum(['active', 'dead', 'cleared', 'abandoned']), reserved: z.number(), spent: z.number(), remaining: z.number(), startedAt: z.string(), finishedAt: z.string().nullable(), stats: statsSchema.nullable() }).nullable(),
  progress: z.object({ missionId: z.string(), unlocked: z.boolean(), completions: z.number(), bestTimeMs: z.number().nullable() }),
  tutorial: z.object({ step: z.enum(tutorialSteps), completed: z.boolean(), skipped: z.boolean() }),
  dialogueHistory: z.array(z.object({ id: z.string(), acknowledgedAt: z.string(), ignored: z.boolean() })), settings: settingsSchema,
});
export class ApiError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message); this.name = 'ApiError'; }
}
const pending = new Map<string, string>();
function operationKey(fingerprint: string): string {
  const storageKey = `deadline:pending:${fingerprint}`;
  let key = pending.get(fingerprint);
  try { key ??= sessionStorage.getItem(storageKey) ?? undefined; } catch { /* Memory fallback when browser storage is unavailable. */ }
  key ??= crypto.randomUUID();
  pending.set(fingerprint, key);
  try { sessionStorage.setItem(storageKey, key); } catch { /* Same operation still deduplicates within this session. */ }
  return key;
}
function clearOperation(fingerprint: string) {
  pending.delete(fingerprint);
  try { sessionStorage.removeItem(`deadline:pending:${fingerprint}`); } catch { /* Storage is optional; SQLite remains authoritative. */ }
}
async function request(path: string, method = 'GET', body?: unknown): Promise<unknown> {
  const fingerprint = `${method}:${path}:${JSON.stringify(body ?? {})}`;
  const key = method === 'GET' ? undefined : operationKey(fingerprint);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(8000),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const error = data as ApiErrorBody;
        throw new ApiError(error.error?.message ?? `Request failed (${response.status})`, response.status, error.error?.code ?? 'REQUEST_FAILED');
      }
      if (key) clearOperation(fingerprint);
      return data;
    } catch (error) {
      if (error instanceof ApiError && error.status < 500) { if (key) clearOperation(fingerprint); throw error; }
      if (attempt === 2) throw error instanceof ApiError ? error : new ApiError('Connection lost. Your request key is retained; reconnect and retry safely.', 0, 'NETWORK_ERROR');
      await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable request state');
}
async function mutation(path: string, method: string, body: unknown = {}): Promise<MutationResult> {
  const result = z.object({ state: snapshotSchema, reward: z.object({ id: z.string(), taskId: z.string(), title: z.string(), ammo: z.number(), xp: z.number(), createdAt: z.string() }).optional() }).parse(await request(path, method, body));
  return result;
}
export const api = {
  rules: async () => z.object({ rewards: z.object({
    easy: z.object({ ammo: z.number().nonnegative(), xp: z.number().nonnegative() }),
    normal: z.object({ ammo: z.number().nonnegative(), xp: z.number().nonnegative() }),
    hard: z.object({ ammo: z.number().nonnegative(), xp: z.number().nonnegative() }),
  }) }).parse(await request('/rules')),
  state: async (): Promise<StateSnapshot> => snapshotSchema.parse(await request('/state')),
  createTask: (input: TaskInput) => mutation('/tasks', 'POST', input),
  updateTask: (id: string, input: Partial<TaskInput>) => mutation(`/tasks/${id}`, 'PATCH', input),
  completeTask: (id: string) => mutation(`/tasks/${id}/complete`, 'POST'),
  reopenTask: (id: string) => mutation(`/tasks/${id}/reopen`, 'POST'),
  deleteTask: (id: string) => mutation(`/tasks/${id}`, 'DELETE'),
  settings: (patch: Partial<Settings>) => mutation('/settings', 'PATCH', patch),
  tutorial: (patch: Partial<TutorialProgress>) => mutation('/tutorial', 'PATCH', patch),
  resetGame: () => mutation('/game/reset', 'POST'),
  startMission: (ammo: number) => mutation('/missions/start', 'POST', { ammo, missionId: 'first-shift' }),
  shot: (id: string) => mutation(`/missions/${id}/shots`, 'POST', { count: 1 }),
  finishMission: (id: string, outcome: 'dead' | 'cleared' | 'abandoned', stats: MissionStats) => mutation(`/missions/${id}/finish`, 'POST', { outcome, stats }),
  nextDialogue: async () => z.object({ next: z.string().nullable(), history: z.array(z.object({ id: z.string(), acknowledgedAt: z.string(), ignored: z.boolean() })) }).parse(await request('/dialogue/next')),
  acknowledge: (id: string, ignored = false) => mutation(`/dialogue/${id}/acknowledge`, 'POST', { ignored }),
};
export type { Difficulty };
