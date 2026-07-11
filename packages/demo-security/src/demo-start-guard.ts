import type { DemoStartSecurityInput, DemoStartSecurityResult, RiskLevel, RiskThresholdConfig } from './types.js';
import { isHoneypotFilled } from './honeypot.js';
import { InMemoryRateLimiter } from './rate-limiter.js';
import type { RateLimitConfig } from './types.js';
import { loadSecurityConfigFromEnv } from './config.js';

export interface DemoStartGuardDependencies {
  readonly rateLimiter?: InMemoryRateLimiter;
  readonly config?: ReturnType<typeof loadSecurityConfigFromEnv>;
}

export class DemoStartGuard {
  private readonly rateLimiter: InMemoryRateLimiter;
  private readonly rateLimits: RateLimitConfig;
  private readonly riskThresholds: RiskThresholdConfig;

  constructor(deps: DemoStartGuardDependencies = {}) {
    this.rateLimiter = deps.rateLimiter ?? new InMemoryRateLimiter();
    this.rateLimits = deps.config?.rateLimits ?? loadSecurityConfigFromEnv().rateLimits;
    this.riskThresholds = deps.config?.riskThresholds ?? loadSecurityConfigFromEnv().riskThresholds;
  }

  evaluate(input: DemoStartSecurityInput): DemoStartSecurityResult {
    if (isHoneypotFilled(input.honeypotValue)) {
      return { outcome: 'block', riskLevel: 'critical' };
    }

    const ipKey = `ip:${normalizeKey(input.clientIp)}`;
    const emailKey = `email:${normalizeKey(input.email)}`;
    const phoneKey = `phone:${normalizeKey(input.phoneNumber)}`;

    const ipCount = this.rateLimiter.record(ipKey, this.rateLimits.ipWindowMs);
    const emailCount = this.rateLimiter.record(emailKey, this.rateLimits.emailWindowMs);
    const phoneCount = this.rateLimiter.record(phoneKey, this.rateLimits.phoneWindowMs);

    if (
      ipCount > this.rateLimits.ipMax ||
      emailCount > this.rateLimits.emailMax ||
      phoneCount > this.rateLimits.phoneMax
    ) {
      return { outcome: 'block', riskLevel: 'critical' };
    }

    const riskLevel = assessRiskLevel(
      {
        ipCount,
        emailCount,
        phoneCount,
        challengeCompleted: input.challengeCompleted ?? false,
      },
      this.riskThresholds,
    );

    switch (riskLevel) {
      case 'critical':
        return { outcome: 'block', riskLevel };
      case 'high':
        return { outcome: 'redirect_discovery', riskLevel };
      case 'medium':
        return input.challengeCompleted
          ? { outcome: 'allow', riskLevel: 'low' }
          : { outcome: 'challenge', riskLevel };
      default:
        return { outcome: 'allow', riskLevel: 'low' };
    }
  }
}

function assessRiskLevel(
  input: {
    ipCount: number;
    emailCount: number;
    phoneCount: number;
    challengeCompleted: boolean;
  },
  thresholds: RiskThresholdConfig,
): RiskLevel {
  if (
    input.ipCount >= thresholds.criticalIpAttempts ||
    input.emailCount >= thresholds.criticalEmailAttempts ||
    input.phoneCount >= thresholds.criticalPhoneAttempts
  ) {
    return 'critical';
  }

  if (
    input.ipCount >= thresholds.highIpAttempts ||
    input.emailCount >= thresholds.highEmailAttempts ||
    input.phoneCount >= thresholds.highPhoneAttempts
  ) {
    return 'high';
  }

  if (
    input.ipCount >= thresholds.mediumIpAttempts ||
    input.emailCount >= thresholds.mediumEmailAttempts ||
    input.phoneCount >= thresholds.mediumPhoneAttempts
  ) {
    return 'medium';
  }

  return 'low';
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}
