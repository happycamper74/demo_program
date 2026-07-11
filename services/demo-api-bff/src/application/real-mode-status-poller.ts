import type { AnalyticsService } from '@experience-platform/analytics-core';
import type { LeadBoardClient } from '@experience-platform/leadboard-client';
import {
  DemoSessionMirrorNotFoundError,
  LeadBoardApiError,
  type DemoProcessingState,
  type DemoSessionMirrorStatus,
} from '@experience-platform/leadboard-client';
import type { ProspectService } from '@experience-platform/experience-engine/experience-prospects';
import type { ExperienceSessionService } from '@experience-platform/experience-engine/experience-sessions';
import type { ExperienceSession, ExperienceSessionState } from '@experience-platform/shared-types';
import { buildPresentationEvent } from '../domain/session-presentation.js';
import type { SessionEventStream } from '../infrastructure/events/session-event-stream.js';
import type { DemoServiceLogger } from './demo-service.js';
import {
  collectPresentationEventsForAdvance,
  isTerminalProcessingState,
} from './processing-state-presentation.js';

const TERMINAL_EXPERIENCE_SESSION_STATES = new Set<ExperienceSessionState>([
  'Completed',
  'Expired',
  'Purged',
  'CallFailed',
  'TechnicalFailure',
]);

const DEFAULT_POLL_INTERVAL_MS = 2_000;

export interface RealModeStatusPollerDependencies {
  readonly leadBoardClient: LeadBoardClient;
  readonly experienceSessionService: ExperienceSessionService;
  readonly prospectService: ProspectService;
  readonly sessionEventStream: SessionEventStream;
  readonly analyticsService: AnalyticsService;
  readonly logger: DemoServiceLogger;
  readonly pollIntervalMs?: number;
}

interface TrackedSession {
  readonly experienceSessionId: string;
  readonly leadboardDemoSessionId: string;
  lastProcessingState: DemoProcessingState;
  timer: ReturnType<typeof setInterval> | null;
  stopped: boolean;
}

function isTerminalMirrorStatus(status: DemoSessionMirrorStatus): boolean {
  return status === 'expired' || status === 'purged';
}

export class RealModeStatusPoller {
  private readonly pollIntervalMs: number;
  private readonly trackedSessions = new Map<string, TrackedSession>();

