import type { LeadBoardClient } from '@experience-platform/leadboard-client';
import { MockLeadBoardClient } from '@experience-platform/leadboard-client';
import type { ExperienceDefinitionService } from '@experience-platform/experience-engine/experience-definitions';
import type { ProspectService } from '@experience-platform/experience-engine/experience-prospects';
import type {
  ExperienceSessionRepository,
  SessionOperationsFilters,
} from '@experience-platform/experience-engine/experience-sessions';
import type { AnalyticsService } from '@experience-platform/analytics-core';
import type { MockDiscoveryBookingService } from '@experience-platform/discovery-booking';
import type { ExperienceSession } from '@experience-platform/shared-types';
import { mapSessionStateToApiState, resolveCurrentStep } from '../domain/session-presentation.js';
import type {
  LiveSessionView,
  OpsActionResult,
  OpsIncident,
  PlatformHealthComponent,
  PlatformHealthResponse,
  SessionHistoryEntry,
  SessionHistoryFilters,
  SessionTimelineEvent,
} from '../types/ops.js';

const ACTIONABLE_FAILURE_STATES = new Set(['TechnicalFailure', 'CallFailed', 'Expired']);

export interface OpsServiceDependencies {
  readonly experienceSessionRepository: ExperienceSessionRepository;
  readonly prospectService: ProspectService;
  readonly experienceDefinitionService: ExperienceDefinitionService;
  readonly leadBoardClient: LeadBoardClient;
  readonly discoveryBookingService: MockDiscoveryBookingService;
  readonly analyticsService: AnalyticsService;
}

export class OpsService {
  private readonly handledIncidents = new Set<string>();

  constructor(private readonly deps: OpsServiceDependencies) {}

  async listActionableIncidents(): Promise<readonly OpsIncident[]> {
    const sessions = await this.deps.experienceSessionRepository.searchForOperations({});
    const health = await this.getPlatformHealth();
    const incidents: OpsIncident[] = [];

    for (const session of sessions) {
      if (!ACTIONABLE_FAILURE_STATES.has(session.state)) {
        continue;
      }

      incidents.push({
        incident_id: `incident_${session.experienceSessionId}`,
        priority: session.state === 'TechnicalFailure' ? 'critical' : 'high',
        title: `${session.state} requires attention`,
        description: session.failureReason ?? `Session ${session.experienceSessionId} is in ${session.state}.`,
        experience_session_id: session.experienceSessionId,
        action_type: session.state === 'TechnicalFailure' ? 'retry' : 'investigate',
        created_at: session.startedAt,
      });
    }

    for (const component of health.components) {
      if (component.status !== 'unhealthy') {
        continue;
      }

      incidents.push({
        incident_id: `incident_health_${component.component}`,
        priority: 'critical',
        title: `${component.component} is unhealthy`,
        description: component.message,
        experience_session_id: null,
        action_type: 'investigate',
        created_at: new Date().toISOString(),
      });
    }

    return incidents
      .filter((incident) => !this.handledIncidents.has(incident.incident_id))
      .sort((left, right) => priorityWeight(right.priority) - priorityWeight(left.priority));
  }

  async listLiveSessions(): Promise<readonly LiveSessionView[]> {
    const sessions = await this.deps.experienceSessionRepository.listActiveForOperations();
    const incidents = await this.listActionableIncidents();
    const incidentBySession = new Map(
      incidents
        .filter((incident) => incident.experience_session_id)
        .map((incident) => [incident.experience_session_id as string, incident.incident_id]),
    );

    const views: LiveSessionView[] = [];

    for (const session of sessions) {
      const prospect = await this.deps.prospectService.getById(session.prospectId);
      if (!prospect) {
        continue;
      }

      views.push({
        experience_session_id: session.experienceSessionId,
        prospect_name: prospect.fullName,
        business_name: prospect.businessName,
        industry: prospect.industry,
        experience_definition_id: session.experienceDefinitionId,
        state: mapSessionStateToApiState(session.state),
        current_stage: resolveCurrentStep(session, null),
        elapsed_seconds: computeElapsedSeconds(session.startedAt),
        incident_id: incidentBySession.get(session.experienceSessionId) ?? null,
      });
    }

    return views;
  }

