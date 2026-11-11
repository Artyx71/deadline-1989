import { createHash, randomUUID } from 'node:crypto';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { MissionStats, MutationResult, RewardClaim, Settings, StateSnapshot, TaskInput, TutorialProgress } from '@deadline/shared';
import type { Store } from './database.js';
import * as s from './schema.js';
import { conflict, missing } from './errors.js';

export interface ServiceOptions {
  now?: () => Date;
  failpoint?: (point: 'completion-after-claim' | 'mutation-before-commit') => void;
}
const rewardDefinitions = { easy: { ammo: 3, xp: 50 }, normal: { ammo: 6, xp: 100 }, hard: { ammo: 12, xp: 200 } } as const;
export const dialogueIds = ['first-call', 'second-call', 'first-death', 'death-streak', 'no-kills', 'empty-magazine', 'near-victory', 'silent-victory', 'productive', 'first-victory'] as const;
export type DialogueId = typeof dialogueIds[number];

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Required singleton state is missing');
  return value;
}

export function createService(store: Store, options: ServiceOptions = {}) {
  const { db, sqlite } = store;
  const now = () => (options.now?.() ?? new Date()).toISOString();
  function readSnapshot(): StateSnapshot {
    const claims = db.select().from(s.rewards).orderBy(desc(s.rewards.createdAt)).all();
    const rewarded = new Set(claims.map(claim => claim.taskId));
    const { id: _playerId, ...player } = required(db.select().from(s.player).get());
    const { id: _tutorialId, ...tutorial } = required(db.select().from(s.tutorial).get());
    const attempt = db.select().from(s.attempts).where(eq(s.attempts.status, 'active')).get();
    return {
      revision: required(db.select().from(s.meta).get()).revision,
      tasks: db.select().from(s.tasks).orderBy(desc(s.tasks.createdAt), s.tasks.id).all().map(task => ({ ...task, rewarded: rewarded.has(task.id) })),
      rewards: claims,
      player,
      tutorial,
      attempt: attempt ? { ...attempt, remaining: attempt.reserved - attempt.spent } : null,
      progress: required(db.select().from(s.progress).where(eq(s.progress.missionId, 'first-shift')).get()),
      dialogueHistory: db.select().from(s.dialogue).orderBy(desc(s.dialogue.acknowledgedAt)).all(),
      settings: required(db.select().from(s.settings).get()).value,
    };
  }
  const snapshot = () => sqlite.transaction(readSnapshot).deferred();
  function mutate(key: string, scope: string, input: unknown, operation: () => RewardClaim | void): MutationResult {
    const fingerprint = createHash('sha256').update(canonical({ scope, input })).digest('hex');
    return sqlite.transaction(() => {
      const previous = db.select().from(s.operations).where(eq(s.operations.key, key)).get();
      if (previous) {
        if (previous.fingerprint !== fingerprint) conflict('IDEMPOTENCY_CONFLICT', 'This request key was already used for a different operation.');
        return JSON.parse(previous.response) as MutationResult;
      }
      const reward = operation();
      db.update(s.meta).set({ revision: sql`${s.meta.revision} + 1` }).where(eq(s.meta.id, 1)).run();
      const result: MutationResult = { state: readSnapshot(), ...(reward ? { reward } : {}) };
      db.insert(s.operations).values({ key, fingerprint, response: JSON.stringify(result), createdAt: now() }).run();
      options.failpoint?.('mutation-before-commit');
      return result;
    }).immediate();
  }
  function task(id: string) { return db.select().from(s.tasks).where(eq(s.tasks.id, id)).get() ?? missing('Task'); }
  function activeAttempt(id: string) {
    const attempt = db.select().from(s.attempts).where(eq(s.attempts.id, id)).get() ?? missing('Mission attempt');
    if (attempt.status !== 'active') conflict('ATTEMPT_FINISHED', 'This mission attempt is already settled.');
    return attempt;
  }
  function recordResource(kind: string, referenceId: string, ammo: number, xp = 0) {
    db.insert(s.ledger).values({ id: randomUUID(), kind, referenceId, ammo, xp, createdAt: now() }).run();
  }
  function createTask(input: TaskInput) {
    const timestamp = now();
    db.insert(s.tasks).values({ ...input, id: randomUUID(), status: 'active', createdAt: timestamp, updatedAt: timestamp, completedAt: null }).run();
  }
  function patchTask(id: string, input: Partial<TaskInput>) {
    task(id);
    db.update(s.tasks).set({ ...input, updatedAt: now() }).where(eq(s.tasks.id, id)).run();
  }
  function completeTask(id: string): RewardClaim | undefined {
    const current = task(id);
    const timestamp = now();
    db.update(s.tasks).set({ status: 'completed', completedAt: current.completedAt ?? timestamp, updatedAt: timestamp }).where(eq(s.tasks.id, id)).run();
    if (db.select().from(s.rewards).where(eq(s.rewards.taskId, id)).get()) return;
    const amount = rewardDefinitions[current.difficulty];
    const reward: RewardClaim = { id: randomUUID(), taskId: id, title: current.title, ...amount, createdAt: timestamp };
    db.insert(s.rewards).values(reward).run();
    options.failpoint?.('completion-after-claim');
    db.update(s.player).set({ ammo: sql`${s.player.ammo} + ${amount.ammo}`, xp: sql`${s.player.xp} + ${amount.xp}` }).where(eq(s.player.id, 1)).run();
    recordResource('task-reward', id, amount.ammo, amount.xp);
    return reward;
  }
  function reopenTask(id: string) {
    task(id);
    db.update(s.tasks).set({ status: 'active', completedAt: null, updatedAt: now() }).where(eq(s.tasks.id, id)).run();
  }
  function deleteTask(id: string) { task(id); db.delete(s.tasks).where(eq(s.tasks.id, id)).run(); }
  function startMission(input: { ammo: number; missionId: string }) {
    if (!required(db.select().from(s.progress).where(eq(s.progress.missionId, input.missionId)).get()).unlocked) conflict('MISSION_LOCKED', 'Finish or skip FIRST CALL before starting this mission.');
    if (db.select().from(s.attempts).where(eq(s.attempts.status, 'active')).get()) conflict('ACTIVE_ATTEMPT', 'Settle the active mission before starting another.');
    const debit = db.update(s.player).set({ ammo: sql`${s.player.ammo} - ${input.ammo}` }).where(and(eq(s.player.id, 1), gte(s.player.ammo, input.ammo))).run();
    if (debit.changes !== 1) conflict('INSUFFICIENT_AMMO', 'Not enough ammunition for this loadout.');
    const id = randomUUID();
    db.insert(s.attempts).values({ id, missionId: input.missionId, status: 'active', reserved: input.ammo, spent: 0, startedAt: now(), finishedAt: null, stats: null }).run();
    recordResource('mission-reserve', id, -input.ammo);
  }
  function shoot(id: string) {
    activeAttempt(id);
    const debit = db.update(s.attempts).set({ spent: sql`${s.attempts.spent} + 1` }).where(and(eq(s.attempts.id, id), eq(s.attempts.status, 'active'), sql`${s.attempts.spent} < ${s.attempts.reserved}`)).run();
    if (debit.changes !== 1) conflict('NO_AMMO', 'No reserved ammunition remains.');
    recordResource('mission-shot', id, 0);
  }
  function finishMission(id: string, input: { outcome: 'dead' | 'cleared' | 'abandoned'; stats: MissionStats }) {
    const attempt = activeAttempt(id);
    const { stats, outcome } = input;
    if (stats.shotsFired !== attempt.spent || stats.meleeKills > stats.kills || stats.hits > stats.shotsFired || stats.kills > stats.hits + stats.meleeKills || (outcome === 'cleared' && stats.kills !== 6)) {
      conflict('INVALID_MISSION_STATS', 'Mission statistics do not match this attempt.');
    }
    const unused = attempt.reserved - attempt.spent;
    db.update(s.attempts).set({ status: outcome, stats, finishedAt: now() }).where(eq(s.attempts.id, id)).run();
    db.update(s.player).set({ ammo: sql`${s.player.ammo} + ${unused}`,
      ...(outcome === 'dead' ? { deaths: sql`${s.player.deaths} + 1`, consecutiveDeaths: sql`${s.player.consecutiveDeaths} + 1` } : {}),
      ...(outcome === 'cleared' ? { consecutiveDeaths: 0 } : {}),
    }).where(eq(s.player.id, 1)).run();
    recordResource('mission-refund', id, unused);
    if (outcome === 'cleared') {
      const current = required(db.select().from(s.progress).where(eq(s.progress.missionId, attempt.missionId)).get());
      db.update(s.progress).set({ completions: current.completions + 1, bestTimeMs: current.bestTimeMs === null ? stats.durationMs : Math.min(current.bestTimeMs, stats.durationMs) }).where(eq(s.progress.missionId, attempt.missionId)).run();
    }
  }
  function patchSettings(input: Partial<Settings>) {
    const current = required(db.select().from(s.settings).get());
    db.update(s.settings).set({ value: { ...current.value, ...input } }).where(eq(s.settings.id, 1)).run();
  }
  function patchTutorial(input: Partial<TutorialProgress>) {
    const current = required(db.select().from(s.tutorial).get());
    if ((current.completed && input.completed === false) || (current.skipped && input.skipped === false)) {
      conflict('TUTORIAL_RESET_REQUIRED', 'Use gameplay reset to replay FIRST CALL.');
    }
    const next = { step: input.step ?? current.step, completed: input.completed ?? current.completed, skipped: input.skipped ?? current.skipped };
    if (next.completed || next.skipped || next.step === 'complete') {
      next.step = 'complete'; next.completed = true;
      db.update(s.progress).set({ unlocked: true }).where(eq(s.progress.missionId, 'first-shift')).run();
    }
    db.update(s.tutorial).set(next).where(eq(s.tutorial.id, 1)).run();
  }
  function resetGame() {
    if (db.select().from(s.attempts).where(eq(s.attempts.status, 'active')).get()) conflict('ACTIVE_ATTEMPT', 'Settle the active mission before resetting gameplay.');
    db.update(s.tutorial).set({ step: 'wake', completed: false, skipped: false }).where(eq(s.tutorial.id, 1)).run();
    db.update(s.progress).set({ unlocked: false, completions: 0, bestTimeMs: null }).where(eq(s.progress.missionId, 'first-shift')).run();
    db.update(s.player).set({ deaths: 0, consecutiveDeaths: 0 }).where(eq(s.player.id, 1)).run();
    db.delete(s.dialogue).run();
  }
  function nextDialogue(): { next: DialogueId | null; history: StateSnapshot['dialogueHistory'] } {
    const state = readSnapshot();
    const history = state.dialogueHistory;
    const seen = new Set(history.map(entry => entry.id));
    if (!state.tutorial.completed && !state.tutorial.skipped) {
      if (['wake', 'movement', 'first-call'].includes(state.tutorial.step) && !seen.has('first-call')) return { next: 'first-call', history };
      if (state.tutorial.step === 'second-call' && !seen.has('second-call')) return { next: 'second-call', history };
    }
    const last = db.select().from(s.attempts).where(sql`${s.attempts.status} IN ('dead', 'cleared')`).orderBy(desc(s.attempts.finishedAt), desc(s.attempts.startedAt)).get();
    const contextual = history.filter(entry => entry.id !== 'first-call' && entry.id !== 'second-call');
    const latestTime = contextual.reduce((latest, entry) => Math.max(latest, Date.parse(entry.acknowledgedAt)), 0);
    if (Date.parse(now()) - latestTime < 60000) return { next: null, history };
    const candidates: { id: DialogueId; eligible: boolean }[] = [
      { id: 'first-death', eligible: state.player.deaths > 0 },
      { id: 'death-streak', eligible: state.player.consecutiveDeaths >= 3 },
      { id: 'near-victory', eligible: state.player.deaths > 0 && last?.status === 'dead' && (last.stats?.kills ?? 0) >= 5 },
      { id: 'empty-magazine', eligible: state.player.deaths > 0 && last?.status === 'dead' && !!last.stats?.emptyMagazine },
      { id: 'no-kills', eligible: state.player.deaths > 0 && last?.status === 'dead' && last.stats?.kills === 0 },
      { id: 'silent-victory', eligible: state.progress.completions > 0 && last?.status === 'cleared' && last.stats?.shotsFired === 0 },
      { id: 'first-victory', eligible: state.progress.completions > 0 },
      { id: 'productive', eligible: state.rewards.length >= 3 },
    ];
    return { next: candidates.find(candidate => candidate.eligible && !seen.has(candidate.id))?.id ?? null, history };
  }
  function acknowledge(id: DialogueId, ignored: boolean) {
    const existing = db.select().from(s.dialogue).where(eq(s.dialogue.id, id)).get();
    if (existing) return;
    if (nextDialogue().next !== id) conflict('DIALOGUE_UNAVAILABLE', 'This call is not currently available.');
    db.insert(s.dialogue).values({ id, ignored, acknowledgedAt: now() }).run();
  }
  return { snapshot, mutate, createTask, patchTask, completeTask, reopenTask, deleteTask, startMission, shoot, finishMission, patchSettings, patchTutorial, resetGame,
    nextDialogue: () => sqlite.transaction(nextDialogue).deferred(), acknowledge };
}
