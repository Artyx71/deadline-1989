import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { z, ZodError } from 'zod';
import {
  missionStatsSchema,
  settingsSchema,
  taskInputSchema,
  taskPatchSchema,
  tutorialSteps,
} from '@deadline/shared';
import { openDatabase } from './database.js';
import { DomainError } from './errors.js';
import { createService, dialogueIds, rewardDefinitions, type ServiceOptions } from './service.js';

const fieldNames: Record<string, string> = {
  title: 'Название',
  description: 'Описание',
  difficulty: 'Сложность',
  dueAt: 'Срок',
  id: 'Идентификатор',
  ammo: 'Патроны',
  missionId: 'Миссия',
  count: 'Количество',
  outcome: 'Результат',
  stats: 'Статистика',
  kills: 'Устранения',
  shotsFired: 'Выстрелы',
  hits: 'Попадания',
  meleeKills: 'Устранения в ближнем бою',
  durationMs: 'Длительность',
  emptyMagazine: 'Пустой магазин',
  step: 'Этап обучения',
  completed: 'Завершение',
  skipped: 'Пропуск обучения',
  ignored: 'Пропуск звонка',
  masterVolume: 'Общая громкость',
  musicVolume: 'Громкость музыки',
  sfxVolume: 'Громкость эффектов',
  muted: 'Выключение звука',
  streamerMode: 'Режим стримера',
  reducedMotion: 'Уменьшение анимации',
  crt: 'Эффект ЭЛТ',
  confirmation: 'Подтверждение',
};
function validationMessage(issue: ZodError['issues'][number]): string {
  switch (issue.code) {
    case 'too_small':
      if (issue.origin === 'string')
        return issue.minimum === 1
          ? 'Заполните это поле.'
          : `Минимальная длина — ${issue.minimum} символов.`;
      return `Значение должно быть не меньше ${issue.minimum}.`;
    case 'too_big':
      return issue.origin === 'string'
        ? `Максимальная длина — ${issue.maximum} символов.`
        : `Значение не должно превышать ${issue.maximum}.`;
    case 'invalid_type':
      return 'Неверный тип значения.';
    case 'invalid_format':
      return 'Неверный формат значения.';
    case 'invalid_value':
      return 'Выберите допустимое значение.';
    case 'unrecognized_keys':
      return 'В запросе есть неизвестные поля.';
    default:
      return 'Проверьте введённое значение.';
  }
}

export interface AppOptions extends ServiceOptions {
  dbPath?: string;
  logger?: boolean;
}
const idParams = z.object({ id: z.string().uuid() });
const emptyBody = z.object({}).strict();
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

