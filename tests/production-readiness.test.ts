import { describe, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

describe('production readiness script', () => {
  it('is available as a package script entrypoint', async () => {
    const { readFileSync } = await import('node:fs');
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['production-readiness']).toContain(
      'scripts/production-readiness-check.ts',
    );
  });
});
