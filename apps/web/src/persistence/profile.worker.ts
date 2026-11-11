import initSqlJs, { type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { DomainError } from '@deadline/domain';
import { z, ZodError } from 'zod';
import { executeProfile } from './engine';
import { indexedDbStorage } from './indexedDb';
import { profileRequestSchema, ProfileStorageError, type ProfileResponse } from './protocol';

z.config(z.locales.ru());

const scope = self as unknown as {
  addEventListener(type: 'message', callback: (event: MessageEvent<unknown>) => void): void;
  postMessage(message: ProfileResponse): void;
};
let engine: Promise<SqlJsStatic> | undefined;
function sqlEngine(): Promise<SqlJsStatic> {
  engine ??= initSqlJs({ locateFile: () => wasmUrl }).catch(() => {
    engine = undefined;
    throw new ProfileStorageError(
      'SQLITE_UNAVAILABLE',
      'Не удалось загрузить SQLite. Проверьте соединение и повторите запрос; сохранённый профиль не удалялся.',
    );
  });
  return engine;
}
const fields: Record<string, string> = {
  title: 'Название',
  description: 'Описание',
  difficulty: 'Сложность',
  dueAt: 'Срок',
  ammo: 'Патроны',
  missionId: 'Миссия',
  outcome: 'Результат',
  stats: 'Статистика',
  step: 'Этап обучения',
  confirmation: 'Подтверждение',
  key: 'Ключ запроса',
};

async function handle(message: unknown): Promise<ProfileResponse> {
  const id =
    typeof message === 'object' &&
    message !== null &&
    'id' in message &&
    typeof message.id === 'string'
      ? message.id
      : 'unknown';
  try {
    const request = profileRequestSchema.parse(message);
    if (!navigator.locks)
      throw new ProfileStorageError(
        'LOCKS_UNAVAILABLE',
        'Этот браузер не поддерживает безопасную синхронизацию локального профиля. Откройте приложение по HTTPS в современном браузере.',
      );
    return await navigator.locks.request(
      'deadline-1989:sqlite-profile-v1',
      { mode: 'exclusive' },
      async () => executeProfile(await sqlEngine(), indexedDbStorage, request),
    );
  } catch (error) {
    if (error instanceof ZodError)
      return {
        id,
        status: 400,
        body: {
          error: {
            code: 'INVALID_INPUT',
            message: error.issues
              .map(
                (issue) =>
                  `${issue.path.map((field) => fields[String(field)] ?? 'Поле').join(' → ') || 'Запрос'}: ${issue.message}`,
              )
              .join('; '),
          },
        },
      };
    if (error instanceof DomainError)
      return {
        id,
        status: error.statusCode,
        body: { error: { code: error.code, message: error.message } },
      };
    if (error instanceof ProfileStorageError)
      return { id, status: 503, body: { error: { code: error.code, message: error.message } } };
    return {
      id,
      status: 500,
      body: {
        error: {
          code: 'LOCAL_PROFILE_ERROR',
          message:
            'Не удалось открыть или изменить локальный профиль. Данные не удалялись. Повторите запрос с тем же ключом.',
        },
      },
    };
  }
}

scope.addEventListener('message', (event) => {
  void handle(event.data).then((response) => scope.postMessage(response));
});
