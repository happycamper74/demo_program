import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';

function resolveMigrationsDirectory(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    join(currentDir, '../../migrations'),
    join(currentDir, '../../../migrations'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Migrations directory not found');
}

const migrationsDirectory = resolveMigrationsDirectory();

export function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedMigrations = new Set(
    database
      .prepare('SELECT migration_name FROM schema_migrations')
      .all()
      .map((row) => (row as { migration_name: string }).migration_name),
  );

  const migrationFiles = readdirSync(migrationsDirectory)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    if (appliedMigrations.has(migrationFile)) {
      continue;
    }

    const sql = readFileSync(join(migrationsDirectory, migrationFile), 'utf8');
    database.exec(sql);
    database
      .prepare('INSERT INTO schema_migrations (migration_name, applied_at) VALUES (?, ?)')
      .run(migrationFile, new Date().toISOString());
  }
}
