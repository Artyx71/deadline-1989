import { drizzle } from 'drizzle-orm/sql-js';
import type { Database, SqlJsStatic } from 'sql.js';
import { INITIAL_MIGRATION_SQL, schema, type DomainStore, type TransactionPort } from '@deadline/domain';
import { ProfileStorageError } from './protocol';

function transactions(sqlite: Database): TransactionPort {
  const run = <T>(operation: () => T, mode: 'IMMEDIATE' | 'DEFERRED'): T => {
    sqlite.run(`BEGIN ${mode}`);
    try {
      const result = operation();
      sqlite.run('COMMIT');
      return result;
    } catch (error) {
      sqlite.run('ROLLBACK');
      throw error;
    }
  };
  return { transaction: <T>(operation: () => T) => ({ immediate: () => run(operation, 'IMMEDIATE'), deferred: () => run(operation, 'DEFERRED') }) };
}

let migrationChecksum: Promise<string> | undefined;
function checksum(): Promise<string> {
  migrationChecksum ??= crypto.subtle.digest('SHA-256', new TextEncoder().encode(INITIAL_MIGRATION_SQL)).then(value => [...new Uint8Array(value)].map(byte => byte.toString(16).padStart(2, '0')).join(''));
  return migrationChecksum;
}

export interface BrowserSqlStore { raw: Database; store: DomainStore }

export async function openSqlStore(SQL: SqlJsStatic, bytes?: Uint8Array): Promise<BrowserSqlStore> {
  const hash = await checksum();
  const raw = bytes ? new SQL.Database(bytes) : new SQL.Database();
  try {
    raw.run('PRAGMA foreign_keys = ON');
    raw.run('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, hash TEXT NOT NULL, applied_at TEXT NOT NULL)');
    const sqlite = transactions(raw);
    const rows = raw.exec('SELECT version, hash FROM schema_migrations ORDER BY version DESC');
    const latest = rows[0]?.values[0];
    if (latest && Number(latest[0]) > 1) throw new ProfileStorageError('SCHEMA_TOO_NEW', 'Версия локального профиля новее версии приложения. Обновите страницу.');
    const migration = raw.exec('SELECT hash FROM schema_migrations WHERE version = 1')[0]?.values[0];
    if (migration && migration[0] !== hash) throw new ProfileStorageError('SCHEMA_MISMATCH', 'Не совпадает контрольная сумма схемы локального профиля. Данные сохранены; очистка не выполнялась.');
    if (!migration) sqlite.transaction(() => {
      raw.run(INITIAL_MIGRATION_SQL);
      raw.run('INSERT INTO schema_migrations VALUES (?, ?, ?)', [1, hash, new Date().toISOString()]);
    }).immediate();
    return { raw, store: { sqlite, db: drizzle(raw, { schema }) } };
  } catch (error) { raw.close(); throw error; }
}
