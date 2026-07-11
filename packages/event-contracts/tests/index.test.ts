import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index.js';

describe('@experience-platform/event-contracts', () => {
  it('exports the package name', () => {
    expect(PACKAGE_NAME).toBe('@experience-platform/event-contracts');
  });
});