export function createApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 32 * 1024 });
  const store = openDatabase(options.dbPath ?? process.env.DATABASE_PATH ?? 'data/deadline.sqlite');
  const service = createService(store, options);
  app.addHook('onClose', async () => {
    store.sqlite.close();
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_INPUT',
          message: error.issues
            .map(
              (issue) =>
                `${issue.path.map((field) => fieldNames[String(field)] ?? String(field)).join(' → ') || 'Запрос'}: ${validationMessage(issue)}`,
            )
            .join('; '),
          requestId: request.id,
        },
      });
    }
    if (error instanceof DomainError)
      return reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message, requestId: request.id } });
    const status =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number(error.statusCode)
        : 500;
    if (status >= 400 && status < 500)
      return reply.code(status).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Не удалось обработать запрос.',
          requestId: request.id,
        },
      });
    request.log.error({ err: error }, 'Request failed');
    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Не удалось выполнить действие. Повторите запрос с тем же ключом.',
        requestId: request.id,
      },
    });
  });
  app.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith('/api/') && app.hasReplyDecorator('sendFile'))
      return reply.sendFile('index.html');
    return reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Запрошенный адрес не найден.',
        requestId: request.id,
      },
    });
  });

  function key(request: FastifyRequest): string {
    const header = request.headers['idempotency-key'];
    const result = z.string().trim().min(1).max(128).safeParse(header);
    if (!result.success)
      throw new DomainError(
        400,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Для изменения данных нужен заголовок Idempotency-Key.',
      );
    return result.data;
  }
  function mutate(
    request: FastifyRequest,
    input: unknown,
    operation: () => ReturnType<typeof service.completeTask> | void,
  ) {
    return service.mutate(
      key(request),
      `${request.method} ${request.url.split('?')[0]}`,
      input,
      operation,
    );
  }
  app.get('/api/health', async () => ({ ok: true }));
  app.get('/api/rules', async () => ({ rewards: rewardDefinitions }));
  app.get('/api/state', async () => service.snapshot());
  app.get('/api/tasks', async () => service.snapshot().tasks);
  app.get('/api/player', async () => service.snapshot().player);
  app.post('/api/tasks', async (request) => {
    const input = taskInputSchema.parse(request.body);
    return mutate(request, input, () => service.createTask(input));
  });
  app.patch('/api/tasks/:id', async (request) => {
    const { id } = idParams.parse(request.params);
    const input = taskPatchSchema.parse(request.body);
    if (Object.keys(input).length === 0)
      throw new DomainError(400, 'INVALID_INPUT', 'Укажите хотя бы одно поле задачи.');
    return mutate(request, input, () => service.patchTask(id, input));
  });
  app.post('/api/tasks/:id/complete', async (request) => {
    const { id } = idParams.parse(request.params);
    const input = emptyBody.parse(request.body ?? {});
    return mutate(request, input, () => service.completeTask(id));
  });
  app.post('/api/tasks/:id/reopen', async (request) => {
    const { id } = idParams.parse(request.params);
    const input = emptyBody.parse(request.body ?? {});
    return mutate(request, input, () => service.reopenTask(id));
  });
  app.delete('/api/tasks/:id', async (request) => {
    const { id } = idParams.parse(request.params);
    const input = emptyBody.parse(request.body ?? {});
    return mutate(request, input, () => service.deleteTask(id));
  });
  app.post('/api/missions/start', async (request) => {
    const input = missionStart.parse(request.body);
    return mutate(request, input, () => service.startMission(input));
  });
  app.post('/api/missions/:id/shots', async (request) => {
    const { id } = idParams.parse(request.params);
    const input = z
      .object({ count: z.literal(1) })
      .strict()
      .parse(request.body);
    return mutate(request, input, () => service.shoot(id));
  });
  app.post('/api/missions/:id/finish', async (request) => {
    const { id } = idParams.parse(request.params);
    const input = missionFinish.parse(request.body);
    return mutate(request, input, () => service.finishMission(id, input));
  });
  app.get('/api/settings', async () => service.snapshot().settings);
  app.patch('/api/settings', async (request) => {
    const input = settingsSchema.partial().parse(request.body);
    return mutate(request, input, () => service.patchSettings(input));
  });
  app.patch('/api/tutorial', async (request) => {
    const input = tutorialPatch.parse(request.body);
    return mutate(request, input, () => service.patchTutorial(input));
  });
  app.post('/api/game/reset', async (request) => {
    const input = emptyBody.parse(request.body ?? {});
    return mutate(request, input, () => service.resetGame());
  });
  app.post('/api/profile/reset', async (request) => {
    const input = z
      .object({ confirmation: z.literal('УДАЛИТЬ') })
      .strict()
      .parse(request.body);
    return mutate(request, input, () => service.resetProfile());
  });
  app.get('/api/dialogue/next', async () => service.nextDialogue());
  app.post('/api/dialogue/:id/acknowledge', async (request) => {
    const { id } = z.object({ id: z.enum(dialogueIds) }).parse(request.params);
    const input = z
      .object({ ignored: z.boolean().default(false) })
      .strict()
      .parse(request.body ?? {});
    return mutate(request, input, () => service.acknowledge(id, input.ignored));
  });
  return app;
}
