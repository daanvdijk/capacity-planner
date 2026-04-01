import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'data.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      factorial_id TEXT UNIQUE,
      location_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    -- migrate: add location_id if missing
    CREATE TABLE IF NOT EXISTS _migrations (key TEXT PRIMARY KEY);
    INSERT OR IGNORE INTO _migrations VALUES ('add_location_id');

    CREATE TABLE IF NOT EXISTS allocations (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      week_start TEXT NOT NULL,
      percentage INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES team_members(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      UNIQUE(member_id, project_id, week_start)
    );
  `);
}

export default getDb;
