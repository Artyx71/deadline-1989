import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type * as schema from './schema.js';

/** Adapter owns BEGIN/COMMIT/ROLLBACK; callbacks must run synchronously. */
export interface TransactionPort {
  transaction<T>(operation: () => T): { immediate(): T; deferred(): T };
}

/** Driver-independent SQLite access shared by native and browser persistence. */
export interface DomainStore {
  db: BaseSQLiteDatabase<'sync', unknown, typeof schema>;
  sqlite: TransactionPort;
}
