import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function resolveLocalDatabasePath(filePath: string): string {
  const resolved = resolve(filePath);
  mkdirSync(dirname(resolved), { recursive: true });
  return resolved;
}
