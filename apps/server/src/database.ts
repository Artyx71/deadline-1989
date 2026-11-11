import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import * as schema from './schema.js';
import { INITIAL_MIGRATION_SQL } from '@deadline/domain';

export interface Store {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
}

export function openDatabase(path: string): Store {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  try {
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('synchronous = FULL');
    sqlite.exec(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, hash TEXT NOT NULL, applied_at TEXT NOT NULL)',
    );
    const latest = sqlite
      .prepare('SELECT MAX(version) AS version FROM schema_migrations')
      .get() as { version: number | null };
    if (latest.version !== null && latest.version > 1)
      throw new Error('Database schema is newer than this server');
    const migration = INITIAL_MIGRATION_SQL;
    const hash = createHash('sha256').update(migration).digest('hex');
    const applied = sqlite.prepare('SELECT hash FROM schema_migrations WHERE version = 1').get() as
      { hash: string } | undefined;
    if (applied && applied.hash !== hash) throw new Error('Applied migration checksum mismatch');
    if (!applied)
      sqlite
        .transaction(() => {
          sqlite.exec(migration);
          sqlite
            .prepare('INSERT INTO schema_migrations VALUES (?, ?, ?)')
            .run(1, hash, new Date().toISOString());
        })
        .immediate();
    return { sqlite, db: drizzle(sqlite, { schema }) };
  } catch (error) {
    sqlite.close();
    throw error;
  }
}