  constructor(private readonly deps: RealModeStatusPollerDependencies) {
    this.pollIntervalMs = deps.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  trackSession(experienceSessionId: string, leadboardDemoSessionId: string): void {
    if (this.trackedSessions.has(experienceSessionId)) {
      return;
    }

    const tracked: TrackedSession = {
      experienceSessionId,
      leadboardDemoSessionId,
      lastProcessingState: 'waiting_for_call',
      timer: null,
      stopped: false,
    };

    this.trackedSessions.set(experienceSessionId, tracked);
    void this.pollOnce(tracked);
    tracked.timer = setInterval(() => {
      void this.pollOnce(tracked);
    }, this.pollIntervalMs);
  }

  stopTracking(experienceSessionId: string): void {
    const tracked = this.trackedSessions.get(experienceSessionId);
    if (!tracked) {
      return;
    }

    this.stopTrackedSession(tracked);
    this.trackedSessions.delete(experienceSessionId);
  }

  isTracking(experienceSessionId: string): boolean {
    const tracked = this.trackedSessions.get(experienceSessionId);
    return Boolean(tracked && !tracked.stopped);
  }

  getLastProcessingState(experienceSessionId: string): DemoProcessingState | null {
    return this.trackedSessions.get(experienceSessionId)?.lastProcessingState ?? null;
  }

  async pollOnceForTests(experienceSessionId: string): Promise<void> {
    const tracked = this.trackedSessions.get(experienceSessionId);
    if (!tracked) {
      throw new Error(`Session ${experienceSessionId} is not tracked`);
    }

    await this.pollOnce(tracked);
  }

  private stopTrackedSession(tracked: TrackedSession): void {
    tracked.stopped = true;
    if (tracked.timer) {
      clearInterval(tracked.timer);
      tracked.timer = null;
    }
  }

  private async pollOnce(tracked: TrackedSession): Promise<void> {
    if (tracked.stopped) {
      return;
    }

    try {
      const session = await this.deps.experienceSessionService.getById(tracked.experienceSessionId);
      if (!session) {
        this.stopTrackedSession(tracked);
        return;
      }

      if (TERMINAL_EXPERIENCE_SESSION_STATES.has(session.state)) {
        this.stopTrackedSession(tracked);
        return;
      }

      const status = await this.deps.leadBoardClient.getDemoSessionStatus(
        tracked.leadboardDemoSessionId,
      );

      await this.syncLeadboardReferences(session, status.leadId);
      await this.handleMirrorStatus(session, status.status);
      await this.handleProcessingStateAdvance(session, status.processingState);

      if (
        isTerminalMirrorStatus(status.status) ||
        isTerminalProcessingState(status.processingState)
      ) {
        this.stopTrackedSession(tracked);
      }
    } catch (error) {
      if (error instanceof DemoSessionMirrorNotFoundError) {
        this.deps.logger.warn('demo.real_mode.poll_unrecoverable', {
          experience_session_id: tracked.experienceSessionId,
          leadboard_demo_session_id: tracked.leadboardDemoSessionId,
          reason: 'mirror_not_found',
        });
        this.stopTrackedSession(tracked);
        return;
      }

      if (error instanceof LeadBoardApiError && error.status >= 500) {
        this.deps.logger.warn('demo.real_mode.poll_transient_error', {
          experience_session_id: tracked.experienceSessionId,
          code: error.code,
          status: error.status,
        });
        return;
      }

      this.deps.logger.warn('demo.real_mode.poll_failed', {
        experience_session_id: tracked.experienceSessionId,
        error: error instanceof Error ? error.name : 'UnknownError',
      });
    }
  }

  private async syncLeadboardReferences(
    session: ExperienceSession,
    leadId: string | null,
  ): Promise<void> {
    if (!leadId || session.leadboardLeadId === leadId) {
      return;
    }

    await this.deps.experienceSessionService.updateLeadboardReferences(session.experienceSessionId, {
      leadboardDemoSessionId: session.leadboardDemoSessionId,
      leadboardLeadId: leadId,
    });
  }

  private async handleMirrorStatus(
    session: ExperienceSession,
    mirrorStatus: DemoSessionMirrorStatus,
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    if (mirrorStatus === 'expired') {
      this.publishPresentationEvent(session.experienceSessionId, 'session_expired', 'Session expired', timestamp);
      if (session.state !== 'Expired') {
        await this.deps.experienceSessionService.transitionTo(session.experienceSessionId, 'Expired');
      }
      return;
    }

    if (mirrorStatus === 'purged') {
      this.publishPresentationEvent(session.experienceSessionId, 'cleanup_started', 'Cleanup started', timestamp);
      if (session.state !== 'Purged') {
        await this.deps.experienceSessionService.transitionTo(session.experienceSessionId, 'Purged');
      }
    }
  }

  private async handleProcessingStateAdvance(
    session: ExperienceSession,
    processingState: DemoProcessingState,
  ): Promise<void> {
    const tracked = this.trackedSessions.get(session.experienceSessionId);
    if (!tracked) {
      return;
    }

    const previousState = tracked.lastProcessingState;
    if (processingState === previousState) {
      return;
    }

    const timestamp = new Date().toISOString();
    const presentationEvents = collectPresentationEventsForAdvance(
      previousState,
      processingState,
      session.experienceSessionId,
      timestamp,
    );

    for (const event of presentationEvents) {
      this.deps.sessionEventStream.publish(session.experienceSessionId, event);
    }

    tracked.lastProcessingState = processingState;
    await this.syncWorkflowState(session.experienceSessionId, processingState);
    await this.recordAnalyticsForAdvance(session, previousState, processingState);
  }

  private async syncWorkflowState(
    experienceSessionId: string,
    processingState: DemoProcessingState,
  ): Promise<void> {
    const session = await this.deps.experienceSessionService.getById(experienceSessionId);
    if (!session) {
      return;
    }

    if (processingState === 'call_received') {
      await this.ensureSessionState(session, 'CallActive');
      return;
    }

    if (['transcript_stored', 'lead_created', 'summary_ready'].includes(processingState)) {
      await this.ensureSessionState(session, 'CallActive');
      const refreshed = await this.deps.experienceSessionService.getById(experienceSessionId);
      if (refreshed) {
        await this.ensureSessionState(refreshed, 'Processing');
      }
      return;
    }

    if (processingState === 'lead_ready') {
      const refreshed = await this.deps.experienceSessionService.getById(experienceSessionId);
      if (!refreshed) {
        return;
      }

      await this.ensureSessionState(refreshed, 'CallActive');
      const afterCall = await this.deps.experienceSessionService.getById(experienceSessionId);
      if (afterCall) {
        await this.ensureSessionState(afterCall, 'Processing');
      }
      const afterProcessing = await this.deps.experienceSessionService.getById(experienceSessionId);
      if (afterProcessing) {
        await this.ensureSessionState(afterProcessing, 'LeadReady');
      }
    }
  }

  private async ensureSessionState(
    session: ExperienceSession,
    targetState: ExperienceSessionState,
  ): Promise<void> {
    let current = session;

    const stateOrder: ExperienceSessionState[] = [
      'WaitingForCall',
      'CallActive',
      'Processing',
      'LeadReady',
    ];
    const targetIndex = stateOrder.indexOf(targetState);

    if (targetIndex === -1) {
      if (current.state !== targetState) {
        await this.deps.experienceSessionService.transitionTo(
          current.experienceSessionId,
          targetState,
        );
      }
      return;
    }

    while (current.state !== targetState) {
      const currentIndex = stateOrder.indexOf(current.state);
      if (currentIndex === -1 || currentIndex >= targetIndex) {
        await this.deps.experienceSessionService.transitionTo(
          current.experienceSessionId,
          targetState,
        );
        return;
      }

      const nextState = stateOrder[currentIndex + 1];
      if (!nextState) {
        return;
      }

      current = await this.deps.experienceSessionService.transitionTo(
        current.experienceSessionId,
        nextState,
      );
    }
  }

  private async recordAnalyticsForAdvance(
    session: ExperienceSession,
    previousState: DemoProcessingState,
    nextState: DemoProcessingState,
  ): Promise<void> {
    const prospect = await this.deps.prospectService.getById(session.prospectId);
    const industry = prospect?.industry ?? null;

    if (previousState === 'waiting_for_call' && nextState !== 'waiting_for_call') {
      await this.deps.analyticsService.recordEvent({
        eventName: 'call.started',
        experienceSessionId: session.experienceSessionId,
        prospectId: session.prospectId,
        industry,
      });
    }

    if (
      compareProcessingStateIndex(previousState) < compareProcessingStateIndex('transcript_stored') &&
      compareProcessingStateIndex(nextState) >= compareProcessingStateIndex('transcript_stored')
    ) {
      await this.deps.analyticsService.recordEvent({
        eventName: 'call.completed',
        experienceSessionId: session.experienceSessionId,
        prospectId: session.prospectId,
        industry,
      });
    }

    if (nextState === 'lead_ready') {
      await this.deps.analyticsService.recordEvent({
        eventName: 'lead.ready',
        experienceSessionId: session.experienceSessionId,
        prospectId: session.prospectId,
        industry,
      });
    }
  }

  private publishPresentationEvent(
    experienceSessionId: string,
    event: 'session_expired' | 'cleanup_started',
    label: string,
    timestamp: string,
  ): void {
    this.deps.sessionEventStream.publish(
      experienceSessionId,
      buildPresentationEvent(event, experienceSessionId, label, timestamp),
    );
  }
}

function compareProcessingStateIndex(state: DemoProcessingState): number {
  const order: DemoProcessingState[] = [
    'waiting_for_call',
    'call_received',
    'transcript_stored',
    'lead_created',
    'summary_ready',
    'lead_ready',
    'purged',
  ];
  return order.indexOf(state);
}
