import { describe, expect, it } from 'vitest';
import { DemoStartGuard } from '../src/demo-start-guard.js';
import { InMemoryRateLimiter } from '../src/rate-limiter.js';
import { isHoneypotFilled } from '../src/honeypot.js';
import { redactTokenFields, redactUrlForLogging } from '../src/safe-logging.js';

describe('honeypot', () => {
  it('detects filled honeypot values', () => {
    expect(isHoneypotFilled('')).toBe(false);
    expect(isHoneypotFilled('bot-value')).toBe(true);
  });
});

describe('DemoStartGuard', () => {
  it('blocks honeypot submissions with critical risk', () => {
    const guard = new DemoStartGuard();
    const result = guard.evaluate({
      clientIp: '127.0.0.1',
      email: 'test@example.com',
      phoneNumber: '+31612345678',
      honeypotValue: 'spam',
    });

    expect(result.outcome).toBe('block');
    expect(result.riskLevel).toBe('critical');
  });

  it('rate limits by IP', () => {
    const rateLimiter = new InMemoryRateLimiter();
    const guard = new DemoStartGuard({
      rateLimiter,
      config: {
        rateLimits: {
          ipMax: 2,
          ipWindowMs: 60_000,
          emailMax: 20,
          emailWindowMs: 60_000,
          phoneMax: 20,
          phoneWindowMs: 60_000,
        },
        riskThresholds: {
          mediumIpAttempts: 10,
          highIpAttempts: 10,
          criticalIpAttempts: 10,
          mediumEmailAttempts: 10,
          highEmailAttempts: 10,
          criticalEmailAttempts: 10,
          mediumPhoneAttempts: 10,
          highPhoneAttempts: 10,
          criticalPhoneAttempts: 10,
        },
      },
    });

    const input = {
      clientIp: '203.0.113.10',
      email: 'a@example.com',
      phoneNumber: '+31610000001',
    };

    expect(guard.evaluate(input).outcome).toBe('allow');
    expect(guard.evaluate(input).outcome).toBe('allow');
    expect(guard.evaluate(input).outcome).toBe('block');
  });

  it('rate limits by email and phone', () => {
    const rateLimiter = new InMemoryRateLimiter();
    const guard = new DemoStartGuard({
      rateLimiter,
      config: {
        rateLimits: {
          ipMax: 50,
          ipWindowMs: 60_000,
          emailMax: 1,
          emailWindowMs: 60_000,
          phoneMax: 1,
          phoneWindowMs: 60_000,
        },
        riskThresholds: {
          mediumIpAttempts: 10,
          highIpAttempts: 10,
          criticalIpAttempts: 10,
          mediumEmailAttempts: 10,
          highEmailAttempts: 10,
          criticalEmailAttempts: 10,
          mediumPhoneAttempts: 10,
          highPhoneAttempts: 10,
          criticalPhoneAttempts: 10,
        },
      },
    });

    const first = guard.evaluate({
      clientIp: '1.1.1.1',
      email: 'same@example.com',
      phoneNumber: '+31610000002',
    });
    const blockedByEmail = guard.evaluate({
      clientIp: '2.2.2.2',
      email: 'same@example.com',
      phoneNumber: '+31610000003',
    });
    const blockedByPhone = guard.evaluate({
      clientIp: '3.3.3.3',
      email: 'other@example.com',
      phoneNumber: '+31610000002',
    });

    expect(first.outcome).toBe('allow');
    expect(blockedByEmail.outcome).toBe('block');
    expect(blockedByPhone.outcome).toBe('block');
  });

  it('returns medium, high, and critical adaptive responses', () => {
    const rateLimiter = new InMemoryRateLimiter();
    const guard = new DemoStartGuard({
      rateLimiter,
      config: {
        rateLimits: {
          ipMax: 20,
          ipWindowMs: 60_000,
          emailMax: 20,
          emailWindowMs: 60_000,
          phoneMax: 20,
          phoneWindowMs: 60_000,
        },
        riskThresholds: {
          mediumIpAttempts: 2,
          highIpAttempts: 4,
          criticalIpAttempts: 6,
          mediumEmailAttempts: 99,
          highEmailAttempts: 99,
          criticalEmailAttempts: 99,
          mediumPhoneAttempts: 99,
          highPhoneAttempts: 99,
          criticalPhoneAttempts: 99,
        },
      },
    });

    const base = {
      clientIp: '198.51.100.4',
      email: 'risk@example.com',
      phoneNumber: '+31610000004',
    };

    expect(guard.evaluate(base).outcome).toBe('allow');
    expect(guard.evaluate(base).outcome).toBe('challenge');
    expect(guard.evaluate({ ...base, challengeCompleted: true }).outcome).toBe('allow');
    expect(guard.evaluate(base).outcome).toBe('redirect_discovery');
    expect(guard.evaluate(base).outcome).toBe('redirect_discovery');
    expect(guard.evaluate(base).outcome).toBe('block');
  });

  it('blocks waitlist honeypot submissions with critical risk', () => {
    const guard = new DemoStartGuard();
    const result = guard.evaluateWaitlist({
      clientIp: '127.0.0.1',
      emailNormalized: 'test@example.com',
      honeypotValue: 'spam',
    });

    expect(result.outcome).toBe('block');
    expect(result.riskLevel).toBe('critical');
  });

  it('rate limits waitlist by IP', () => {
    const rateLimiter = new InMemoryRateLimiter();
    const guard = new DemoStartGuard({
      rateLimiter,
      config: {
        rateLimits: {
          ipMax: 2,
          ipWindowMs: 60_000,
          emailMax: 20,
          emailWindowMs: 60_000,
          phoneMax: 20,
          phoneWindowMs: 60_000,
        },
        riskThresholds: {
          mediumIpAttempts: 10,
          highIpAttempts: 10,
          criticalIpAttempts: 10,
          mediumEmailAttempts: 10,
          highEmailAttempts: 10,
          criticalEmailAttempts: 10,
          mediumPhoneAttempts: 10,
          highPhoneAttempts: 10,
          criticalPhoneAttempts: 10,
        },
      },
    });

    const input = {
      clientIp: '203.0.113.20',
      emailNormalized: 'waitlist-a@example.com',
    };

    expect(guard.evaluateWaitlist(input).outcome).toBe('allow');
    expect(guard.evaluateWaitlist(input).outcome).toBe('allow');
    expect(guard.evaluateWaitlist(input).outcome).toBe('block');
  });

  it('rate limits waitlist by normalized email without phone keys', () => {
    const rateLimiter = new InMemoryRateLimiter();
    const guard = new DemoStartGuard({
      rateLimiter,
      config: {
        rateLimits: {
          ipMax: 50,
          ipWindowMs: 60_000,
          emailMax: 1,
          emailWindowMs: 60_000,
          phoneMax: 1,
          phoneWindowMs: 60_000,
        },
        riskThresholds: {
          mediumIpAttempts: 10,
          highIpAttempts: 10,
          criticalIpAttempts: 10,
          mediumEmailAttempts: 10,
          highEmailAttempts: 10,
          criticalEmailAttempts: 10,
          mediumPhoneAttempts: 10,
          highPhoneAttempts: 10,
          criticalPhoneAttempts: 10,
        },
      },
    });

    const first = guard.evaluateWaitlist({
      clientIp: '1.1.1.1',
      emailNormalized: 'same@example.com',
    });
    const blockedByEmail = guard.evaluateWaitlist({
      clientIp: '2.2.2.2',
      emailNormalized: 'same@example.com',
    });
    const notBlockedByPhone = guard.evaluateWaitlist({
      clientIp: '3.3.3.3',
      emailNormalized: 'other@example.com',
    });

    expect(first.outcome).toBe('allow');
    expect(blockedByEmail.outcome).toBe('block');
    expect(notBlockedByPhone.outcome).toBe('allow');
  });

  it('returns waitlist adaptive responses without phone contribution', () => {
    const rateLimiter = new InMemoryRateLimiter();
    const guard = new DemoStartGuard({
      rateLimiter,
      config: {
        rateLimits: {
          ipMax: 20,
          ipWindowMs: 60_000,
          emailMax: 20,
          emailWindowMs: 60_000,
          phoneMax: 20,
          phoneWindowMs: 60_000,
        },
        riskThresholds: {
          mediumIpAttempts: 2,
          highIpAttempts: 4,
          criticalIpAttempts: 6,
          mediumEmailAttempts: 99,
          highEmailAttempts: 99,
          criticalEmailAttempts: 99,
          mediumPhoneAttempts: 99,
          highPhoneAttempts: 99,
          criticalPhoneAttempts: 99,
        },
      },
    });

    const base = {
      clientIp: '198.51.100.5',
      emailNormalized: 'waitlist-risk@example.com',
    };

    expect(guard.evaluateWaitlist(base).outcome).toBe('allow');
    expect(guard.evaluateWaitlist(base).outcome).toBe('challenge');
    expect(guard.evaluateWaitlist({ ...base, challengeCompleted: true }).outcome).toBe('allow');
    expect(guard.evaluateWaitlist(base).outcome).toBe('redirect_discovery');
    expect(guard.evaluateWaitlist(base).outcome).toBe('redirect_discovery');
    expect(guard.evaluateWaitlist(base).outcome).toBe('block');
  });
});

describe('safe logging', () => {
  it('redacts token fields and sse query tokens', () => {
    const redacted = redactTokenFields({
      experience_token: 'secret',
      url: '/api/demo/v1/sessions/expsess_1/events?token=abc123',
      transcript: 'full transcript text',
    });

    expect(redacted.experience_token).toBe('[REDACTED]');
    expect(redacted.transcript).toBe('[REDACTED]');
    expect(redacted.url).toContain('token=%5BREDACTED%5D');
    expect(redactUrlForLogging('/events?token=raw-token')).toBe('/events?token=%5BREDACTED%5D');
  });
});
