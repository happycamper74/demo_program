import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index.js';

describe('@experience-platform/shared-types', () => {
  it('exports the package name', () => {
    expect(PACKAGE_NAME).toBe('@experience-platform/shared-types');
  });
});
