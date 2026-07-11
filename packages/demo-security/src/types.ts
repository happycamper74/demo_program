export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type DemoStartGuardOutcome = 'allow' | 'challenge' | 'redirect_discovery' | 'block';

export interface RateLimitConfig {
  readonly ipMax: number;
  readonly ipWindowMs: number;
  readonly emailMax: number;
  readonly emailWindowMs: number;
  readonly phoneMax: number;
  readonly phoneWindowMs: number;
}

export interface RiskThresholdConfig {
  readonly mediumIpAttempts: number;
  readonly highIpAttempts: number;
  readonly criticalIpAttempts: number;
  readonly mediumEmailAttempts: number;
  readonly highEmailAttempts: number;
  readonly criticalEmailAttempts: number;
  readonly mediumPhoneAttempts: number;
  readonly highPhoneAttempts: number;
  readonly criticalPhoneAttempts: number;
}

export interface SecurityConfig {
  readonly rateLimits: RateLimitConfig;
  readonly riskThresholds: RiskThresholdConfig;
}

export interface RateLimitCheckResult {
  readonly allowed: boolean;
  readonly currentCount: number;
  readonly limit: number;
}

export interface DemoStartSecurityInput {
  readonly clientIp: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly honeypotValue?: string | null;
  readonly challengeCompleted?: boolean;
}

export interface WaitlistStartSecurityInput {
  readonly clientIp: string;
  readonly emailNormalized: string;
  readonly honeypotValue?: string | null;
  readonly challengeCompleted?: boolean;
}

export interface DemoStartSecurityResult {
  readonly outcome: DemoStartGuardOutcome;
  readonly riskLevel: RiskLevel;
}

export const GENERIC_DEMO_START_FAILURE_MESSAGE =
  'Unable to start demo right now. Please try again later or book a Discovery Session.';

export const CHALLENGE_REQUIRED_MESSAGE =
  'Please complete the verification step before starting your demo.';

export const HIGH_RISK_REDIRECT_MESSAGE =
  'We could not start your interactive demo automatically. Please book a Discovery Session or contact our team.';
