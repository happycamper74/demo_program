import type { AnalyticsEventName, AnalyticsService } from '@experience-platform/analytics-core';
import { DemoStartGuard } from '@experience-platform/demo-security';
import { createSafeSecurityLogger } from '@experience-platform/demo-security';
import {
  EXPERIENCE_TOKEN_PERMISSIONS,
  ExperienceTokenService,
  ExperienceTokenOwnershipError,
  hasExperienceTokenPermission,
  validateSessionOwnership,
  type ExperienceTokenClaims,
} from '@experience-platform/auth';
import type {
  LeadBoardAdapterMode,
  LeadBoardClient,
  RestrictedLeadViewData,
} from '@experience-platform/leadboard-client';
import {
  BindIncomingCallUnsupportedError,
  MockLeadBoardClient,
  RestrictedLeadAccessDeniedError,
  RestrictedLeadNotReadyError,
} from '@experience-platform/leadboard-client';
import type { ExperienceDefinitionService } from '@experience-platform/experience-engine/experience-definitions';
import type { ProspectService } from '@experience-platform/experience-engine/experience-prospects';
import type {
  ExperienceSessionRepository,
  ExperienceSessionService,
} from '@experience-platform/experience-engine/experience-sessions';
import {
  ActiveExperienceSessionAlreadyExistsError,
  countsAsCompletedDemo,
  SessionRecoveryExpiredError,
} from '@experience-platform/experience-engine/experience-sessions';
import {
  buildDomainEventId,
  type DomainEventEnvelope,
} from '@experience-platform/event-contracts';
import {
  DiscoveryAlreadyBookedError,
  DiscoveryBookingNotFoundError,
  type MockDiscoveryBookingService,
} from '@experience-platform/discovery-booking';
import type { ExperienceSession } from '@experience-platform/shared-types';
import type { WorkflowOrchestrator } from '@experience-platform/workflow-orchestrator/orchestrator';
import {
  buildPresentationEvent,
  buildRestrictedLeadViewUrl,
  buildStatusReconciliationEvents,
  isLeadViewAvailable,
  isRecoveryAvailable,
  mapSessionStateToApiState,
  resolveCurrentStep,
} from '../domain/session-presentation.js';
import {
  demoAlreadyCompleted,
  challengeRequired,
  demoStartUnavailable,
  discoveryAlreadyBooked,
  forbidden,
  highRiskRedirect,
  activeSessionExists,
  leadNotReady,
  sessionNotFound,
  sessionNotRecoverable,
  simulateCallUnavailable,
  unauthorized,
  validationFailed,
} from '../domain/api-errors.js';
import type { RealModeStatusPoller } from './real-mode-status-poller.js';
import type { SessionEventStream } from '../infrastructure/events/session-event-stream.js';
import type {
  BookDiscoveryApiRequest as BookDiscoveryRequest,
  BookDiscoveryApiResponse as BookDiscoveryResponse,
  DiscoverySlotsApiResponse as DiscoverySlotsResponse,
  RecoverSessionRequest,
  RecoverSessionResponse,
  SessionStatusResponse,
  SimulateCallResponse,
  StartDemoRequest,
  StartDemoResponse,
} from '../types/api.js';
import { mapDomainEventToPresentationEvents as mapToPresentation } from './presentation-event-mapper.js';

const DEFAULT_TOKEN_PERMISSIONS = EXPERIENCE_TOKEN_PERMISSIONS;
const LIVE_EVENT_DELAY_MS = 350;

export interface DemoServiceLogger {
  info(event: string, details: Record<string, unknown>): void;
  warn(event: string, details: Record<string, unknown>): void;
}

