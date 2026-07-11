import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../src/index.js';

describe('@experience-platform/operations-center', () => {
  it('exports the app name placeholder', () => {
    expect(APP_NAME).toBe('operations-center');
  });
});
