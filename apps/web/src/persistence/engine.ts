import type { SqlJsStatic } from 'sql.js';
import { createService, type ServiceOptions } from '@deadline/domain';
import { openSqlStore } from './sqlStore';
import { dispatchProfile } from './routes';
import {
  ProfileStorageError,
  type ProfileRequest,
  type ProfileResponse,
  type ProfileStorage,
} from './protocol';

/** Caller holds the origin-wide lock until the exported DB is durably saved. */
export async function executeProfile(
  SQL: SqlJsStatic,
  storage: ProfileStorage,
  request: ProfileRequest,
  options?: ServiceOptions,
): Promise<ProfileResponse> {
  const bytes = await storage.load();
  const { raw, store } = await openSqlStore(SQL, bytes);
  try {
    const result = dispatchProfile(createService(store, options), request);
    if (result.mutated || !bytes) {
      try {
        await storage.save(raw.export());
      } catch {
        throw new ProfileStorageError(
          'PERSISTENCE_FAILED',
          'Не удалось сохранить локальный профиль. Действие не подтверждено. Проверьте доступное место и повторите запрос с тем же ключом.',
        );
      }
    }
    return { id: request.id, status: 200, body: result.body };
  } finally {
    raw.close();
  }
}
