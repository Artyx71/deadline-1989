import { z } from 'zod';

interface PendingRequest {
  resolve: (response: { status: number; body: unknown }) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}
const responseSchema = z.object({
  id: z.string(),
  status: z.number().int().min(100).max(599),
  body: z.unknown(),
});
let worker: Worker | undefined;
const pending = new Map<string, PendingRequest>();

function failPending(message: string) {
  for (const request of pending.values()) {
    clearTimeout(request.timer);
    request.reject(new Error(message));
  }
  pending.clear();
  worker?.terminate();
  worker = undefined;
}

function getWorker(): Worker {
  if (worker) return worker;
  if (typeof Worker === 'undefined')
    throw new Error('Браузер не поддерживает фоновое локальное хранилище. Обновите браузер.');
  worker = new Worker(new URL('./profile.worker.ts', import.meta.url), {
    type: 'module',
    name: 'deadline-sqlite-profile',
  });
  worker.onmessage = (event: MessageEvent<unknown>) => {
    const parsed = responseSchema.safeParse(event.data);
    if (!parsed.success) {
      failPending('Локальное хранилище вернуло некорректный ответ. Повторите подключение.');
      return;
    }
    const request = pending.get(parsed.data.id);
    if (!request) return;
    pending.delete(parsed.data.id);
    clearTimeout(request.timer);
    request.resolve({ status: parsed.data.status, body: parsed.data.body });
  };
  worker.onerror = (event) => {
    event.preventDefault();
    failPending(
      'Локальное хранилище недоступно. Проверьте загрузку файлов приложения и повторите запрос.',
    );
  };
  worker.onmessageerror = () =>
    failPending('Не удалось прочитать ответ локального хранилища. Повторите запрос.');
  return worker;
}

export const browserApi = {
  request(
    path: string,
    method = 'GET',
    body?: unknown,
    key?: string,
  ): Promise<{ status: number; body: unknown }> {
    return new Promise((resolve, reject) => {
      const instance = getWorker();
      const id = crypto.randomUUID();
      const timer = setTimeout(() => {
        pending.delete(id);
        // A timed-out operation may already be committed. The transport owner
        // must retain its idempotency key and retry/reconcile that same request.
        reject(
          new Error(
            'Локальное хранилище долго не отвечает. Результат неизвестен; повторите запрос с тем же ключом.',
          ),
        );
      }, 30000);
      pending.set(id, { resolve, reject, timer });
      try {
        instance.postMessage({ id, path, method, body, key });
      } catch {
        pending.delete(id);
        clearTimeout(timer);
        reject(new Error('Не удалось отправить запрос в локальное хранилище.'));
      }
    });
  },
  close() {
    failPending('Подключение к локальному профилю закрыто. Повторите запрос.');
  },
};
