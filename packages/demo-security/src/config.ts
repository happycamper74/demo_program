import type { RateLimitConfig, RiskThresholdConfig, SecurityConfig } from './types.js';

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadSecurityConfigFromEnv(env: NodeJS.ProcessEnv = process.env): SecurityConfig {
  const rateLimits: RateLimitConfig = {
    ipMax: readPositiveInt(env.RATE_LIMIT_IP_MAX, 20),
    ipWindowMs: readPositiveInt(env.RATE_LIMIT_IP_WINDOW_MS, 60 * 60 * 1000),
    emailMax: readPositiveInt(env.RATE_LIMIT_EMAIL_MAX, 5),
    emailWindowMs: readPositiveInt(env.RATE_LIMIT_EMAIL_WINDOW_MS, 60 * 60 * 1000),
    phoneMax: readPositiveInt(env.RATE_LIMIT_PHONE_MAX, 5),
    phoneWindowMs: readPositiveInt(env.RATE_LIMIT_PHONE_WINDOW_MS, 60 * 60 * 1000),
  };

  const riskThresholds: RiskThresholdConfig = {
    mediumIpAttempts: readPositiveInt(env.RISK_MEDIUM_IP_ATTEMPTS, 3),
    highIpAttempts: readPositiveInt(env.RISK_HIGH_IP_ATTEMPTS, 5),
    criticalIpAttempts: readPositiveInt(env.RISK_CRITICAL_IP_ATTEMPTS, 8),
    mediumEmailAttempts: readPositiveInt(env.RISK_MEDIUM_EMAIL_ATTEMPTS, 2),
    highEmailAttempts: readPositiveInt(env.RISK_HIGH_EMAIL_ATTEMPTS, 3),
    criticalEmailAttempts: readPositiveInt(env.RISK_CRITICAL_EMAIL_ATTEMPTS, 5),
    mediumPhoneAttempts: readPositiveInt(env.RISK_MEDIUM_PHONE_ATTEMPTS, 2),
    highPhoneAttempts: readPositiveInt(env.RISK_HIGH_PHONE_ATTEMPTS, 3),
    criticalPhoneAttempts: readPositiveInt(env.RISK_CRITICAL_PHONE_ATTEMPTS, 5),
  };

  return { rateLimits, riskThresholds };
}
