/** Initial migration bytes shared by native and browser SQLite adapters. */
export const INITIAL_MIGRATION_SQL = `CREATE TABLE tasks (
 id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
 difficulty TEXT NOT NULL CHECK(difficulty IN ('easy','normal','hard')),
 status TEXT NOT NULL CHECK(status IN ('active','completed')), due_at TEXT,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT
);
CREATE TABLE reward_claims (
 id TEXT PRIMARY KEY NOT NULL, task_id TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
 ammo INTEGER NOT NULL CHECK(ammo >= 0), xp INTEGER NOT NULL CHECK(xp >= 0), created_at TEXT NOT NULL
);
CREATE TABLE player_state (
 id INTEGER PRIMARY KEY CHECK(id = 1), ammo INTEGER NOT NULL CHECK(ammo >= 0),
 xp INTEGER NOT NULL CHECK(xp >= 0), deaths INTEGER NOT NULL CHECK(deaths >= 0),
 consecutive_deaths INTEGER NOT NULL CHECK(consecutive_deaths >= 0)
);
CREATE TABLE state_meta (id INTEGER PRIMARY KEY CHECK(id = 1), revision INTEGER NOT NULL);
CREATE TABLE mission_attempts (
 id TEXT PRIMARY KEY NOT NULL, mission_id TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('active','dead','cleared','abandoned')),
 reserved INTEGER NOT NULL CHECK(reserved >= 0), spent INTEGER NOT NULL CHECK(spent >= 0 AND spent <= reserved),
 started_at TEXT NOT NULL, finished_at TEXT, stats TEXT
);
CREATE UNIQUE INDEX one_active_attempt ON mission_attempts(status) WHERE status = 'active';
CREATE TABLE mission_progress (
 mission_id TEXT PRIMARY KEY NOT NULL, unlocked INTEGER NOT NULL, completions INTEGER NOT NULL DEFAULT 0,
 best_time_ms INTEGER
);
CREATE TABLE tutorial_progress (id INTEGER PRIMARY KEY CHECK(id = 1), step TEXT NOT NULL, completed INTEGER NOT NULL, skipped INTEGER NOT NULL);
CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK(id = 1), value TEXT NOT NULL);
CREATE TABLE dialogue_history (id TEXT PRIMARY KEY NOT NULL, acknowledged_at TEXT NOT NULL, ignored INTEGER NOT NULL);
CREATE TABLE idempotency_operations (key TEXT PRIMARY KEY NOT NULL, fingerprint TEXT NOT NULL, response TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE resource_ledger (
 id TEXT PRIMARY KEY NOT NULL, kind TEXT NOT NULL, reference_id TEXT NOT NULL,
 ammo INTEGER NOT NULL, xp INTEGER NOT NULL, created_at TEXT NOT NULL
);
INSERT INTO player_state VALUES (1, 0, 0, 0, 0);
INSERT INTO state_meta VALUES (1, 0);
INSERT INTO mission_progress VALUES ('first-shift', 0, 0, NULL);
INSERT INTO tutorial_progress VALUES (1, 'wake', 0, 0);
INSERT INTO settings VALUES (1, '{"masterVolume":0.65,"musicVolume":0.55,"sfxVolume":0.7,"muted":false,"streamerMode":true,"reducedMotion":false,"crt":true}');
`;
