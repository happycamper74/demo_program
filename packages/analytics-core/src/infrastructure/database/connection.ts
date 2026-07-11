import Database from 'better-sqlite3';
import { runMigrations } from './migrate.js';

export interface AnalyticsDatabaseOptions {
  readonly filePath?: string;
}

export function createAnalyticsDatabase(
  options: AnalyticsDatabaseOptions = {},
): Database.Database {
  const database = new Database(options.filePath ?? ':memory:');
  database.pragma('foreign_keys = ON');
  runMigrations(database);
  return database;
}
