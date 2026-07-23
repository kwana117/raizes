import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DATA_DIR = path.join(process.cwd(), 'data');
export const MEDIA_DIR = path.join(DATA_DIR, 'media');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS individuals (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  maiden_name TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT 'unknown',
  birth_date TEXT NOT NULL DEFAULT '',
  birth_place TEXT NOT NULL DEFAULT '',
  death_date TEXT NOT NULL DEFAULT '',
  death_place TEXT NOT NULL DEFAULT '',
  living INTEGER NOT NULL DEFAULT 1,
  occupation TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  photo TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  partner1_id TEXT,
  partner2_id TEXT,
  status TEXT NOT NULL DEFAULT 'married',
  marriage_date TEXT NOT NULL DEFAULT '',
  marriage_place TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS family_children (
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  PRIMARY KEY (family_id, child_id)
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  individual_id TEXT NOT NULL,
  date TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  sort_key TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_children_family ON family_children(family_id);
CREATE INDEX IF NOT EXISTS idx_children_child ON family_children(child_id);
CREATE INDEX IF NOT EXISTS idx_events_individual ON events(individual_id);
`;

type GlobalWithDb = typeof globalThis & { __raizesDb?: Database.Database };

export function db(): Database.Database {
  const g = globalThis as GlobalWithDb;
  if (g.__raizesDb) return g.__raizesDb;

  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  const instance = new Database(path.join(DATA_DIR, 'raizes.db'));
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  instance.exec(SCHEMA);
  g.__raizesDb = instance;
  return instance;
}