  async searchSessionHistory(filters: SessionHistoryFilters): Promise<readonly SessionHistoryEntry[]> {
    const repositoryFilters: SessionOperationsFilters = {
      prospectName: filters.prospect_name,
      businessName: filters.business_name,
      email: filters.email,
      phone: filters.phone,
      industry: filters.industry,
      experienceSessionId: filters.experience_session_id,
      startedAfter: filters.started_after,
      startedBefore: filters.started_before,
    };

    const sessions = await this.deps.experienceSessionRepository.searchForOperations(
      repositoryFilters,
    );
    const entries: SessionHistoryEntry[] = [];

    for (const session of sessions) {
      const prospect = await this.deps.prospectService.getById(session.prospectId);
      if (!prospect) {
        continue;
      }

      entries.push({
        experience_session_id: session.experienceSessionId,
        prospect_name: prospect.fullName,
        business_name: prospect.businessName,
        email: prospect.email,
        phone_number: prospect.phoneNumber,
        industry: prospect.industry,
        experience_definition_id: session.experienceDefinitionId,
        state: mapSessionStateToApiState(session.state),
        started_at: session.startedAt,
        completed_at: session.completedAt,
        timeline: await this.buildSessionTimeline(session),
      });
    }

    return entries;
  }

  async getPlatformHealth(): Promise<PlatformHealthResponse> {
    const components: PlatformHealthComponent[] = [
      {
        component: 'demo-api-bff',
        status: 'healthy',
        message: 'BFF is running',
      },
      {
        component: 'experience-engine',
        status: 'healthy',
        message: 'Experience engine persistence available',
      },
      {
        component: 'workflow-orchestrator',
        status: 'healthy',
        message: 'Workflow orchestrator embedded in BFF',
      },
      {
        component: 'analytics',
        status: 'healthy',
        message: 'Analytics event pipeline available',
      },
      {
        component: 'mock-leadboard-client',
        status: this.deps.leadBoardClient instanceof MockLeadBoardClient ? 'healthy' : 'degraded',
        message:
          this.deps.leadBoardClient instanceof MockLeadBoardClient
            ? 'MockLeadBoardClient active'
            : 'Real LeadBoard client configured',
      },
      {
        component: 'discovery-booking',
        status: 'healthy',
        message: 'Mock discovery booking service available',
      },
    ];

    return {
      components,
      generated_at: new Date().toISOString(),
    };
  }

  async retryIncident(incidentId: string): Promise<OpsActionResult> {
    this.handledIncidents.add(incidentId);
    return {
      incident_id: incidentId,
      status: 'accepted',
      message: 'Retry action queued for operations review.',
    };
  }

  async cleanupIncident(incidentId: string): Promise<OpsActionResult> {
    this.handledIncidents.add(incidentId);
    return {
      incident_id: incidentId,
      status: 'accepted',
      message: 'Cleanup action queued for operations review.',
    };
  }

  getFunnelReport() {
    return this.deps.analyticsService.getFunnelReport();
  }

  getIndustryDemandReport() {
    return this.deps.analyticsService.getIndustryDemandReport();
  }

  private async buildSessionTimeline(session: ExperienceSession): Promise<readonly SessionTimelineEvent[]> {
    const sessionEvents = await this.deps.analyticsService.listEventsForSession(
      session.experienceSessionId,
    );

    const timeline: SessionTimelineEvent[] = sessionEvents.map((event) => ({
      event_name: event.eventName,
      occurred_at: event.occurredAt,
      label: event.eventName.replace('.', ' '),
    }));

    timeline.unshift({
      event_name: 'session.created',
      occurred_at: session.startedAt,
      label: `Session created in ${session.state}`,
    });

    return timeline;
  }
}

function computeElapsedSeconds(startedAt: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
}

function priorityWeight(priority: OpsIncident['priority']): number {
  switch (priority) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    default:
      return 1;
  }
}
