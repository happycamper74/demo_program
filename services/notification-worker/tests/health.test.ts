import { describe, expect, it } from 'vitest';
import { getHealthStatus, SERVICE_NAME } from '../src/index.js';

describe('@experience-platform/notification-worker', () => {
  it('reports healthy status', () => {
    expect(getHealthStatus()).toEqual({
      status: 'ok',
      service: SERVICE_NAME,
    });
  });
});
