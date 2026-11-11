import { z } from 'zod';
z.config(z.locales.ru());

export const difficultySchema = z.enum(['easy', 'normal', 'hard']);
export type Difficulty = z.infer<typeof difficultySchema>;
export const taskInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000).default(''),
  difficulty: difficultySchema.default('normal'),
  dueAt: z.string().datetime().nullable().default(null),
}).strict();
export const taskPatchSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().max(2000).optional(),
  difficulty: difficultySchema.optional(),
  dueAt: z.string().datetime().nullable().optional(),
}).strict();
export type TaskInput = z.infer<typeof taskInputSchema>;
export interface Task extends TaskInput {
  id: string;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  rewarded: boolean;
}
export interface RewardClaim {
  id: string;
  taskId: string;
  title: string;
  ammo: number;
  xp: number;
  createdAt: string;
}
export const settingsSchema = z.object({
  masterVolume: z.number().min(0).max(1),
  musicVolume: z.number().min(0).max(1),
  sfxVolume: z.number().min(0).max(1),
  muted: z.boolean(),
  streamerMode: z.boolean(),
  reducedMotion: z.boolean(),
  crt: z.boolean(),
}).strict();
export type Settings = z.infer<typeof settingsSchema>;
export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.65, musicVolume: 0.55, sfxVolume: 0.7,
  muted: false, streamerMode: true, reducedMotion: false, crt: true,
};
export interface MissionStats {
  kills: number;
  shotsFired: number;
  hits: number;
  meleeKills: number;
  durationMs: number;
  emptyMagazine: boolean;
}
export const missionStatsSchema = z.object({
  kills: z.number().int().min(0).max(6),
  shotsFired: z.number().int().min(0).max(10000),
  hits: z.number().int().min(0).max(10000),
  meleeKills: z.number().int().min(0).max(6),
  durationMs: z.number().int().min(0).max(86400000),
  emptyMagazine: z.boolean(),
}).strict();
export interface MissionAttempt {
  id: string;
  missionId: string;
  status: 'active' | 'dead' | 'cleared' | 'abandoned';
  reserved: number;
  spent: number;
  remaining: number;
  startedAt: string;
  finishedAt: string | null;
  stats: MissionStats | null;
}
export const tutorialSteps = [
  'wake', 'movement', 'first-call', 'computer', 'create-task', 'rewards',
  'training', 'aim', 'shoot', 'reload', 'melee', 'second-call', 'complete',
] as const;
export type TutorialStep = typeof tutorialSteps[number];
export interface TutorialProgress { step: TutorialStep; completed: boolean; skipped: boolean }
export interface DialogueHistory { id: string; acknowledgedAt: string; ignored: boolean }
export interface PlayerState { ammo: number; xp: number; deaths: number; consecutiveDeaths: number }
export interface MissionProgress { missionId: string; unlocked: boolean; completions: number; bestTimeMs: number | null }
export interface StateSnapshot {
  revision: number;
  tasks: Task[];
  rewards: RewardClaim[];
  player: PlayerState;
  attempt: MissionAttempt | null;
  progress: MissionProgress;
  tutorial: TutorialProgress;
  dialogueHistory: DialogueHistory[];
  settings: Settings;
}
export interface MutationResult { state: StateSnapshot; reward?: RewardClaim }
export interface ApiErrorBody { error: { code: string; message: string; requestId?: string } }
export type SceneId = 'apartment' | 'training' | 'combat';
export type InteractionId = 'computer' | 'telephone' | 'cabinet' | 'television' | 'exit' | 'training';
export interface GameHud {
  scene: SceneId;
  magazine: number;
  reserve: number;
  kills: number;
  enemies: number;
  reloading: boolean;
  weapon: 'pistol' | 'melee';
}
export type GameEvent =
  | { type: 'ready'; scene: SceneId }
  | { type: 'loading'; progress: number }
  | { type: 'interaction'; id: InteractionId }
  | { type: 'hud'; hud: GameHud }
  | { type: 'outcome'; result: 'dead' | 'cleared'; stats: MissionStats }
  | { type: 'tutorial'; action: 'moved' | 'aimed' | 'shot' | 'reloaded' | 'melee' }
  | { type: 'error'; message: string }
  | { type: 'sound'; name: string }
  | { type: 'prompt'; label: string | null };
export interface GamePort {
  emit(event: GameEvent): void;
  spendShot(): Promise<boolean>;
}
export interface GameController {
  setPaused(paused: boolean): void;
  enter(scene: SceneId, ammunition?: number): void;
  setEffects(reducedMotion: boolean): void;
  setPhoneRinging?(ringing: boolean): void;
  setObjective?(id: 'telephone' | 'computer' | 'training' | 'exit' | null): void;
  destroy(): void;
}
export interface WorldRect { x: number; y: number; width: number; height: number }
export interface WorldInteraction { id: InteractionId; x: number; y: number; label: string; radius?: number }
export interface WorldMap {
  width: number; height: number; tileSize: number;
  spawn: { x: number; y: number };
  colliders: WorldRect[];
  interactions: WorldInteraction[];
  enemies?: { type: 'grunt' | 'gunner'; x: number; y: number }[];
}