export interface DemoServiceDependencies {
  readonly prospectService: ProspectService;
  readonly experienceDefinitionService: ExperienceDefinitionService;
  readonly experienceSessionService: ExperienceSessionService;
  readonly experienceSessionRepository: ExperienceSessionRepository;
  readonly workflowOrchestrator: WorkflowOrchestrator;
  readonly leadBoardClient: LeadBoardClient;
  readonly experienceTokenService: ExperienceTokenService;
  readonly sessionEventStream: SessionEventStream;
  readonly discoveryBookingService: MockDiscoveryBookingService;
  readonly analyticsService: AnalyticsService;
  readonly demoStartGuard: DemoStartGuard;
  readonly logger: DemoServiceLogger;
  readonly leadboardAdapterMode: LeadBoardAdapterMode;
  readonly leadboardSharedDemoOrgId: string;
  readonly leadboardSharedDemoPhoneNumber: string;
  readonly realModeStatusPoller?: RealModeStatusPoller | null;
}

export interface StartDemoRequestContext {
  readonly requestId: string;
  readonly clientIp: string;
}

function normalizeIndustry(value: string): string {
  return value.trim().toLowerCase();
}

function validateStartDemoRequest(request: StartDemoRequest): void {
  const requiredFields: Array<keyof StartDemoRequest> = [
    'full_name',
    'business_name',
    'email',
    'phone_number',
    'industry',
    'business_location',
    'company_size',
    'biggest_challenge',
    'implementation_timeframe',
    'experience_definition_id',
  ];

  const missing = requiredFields.filter((field) => {
    const value = request[field];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw validationFailed('Required fields are missing or empty.', { missing_fields: missing });
  }

  if (!request.no_website && (!request.website || request.website.trim().length === 0)) {
    throw validationFailed('Website is required unless no_website is true.');
  }
}

export class DemoService {
  private readonly safeLogger: DemoServiceLogger;

  constructor(private readonly deps: DemoServiceDependencies) {
    this.safeLogger = createSafeSecurityLogger(deps.logger);
  }

  getLeadBoardClient(): LeadBoardClient {
    return this.deps.leadBoardClient;
  }

  isSimulateCallAvailable(): boolean {
    return this.deps.leadboardAdapterMode === 'mock';
  }

  async startDemo(
    request: StartDemoRequest,
    context: StartDemoRequestContext,
  ): Promise<StartDemoResponse> {
    validateStartDemoRequest(request);

    const securityResult = this.deps.demoStartGuard.evaluate({
      clientIp: context.clientIp,
      email: request.email,
      phoneNumber: request.phone_number,
      honeypotValue: request.company_website_url,
      challengeCompleted: request.challenge_completed ?? false,
    });

    this.safeLogger.info('demo.start.security_evaluated', {
      request_id: context.requestId,
      client_ip: context.clientIp,
      outcome: securityResult.outcome,
    });

    if (securityResult.outcome === 'block') {
      throw demoStartUnavailable();
    }

    if (securityResult.outcome === 'challenge') {
      throw challengeRequired();
    }

    if (securityResult.outcome === 'redirect_discovery') {
      throw highRiskRedirect();
    }

    const definition = await this.deps.experienceDefinitionService.getById(
      request.experience_definition_id,
    );

    if (!definition || definition.status !== 'active') {
      throw validationFailed('The selected experience is not available.');
    }

    const prospect = await this.deps.prospectService.upsert({
      fullName: request.full_name,
      businessName: request.business_name,
      email: request.email,
      phoneNumber: request.phone_number,
      industry: request.industry,
      businessLocation: request.business_location,
      companySize: request.company_size,
      website: request.no_website ? null : (request.website ?? null),
      biggestChallenge: request.biggest_challenge,
      implementationTimeframe: request.implementation_timeframe,
    });

    const completedSession = await this.deps.experienceSessionRepository.findCompletedByProspectAndDefinition(
      prospect.prospectId,
      definition.experienceDefinitionId,
    );

    if (completedSession && countsAsCompletedDemo(completedSession)) {
      throw demoAlreadyCompleted();
    }

    const session = await this.createExperienceSession(
      prospect.prospectId,
      definition.experienceDefinitionId,
    );

    const mirror = await this.deps.leadBoardClient.createDemoSessionMirror({
      experienceSessionId: session.experienceSessionId,
      prospectPhoneE164: prospect.phoneNumber,
      experienceDefinitionId: definition.experienceDefinitionId,
      sharedDemoOrgId:
        this.deps.leadBoardClient instanceof MockLeadBoardClient
          ? this.deps.leadBoardClient.getSharedDemoOrgId()
          : this.deps.leadboardSharedDemoOrgId,
      expiresAt: session.expiresAt,
    });

    const updatedSession = await this.deps.experienceSessionService.updateLeadboardReferences(
      session.experienceSessionId,
      { leadboardDemoSessionId: mirror.leadboardDemoSessionId },
    );

    const industrySupported =
      normalizeIndustry(prospect.industry) === normalizeIndustry(definition.industry);

    const experienceToken = await this.createExperienceToken(updatedSession, definition.version, prospect.industry);

    const sharedDemoPhoneNumber =
      this.deps.leadBoardClient instanceof MockLeadBoardClient
        ? this.deps.leadBoardClient.getSharedDemoPhoneNumber()
        : mirror.sharedDemoPhoneNumber ?? this.deps.leadboardSharedDemoPhoneNumber;

    const timestamp = new Date().toISOString();
    this.deps.sessionEventStream.publish(
      updatedSession.experienceSessionId,
      buildPresentationEvent(
        'session_started',
        updatedSession.experienceSessionId,
        'Demo session started',
        timestamp,
      ),
    );
    this.deps.sessionEventStream.publish(
      updatedSession.experienceSessionId,
      buildPresentationEvent(
        'waiting_for_call',
        updatedSession.experienceSessionId,
        'Waiting for your call',
        timestamp,
      ),
    );

    this.safeLogger.info('demo.started', {
      request_id: context.requestId,
      experience_session_id: updatedSession.experienceSessionId,
      prospect_id: prospect.prospectId,
      industry_supported: industrySupported,
    });

    await this.recordAnalytics('demo.started', {
      experienceSessionId: updatedSession.experienceSessionId,
      prospectId: prospect.prospectId,
      industry: prospect.industry,
    });

    await this.recordAnalytics('qualification.completed', {
      experienceSessionId: updatedSession.experienceSessionId,
      prospectId: prospect.prospectId,
      industry: prospect.industry,
    });

    if (this.deps.leadboardAdapterMode === 'real' && mirror.leadboardDemoSessionId) {
      this.deps.realModeStatusPoller?.trackSession(
        updatedSession.experienceSessionId,
        mirror.leadboardDemoSessionId,
      );
    }

    const response: StartDemoResponse = {
      status: 'started',
      prospect_id: prospect.prospectId,
      experience_session_id: updatedSession.experienceSessionId,
      experience_version: `${definition.slug}_${definition.version}`,
      industry_supported: industrySupported,
      session_state: mapSessionStateToApiState(updatedSession.state),
      shared_demo_phone_number: sharedDemoPhoneNumber,
      expected_call_duration_seconds: definition.estimatedDurationSeconds,
      call_timeout_seconds: definition.maximumCallDurationSeconds,
      experience_token: experienceToken,
      simulate_call_available: this.isSimulateCallAvailable(),
    };

    if (industrySupported) {
      return {
        ...response,
        instructions: {
          title: 'Your interactive demo is ready',
          message: 'Call the number below from the phone number you used to register.',
          scenario_examples: [...definition.scenario.examples],
        },
      };
    }

    return {
      ...response,
      industry_notice: {
        title: 'LeadBoard is currently optimized for plumbing businesses',
        message:
          'You are welcome to try the interactive demo. The example call uses a plumbing scenario, but it demonstrates the AI call handling, transcript, lead creation, and automation workflow that could power future industry editions.',
      },
    };
  }

  async getSessionStatus(
    experienceSessionId: string,
    claims: ExperienceTokenClaims,
  ): Promise<SessionStatusResponse> {
    validateSessionOwnership(claims, { experienceSessionId });

    const session = await this.requireSession(experienceSessionId);
    const processingState = await this.resolveLeadboardProcessingState(session);

    return {
      experience_session_id: session.experienceSessionId,
      state: mapSessionStateToApiState(session.state),
      current_step: resolveCurrentStep(session, processingState),
      lead_view_available: isLeadViewAvailable(session),
      restricted_lead_view_url: isLeadViewAvailable(session)
        ? buildRestrictedLeadViewUrl(session.experienceSessionId)
        : null,
      recovery_available: isRecoveryAvailable(session),
      expires_at: session.expiresAt,
      simulate_call_available: this.isSimulateCallAvailable(),
    };
  }

  async recoverSession(
    experienceSessionId: string,
    request: RecoverSessionRequest,
  ): Promise<RecoverSessionResponse> {
    const verified = await this.deps.experienceTokenService.verifyToken(request.recovery_token);
    validateSessionOwnership(verified.claims, { experienceSessionId });

    if (!hasExperienceTokenPermission(verified.claims, 'experience:recover')) {
      throw forbidden('Recovery is not permitted for this session.');
    }

    const session = await this.requireSession(experienceSessionId);

    if (session.state !== 'Recovery') {
      throw sessionNotRecoverable();
    }

    try {
      const recovered = await this.deps.workflowOrchestrator.completeRecovery(experienceSessionId);
      const experienceToken = await this.createExperienceToken(
        recovered,
        verified.claims.experience_version,
        verified.claims.industry,
      );

      return {
        status: 'recovered',
        experience_session_id: recovered.experienceSessionId,
        state: mapSessionStateToApiState(recovered.state),
        restricted_lead_view_url: isLeadViewAvailable(recovered)
          ? buildRestrictedLeadViewUrl(recovered.experienceSessionId)
          : null,
        experience_token: experienceToken,
      };
    } catch (error) {
      if (error instanceof SessionRecoveryExpiredError) {
        throw sessionNotRecoverable();
      }

      throw error;
    }
  }

  async authorizeSessionRequest(
    experienceSessionId: string,
    authorizationHeader: string | undefined,
    explicitToken?: string,
  ): Promise<ExperienceTokenClaims> {
    const token = explicitToken ?? extractBearerToken(authorizationHeader);
    if (!token) {
      throw unauthorized();
    }

    const verified = await this.deps.experienceTokenService.verifyToken(token);

    try {
      validateSessionOwnership(verified.claims, { experienceSessionId });
    } catch (error) {
      if (error instanceof ExperienceTokenOwnershipError) {
        throw forbidden();
      }

      throw error;
    }

    if (!hasExperienceTokenPermission(verified.claims, 'experience:view')) {
      throw forbidden();
    }

    return verified.claims;
  }

  async buildInitialSseEvents(experienceSessionId: string): Promise<ReturnType<typeof buildStatusReconciliationEvents>> {
    const session = await this.requireSession(experienceSessionId);
    const processingState = await this.resolveLeadboardProcessingState(session);
    return buildStatusReconciliationEvents(session, processingState);
  }

  async getRestrictedLeadView(
    experienceSessionId: string,
    claims: ExperienceTokenClaims,
  ): Promise<RestrictedLeadViewData> {
    validateSessionOwnership(claims, { experienceSessionId });

    if (!hasExperienceTokenPermission(claims, 'lead:view')) {
      throw forbidden('Lead view is not permitted for this session.');
    }

    const session = await this.requireSession(experienceSessionId);

    if (!isLeadViewAvailable(session) || !session.leadboardDemoSessionId || !session.leadboardLeadId) {
      throw leadNotReady();
    }

    try {
      const leadView = await this.deps.leadBoardClient.getRestrictedLeadView({
        experienceSessionId,
        leadboardDemoSessionId: session.leadboardDemoSessionId,
        leadId: session.leadboardLeadId,
      });

      const prospect = await this.deps.prospectService.getById(session.prospectId);
      await this.recordAnalytics('lead.viewed', {
        experienceSessionId,
        prospectId: session.prospectId,
        industry: prospect?.industry ?? null,
      });

      return leadView;
    } catch (error) {
      if (error instanceof RestrictedLeadNotReadyError) {
        throw leadNotReady();
      }

      if (error instanceof RestrictedLeadAccessDeniedError) {
        throw forbidden();
      }

      throw error;
    }
  }

  async simulateIncomingCall(
    experienceSessionId: string,
    claims: ExperienceTokenClaims,
  ): Promise<SimulateCallResponse> {
    validateSessionOwnership(claims, { experienceSessionId });

    if (!this.isSimulateCallAvailable()) {
      throw simulateCallUnavailable();
    }

    const session = await this.requireSession(experienceSessionId);
    const prospect = await this.deps.prospectService.getById(session.prospectId);

    if (!prospect) {
      throw validationFailed('Prospect not found for session.');
    }

    if (session.state !== 'WaitingForCall') {
      return {
        status: 'simulated',
        experience_session_id: session.experienceSessionId,
        state: mapSessionStateToApiState(session.state),
      };
    }

    let bound;
    try {
      bound = await this.deps.leadBoardClient.bindIncomingCall({
        experienceSessionId,
        callerPhoneE164: prospect.phoneNumber,
      });
    } catch (error) {
      if (error instanceof BindIncomingCallUnsupportedError) {
        throw simulateCallUnavailable();
      }

      throw error;
    }

    let updated = await this.deps.experienceSessionService.updateLeadboardReferences(
      experienceSessionId,
      {
        leadboardDemoSessionId: bound.leadboardDemoSessionId,
        leadboardLeadId: bound.leadId,
      },
    );

    updated = await this.deps.workflowOrchestrator.transition(experienceSessionId, 'CallActive');
    await this.recordAnalytics('call.started', {
      experienceSessionId,
      prospectId: session.prospectId,
      industry: prospect.industry,
    });

    updated = await this.deps.workflowOrchestrator.transition(experienceSessionId, 'Processing');

    await this.publishLeadboardProcessingEvents(bound.processingEvents, session);
    await this.recordAnalytics('call.completed', {
      experienceSessionId,
      prospectId: session.prospectId,
      industry: prospect.industry,
    });

    updated = await this.deps.workflowOrchestrator.transition(experienceSessionId, 'LeadReady');
    await this.recordAnalytics('lead.ready', {
      experienceSessionId,
      prospectId: session.prospectId,
      industry: prospect.industry,
    });

    return {
      status: 'simulated',
      experience_session_id: updated.experienceSessionId,
      state: mapSessionStateToApiState(updated.state),
    };
  }

  async getDiscoverySlots(cursor?: string | null): Promise<DiscoverySlotsResponse> {
    const response = this.deps.discoveryBookingService.getSuggestedSlots(cursor);
    return {
      slots: response.slots.map((slot) => ({
        slot_id: slot.slotId,
        starts_at: slot.startsAt,
        display: slot.display,
      })),
      next_cursor: response.nextCursor,
    };
  }

  async bookDiscovery(
    experienceSessionId: string,
    claims: ExperienceTokenClaims,
    request: BookDiscoveryRequest,
  ): Promise<BookDiscoveryResponse> {
    validateSessionOwnership(claims, { experienceSessionId });

    if (!hasExperienceTokenPermission(claims, 'discovery:book')) {
      throw forbidden('Discovery booking is not permitted for this session.');
    }

    const session = await this.requireSession(experienceSessionId);
    const prospect = await this.deps.prospectService.getById(session.prospectId);

    if (!prospect) {
      throw validationFailed('Prospect not found for session.');
    }

    try {
      const booked = this.deps.discoveryBookingService.bookDiscovery({
        experienceSessionId,
        prospectId: session.prospectId,
        selectedSlotId: request.selected_slot_id,
        timezone: request.timezone,
        prospectEmail: prospect.email,
        prospectPhoneNumber: prospect.phoneNumber,
      });

      if (session.state === 'LeadReady') {
        await this.deps.workflowOrchestrator.transition(experienceSessionId, 'Discovery');
      }

      this.publishPresentationEvent(experienceSessionId, 'discovery_booked', 'Discovery session booked');

      await this.recordAnalytics('discovery.booked', {
        experienceSessionId,
        prospectId: session.prospectId,
        industry: prospect.industry,
      });

      return {
        status: 'booked',
        discovery_session_id: booked.discoverySessionId,
        scheduled_at: booked.scheduledAt,
        confirmation: {
          email_sent: booked.confirmation.emailSent,
          sms_sent: booked.confirmation.smsSent,
        },
      };
    } catch (error) {
      if (error instanceof DiscoveryAlreadyBookedError) {
        throw discoveryAlreadyBooked();
      }

      if (error instanceof DiscoveryBookingNotFoundError) {
        throw validationFailed('Selected slot is no longer available.');
      }

      throw error;
    }
  }

  private async createExperienceSession(prospectId: string, experienceDefinitionId: string) {
    try {
      return await this.deps.experienceSessionService.create({
        prospectId,
        experienceDefinitionId,
      });
    } catch (error) {
      if (error instanceof ActiveExperienceSessionAlreadyExistsError) {
        throw activeSessionExists();
      }

      throw error;
    }
  }

  async recordClientAnalytics(input: {
    eventName: AnalyticsEventName;
    experienceSessionId?: string | null;
    prospectId?: string | null;
    industry?: string | null;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    await this.recordAnalytics(input.eventName, input);
  }

  private async recordAnalytics(
    eventName: AnalyticsEventName,
    input: {
      experienceSessionId?: string | null;
      prospectId?: string | null;
      industry?: string | null;
      payload?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.deps.analyticsService.recordEvent({
      eventName,
      experienceSessionId: input.experienceSessionId ?? null,
      prospectId: input.prospectId ?? null,
      industry: input.industry ?? null,
      payload: input.payload,
    });
  }

  private async createExperienceToken(
    session: ExperienceSession,
    experienceVersion?: string,
    industry?: string,
  ): Promise<string> {
    return this.deps.experienceTokenService.createToken({
      experienceSessionId: session.experienceSessionId,
      experienceDefinitionId: session.experienceDefinitionId,
      prospectId: session.prospectId,
      permissions: DEFAULT_TOKEN_PERMISSIONS,
      expiresAt: new Date(session.expiresAt),
      experienceVersion,
      industry,
      leadboardDemoSessionId: session.leadboardDemoSessionId,
      leadboardLeadId: session.leadboardLeadId,
    });
  }

  private async requireSession(experienceSessionId: string): Promise<ExperienceSession> {
    const session = await this.deps.experienceSessionService.getById(experienceSessionId);
    if (!session) {
      throw sessionNotFound(experienceSessionId);
    }

    return session;
  }

  private async resolveLeadboardProcessingState(
    session: ExperienceSession,
  ): Promise<import('@experience-platform/leadboard-client').DemoProcessingState | null> {
    if (!session.leadboardDemoSessionId) {
      return null;
    }

    try {
      const status = await this.deps.leadBoardClient.getDemoSessionStatus(
        session.leadboardDemoSessionId,
      );
      return status.processingState;
    } catch {
      return null;
    }
  }

  private async publishLeadboardProcessingEvents(
    processingEvents: readonly {
      eventName: string;
      occurredAt: string;
      experienceSessionId: string;
      leadboardDemoSessionId: string;
      payload: Record<string, unknown>;
    }[],
    session: ExperienceSession,
  ): Promise<void> {
    for (const processingEvent of processingEvents) {
      const envelope: DomainEventEnvelope = {
        eventId: buildDomainEventId(),
        eventName: processingEvent.eventName,
        eventVersion: 1,
        occurredAt: processingEvent.occurredAt,
        experienceSessionId: processingEvent.experienceSessionId,
        experienceDefinitionId: session.experienceDefinitionId,
        prospectId: session.prospectId,
        payload: processingEvent.payload,
      };

      for (const presentationEvent of mapToPresentation(envelope)) {
        this.deps.sessionEventStream.publish(session.experienceSessionId, presentationEvent);
      }

      await delay(LIVE_EVENT_DELAY_MS);
    }
  }

  private publishPresentationEvent(
    experienceSessionId: string,
    event: import('../types/api.js').PresentationEventName,
    label: string,
  ): void {
    this.deps.sessionEventStream.publish(
      experienceSessionId,
      buildPresentationEvent(event, experienceSessionId, label, new Date().toISOString()),
    );
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}
