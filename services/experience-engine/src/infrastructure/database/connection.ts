/**
 * Local development database bootstrap.
 * SQLite is used for local/dev only; production should use a Postgres adapter.
 */
import Database from 'better-sqlite3';
import { runMigrations } from './migrate.js';

export interface DatabaseOptions {
  readonly filePath?: string;
}

export function createDatabase(options: DatabaseOptions = {}): Database.Database {
  const database = new Database(options.filePath ?? ':memory:');
  database.pragma('foreign_keys = ON');
  runMigrations(database);
  return database;
}
