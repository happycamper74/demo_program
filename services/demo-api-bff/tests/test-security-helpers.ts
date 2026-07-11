import { DemoStartGuard, InMemoryRateLimiter } from '@experience-platform/demo-security';

export function createPermissiveDemoStartGuard(): DemoStartGuard {
  return new DemoStartGuard({
    rateLimiter: new InMemoryRateLimiter(),
    config: {
      rateLimits: {
        ipMax: 1000,
        ipWindowMs: 60_000,
        emailMax: 1000,
        emailWindowMs: 60_000,
        phoneMax: 1000,
        phoneWindowMs: 60_000,
      },
      riskThresholds: {
        mediumIpAttempts: 999,
        highIpAttempts: 999,
        criticalIpAttempts: 999,
        mediumEmailAttempts: 999,
        highEmailAttempts: 999,
        criticalEmailAttempts: 999,
        mediumPhoneAttempts: 999,
        highPhoneAttempts: 999,
        criticalPhoneAttempts: 999,
      },
    },
  });
}
