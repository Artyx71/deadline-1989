import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { MissionStats, Settings, TutorialStep } from '@deadline/shared';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(), title: text('title').notNull(),
  description: text('description').notNull(), difficulty: text('difficulty', { enum: ['easy', 'normal', 'hard'] }).notNull(),
  status: text('status', { enum: ['active', 'completed'] }).notNull(), dueAt: text('due_at'),
  createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(), completedAt: text('completed_at'),
});
export const rewards = sqliteTable('reward_claims', {
  id: text('id').primaryKey(), taskId: text('task_id').notNull().unique(), title: text('title').notNull(),
  ammo: integer('ammo').notNull(), xp: integer('xp').notNull(), createdAt: text('created_at').notNull(),
});
export const player = sqliteTable('player_state', {
  id: integer('id').primaryKey(), ammo: integer('ammo').notNull(), xp: integer('xp').notNull(),
  deaths: integer('deaths').notNull(), consecutiveDeaths: integer('consecutive_deaths').notNull(),
});
export const meta = sqliteTable('state_meta', { id: integer('id').primaryKey(), revision: integer('revision').notNull() });
export const attempts = sqliteTable('mission_attempts', {
  id: text('id').primaryKey(), missionId: text('mission_id').notNull(),
  status: text('status', { enum: ['active', 'dead', 'cleared', 'abandoned'] }).notNull(),
  reserved: integer('reserved').notNull(), spent: integer('spent').notNull(),
  startedAt: text('started_at').notNull(), finishedAt: text('finished_at'),
  stats: text('stats', { mode: 'json' }).$type<MissionStats | null>(),
});
export const progress = sqliteTable('mission_progress', {
  missionId: text('mission_id').primaryKey(), unlocked: integer('unlocked', { mode: 'boolean' }).notNull(),
  completions: integer('completions').notNull(), bestTimeMs: integer('best_time_ms'),
});
export const tutorial = sqliteTable('tutorial_progress', {
  id: integer('id').primaryKey(), step: text('step').$type<TutorialStep>().notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull(), skipped: integer('skipped', { mode: 'boolean' }).notNull(),
});
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(), value: text('value', { mode: 'json' }).$type<Settings>().notNull(),
});
export const dialogue = sqliteTable('dialogue_history', {
  id: text('id').primaryKey(), acknowledgedAt: text('acknowledged_at').notNull(),
  ignored: integer('ignored', { mode: 'boolean' }).notNull(),
});
export const operations = sqliteTable('idempotency_operations', {
  key: text('key').primaryKey(), fingerprint: text('fingerprint').notNull(),
  response: text('response').notNull(), createdAt: text('created_at').notNull(),
});
export const ledger = sqliteTable('resource_ledger', {
  id: text('id').primaryKey(), kind: text('kind').notNull(), referenceId: text('reference_id').notNull(),
  ammo: integer('ammo').notNull(), xp: integer('xp').notNull(), createdAt: text('created_at').notNull(),
});
