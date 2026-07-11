import { describe, expect, it } from 'vitest';
import {
  ALLOWED_EXPERIENCE_SESSION_TRANSITIONS,
  canTransitionExperienceSessionState,
  countsAsCompletedDemo,
  createExperienceSessionEntity,
  isActiveExperienceSessionState,
  isValidExperienceSessionState,
  transitionExperienceSessionState,
} from '../src/domain/experience-session.js';
import { InvalidExperienceSessionStateTransitionError } from '../src/domain/experience-session-errors.js';

describe('experience session domain', () => {
  it('uses documented TDS-004 state names', () => {
    expect(Object.keys(ALLOWED_EXPERIENCE_SESSION_TRANSITIONS).sort()).toEqual(
      [
        'CallActive',
        'CallFailed',
        'Completed',
        'Discovery',
        'Draft',
        'Expired',
        'LeadReady',
        'Processing',
        'Purged',
        'Qualified',
        'Recovery',
        'TechnicalFailure',
        'WaitingForCall',
      ].sort(),
    );
  });

  it('allows recovery from active states', () => {
    expect(ALLOWED_EXPERIENCE_SESSION_TRANSITIONS.WaitingForCall).toContain('Recovery');
    expect(ALLOWED_EXPERIENCE_SESSION_TRANSITIONS.LeadReady).toContain('Recovery');
  });

  it('creates a qualified session in WaitingForCall', () => {
    const session = createExperienceSessionEntity(
      {
        prospectId: 'prospect_123',
        experienceDefinitionId: 'expdef_plumbing_demo_v1',
      },
      new Date('2026-07-08T14:00:00.000Z'),
    );

    expect(session.state).toBe('WaitingForCall');
    expect(session.recoveryState).toBe('Connected');
    expect(session.cleanupState).toBe('Pending');
    expect(session.expiresAt).toBe('2026-07-08T14:15:00.000Z');
  });

  it('rejects invalid state values', () => {
    expect(isValidExperienceSessionState('active')).toBe(false);
    expect(isValidExperienceSessionState('WaitingForCall')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    const session = createExperienceSessionEntity({
      prospectId: 'prospect_123',
      experienceDefinitionId: 'expdef_plumbing_demo_v1',
    });

    expect(() => transitionExperienceSessionState(session, 'Completed')).toThrow(
      InvalidExperienceSessionStateTransitionError,
    );
    expect(canTransitionExperienceSessionState('Expired', 'CallActive')).toBe(false);
  });

  it('distinguishes completed demos from expired sessions', () => {
    const waiting = createExperienceSessionEntity({
      prospectId: 'prospect_123',
      experienceDefinitionId: 'expdef_plumbing_demo_v1',
    });
    const expired = transitionExperienceSessionState(waiting, 'Expired', {
      now: new Date('2026-07-08T14:16:00.000Z'),
      failureReason: 'waiting_for_call_timeout',
    });

    let completedPath = transitionExperienceSessionState(waiting, 'CallActive');
    completedPath = transitionExperienceSessionState(completedPath, 'Processing');
    completedPath = transitionExperienceSessionState(completedPath, 'LeadReady');
    const completed = transitionExperienceSessionState(completedPath, 'Completed', {
      now: new Date('2026-07-08T14:20:00.000Z'),
    });

    expect(countsAsCompletedDemo(expired)).toBe(false);
    expect(countsAsCompletedDemo(completed)).toBe(true);
    expect(isActiveExperienceSessionState('Expired')).toBe(false);
    expect(isActiveExperienceSessionState('WaitingForCall')).toBe(true);
  });
});
