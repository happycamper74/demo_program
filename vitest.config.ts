import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: [
            'apps/*/tests/**/*.test.ts',
            'services/*/tests/**/*.test.ts',
            'packages/*/tests/**/*.test.ts',
            'tests/**/*.test.ts',
          ],
          exclude: ['apps/demo-web/tests/**', 'apps/operations-center/tests/**'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'demo-web',
          include: ['apps/demo-web/tests/**/*.test.ts', 'apps/demo-web/tests/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./apps/demo-web/tests/setup.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'operations-center',
          include: [
            'apps/operations-center/tests/**/*.test.ts',
            'apps/operations-center/tests/**/*.test.tsx',
          ],
          environment: 'jsdom',
          setupFiles: ['./apps/operations-center/tests/setup.ts'],
        },
      },
    ],
  },
});
