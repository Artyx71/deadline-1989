import { z } from 'zod';
import { createService, dialogueIds, DomainError, rewardDefinitions } from '@deadline/domain';
import {
  missionStatsSchema,
  settingsSchema,
  taskInputSchema,
  taskPatchSchema,
  tutorialSteps,
  type RewardClaim,
} from '@deadline/shared';
import type { ProfileRequest } from './protocol';

type Service = ReturnType<typeof createService>;
const emptyBody = z.object({}).strict();
const taskIdSchema = z.string().uuid();
const tutorialPatch = z
  .object({
    step: z.enum(tutorialSteps).optional(),
    completed: z.boolean().optional(),
    skipped: z.boolean().optional(),
  })
  .strict();
const missionStart = z
  .object({ ammo: z.number().int().min(0).max(10000), missionId: z.literal('first-shift') })
  .strict();
const missionFinish = z
  .object({ outcome: z.enum(['dead', 'cleared', 'abandoned']), stats: missionStatsSchema })
  .strict();

export function dispatchProfile(
  service: Service,
  request: ProfileRequest,
): { body: unknown; mutated: boolean } {
  const path =
    (request.path.startsWith('/api/') ? request.path.slice(4) : request.path).split('?')[0] ?? '';
  const { method } = request;
  const body = request.body ?? {};
  if (new TextEncoder().encode(JSON.stringify(body)).byteLength > 32768)
    throw new DomainError(413, 'INVALID_INPUT', 'Размер запроса превышает допустимый.');
  const mutate = (input: unknown, operation: () => RewardClaim | void) => {
    const key = z.string().trim().min(1).max(128).safeParse(request.key);
    if (!key.success)
      throw new DomainError(
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Для изменения данных нужен ключ повторного запроса.',
      );
    return {
      body: service.mutate(key.data, `${method} /api${path}`, input, operation),
      mutated: true,
    };
  };
  if (method === 'GET') {
    if (path === '/health') return { body: { ok: true }, mutated: false };
    if (path === '/rules') return { body: { rewards: rewardDefinitions }, mutated: false };
    if (path === '/state') return { body: service.snapshot(), mutated: false };
    if (path === '/tasks') return { body: service.snapshot().tasks, mutated: false };
    if (path === '/player') return { body: service.snapshot().player, mutated: false };
    if (path === '/settings') return { body: service.snapshot().settings, mutated: false };
    if (path === '/dialogue/next') return { body: service.nextDialogue(), mutated: false };
  }
  if (method === 'POST' && path === '/tasks') {
    const input = taskInputSchema.parse(body);
    return mutate(input, () => service.createTask(input));
  }
  const taskMatch = /^\/tasks\/([^/]+)(?:\/(complete|reopen))?$/.exec(path);
  if (taskMatch) {
    const id = taskIdSchema.parse(taskMatch[1]);
    if (method === 'PATCH' && !taskMatch[2]) {
      const input = taskPatchSchema.parse(body);
      if (!Object.keys(input).length)
        throw new DomainError(400, 'INVALID_INPUT', 'Укажите хотя бы одно поле задачи.');
      return mutate(input, () => service.patchTask(id, input));
    }
    if (method === 'DELETE' && !taskMatch[2])
      return mutate(emptyBody.parse(body), () => service.deleteTask(id));
    if (method === 'POST' && taskMatch[2] === 'complete')
      return mutate(emptyBody.parse(body), () => service.completeTask(id));
    if (method === 'POST' && taskMatch[2] === 'reopen')
      return mutate(emptyBody.parse(body), () => service.reopenTask(id));
  }
  if (method === 'POST' && path === '/missions/start') {
    const input = missionStart.parse(body);
    return mutate(input, () => service.startMission(input));
  }
  const attemptMatch = /^\/missions\/([^/]+)\/(shots|finish)$/.exec(path);
  if (method === 'POST' && attemptMatch) {
    const id = taskIdSchema.parse(attemptMatch[1]);
    if (attemptMatch[2] === 'shots')
      return mutate(
        z
          .object({ count: z.literal(1) })
          .strict()
          .parse(body),
        () => service.shoot(id),
      );
    const input = missionFinish.parse(body);
    return mutate(input, () => service.finishMission(id, input));
  }
  if (method === 'PATCH' && path === '/settings') {
    const input = settingsSchema.partial().parse(body);
    return mutate(input, () => service.patchSettings(input));
  }
  if (method === 'PATCH' && path === '/tutorial') {
    const input = tutorialPatch.parse(body);
    return mutate(input, () => service.patchTutorial(input));
  }
  if (method === 'POST' && path === '/game/reset')
    return mutate(emptyBody.parse(body), () => service.resetGame());
  if (method === 'POST' && path === '/profile/reset')
    return mutate(
      z
        .object({ confirmation: z.literal('УДАЛИТЬ') })
        .strict()
        .parse(body),
      () => service.resetProfile(),
    );
  const dialogueMatch = /^\/dialogue\/([^/]+)\/acknowledge$/.exec(path);
  if (method === 'POST' && dialogueMatch) {
    const id = z.enum(dialogueIds).parse(dialogueMatch[1]);
    const input = z
      .object({ ignored: z.boolean().default(false) })
      .strict()
      .parse(body);
    return mutate(input, () => service.acknowledge(id, input.ignored));
  }
  throw new DomainError(404, 'NOT_FOUND', 'Запрошенный адрес не найден.');
}
