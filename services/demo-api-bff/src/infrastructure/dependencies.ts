import {
  createExperienceTokenConfig,
  ExperienceTokenService,
} from '@experience-platform/auth';
import {
  AnalyticsService,
  createAnalyticsDatabase,
  SqliteAnalyticsEventRepository,
} from '@experience-platform/analytics-core';
import { DemoStartGuard } from '@experience-platform/demo-security';
import { MockDiscoveryBookingService } from '@experience-platform/discovery-booking';
import { createLeadBoardClient, loadLeadBoardClientConfigFromEnv } from '@experience-platform/leadboard-client';
import type { LeadBoardAdapterMode, LeadBoardClient } from '@experience-platform/leadboard-client';
import { ExperienceDefinitionService } from '@experience-platform/experience-engine/experience-definitions';
import { ProspectService } from '@experience-platform/experience-engine/experience-prospects';
import {
  ExperienceSessionService,
  SqliteExperienceSessionRepository,
  createDatabase,
} from '@experience-platform/experience-engine/experience-sessions';
import { SqliteExperienceDefinitionRepository } from '@experience-platform/experience-engine/experience-definitions';
import { SqliteProspectRepository } from '@experience-platform/experience-engine/experience-prospects';
import {
  InMemoryEventPublisher,
  WorkflowOrchestrator,
} from '@experience-platform/workflow-orchestrator/orchestrator';
import { DemoService, type DemoServiceDependencies } from '../application/demo-service.js';
import { RealModeStatusPoller } from '../application/real-mode-status-poller.js';
import { OpsService } from '../application/ops-service.js';
import { ensurePlumbingDemoDefinition } from './bootstrap-demo-data.js';
import { BroadcastingEventPublisher } from './events/broadcasting-event-publisher.js';
import { SessionEventStream } from './events/session-event-stream.js';
import { resolveLocalDatabasePath } from './local-paths.js';

export interface DemoApiDependencies {
  readonly demoService: DemoService;
  readonly opsService: OpsService;
  readonly analyticsService: AnalyticsService;
  readonly sessionEventStream: SessionEventStream;
  readonly workflowOrchestrator: WorkflowOrchestrator;
  readonly experienceTokenService: ExperienceTokenService;
  readonly experienceDefinitionService: ExperienceDefinitionService;
  readonly realModeStatusPoller: RealModeStatusPoller | null;
}

const noopLogger = {
  info: () => undefined,
  warn: () => undefined,
};

const DEFAULT_DEMO_DATABASE_PATH = '.data/demo.sqlite';
const DEFAULT_ANALYTICS_DATABASE_PATH = '.data/analytics.sqlite';
const DEFAULT_SIGNING_SECRET = 'local-dev-signing-secret';
const DEFAULT_STATUS_POLL_INTERVAL_MS = 2_000;

function resolveStatusPollIntervalMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.LEADBOARD_STATUS_POLL_INTERVAL_MS;
  if (!raw) {
    return DEFAULT_STATUS_POLL_INTERVAL_MS;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_STATUS_POLL_INTERVAL_MS;
}

export function resolveDemoApiRuntimeOptions(options?: {
  databasePath?: string;
  analyticsDatabasePath?: string;
  signingSecret?: string;
}): {
  databasePath: string;
  analyticsDatabasePath: string;
  signingSecret: string;
} {
  return {
    databasePath: resolveLocalDatabasePath(
      options?.databasePath ?? process.env.DEMO_DATABASE_PATH ?? DEFAULT_DEMO_DATABASE_PATH,
    ),
    analyticsDatabasePath: resolveLocalDatabasePath(
      options?.analyticsDatabasePath ??
        process.env.ANALYTICS_DATABASE_PATH ??
        DEFAULT_ANALYTICS_DATABASE_PATH,
    ),
    signingSecret:
      options?.signingSecret ??
      process.env.EXPERIENCE_TOKEN_SIGNING_SECRET ??
      DEFAULT_SIGNING_SECRET,
  };
}

export function createDemoApiDependencies(options?: {
  databasePath?: string;
  analyticsDatabasePath?: string;
  signingSecret?: string;
  demoStartGuard?: DemoStartGuard;
  leadBoardClient?: LeadBoardClient;
  leadboardAdapterMode?: LeadBoardAdapterMode;
  leadboardSharedDemoOrgId?: string;
  leadboardSharedDemoPhoneNumber?: string;
  statusPollIntervalMs?: number;
}): DemoApiDependencies {
  const runtime = resolveDemoApiRuntimeOptions(options);
  const database = createDatabase({ filePath: runtime.databasePath });
  const analyticsDatabase = createAnalyticsDatabase({
    filePath: runtime.analyticsDatabasePath,
  });
  const logger = noopLogger;
  const sessionEventStream = new SessionEventStream();
  const innerPublisher = new InMemoryEventPublisher();
  const eventPublisher = new BroadcastingEventPublisher(innerPublisher, sessionEventStream);

  const definitionRepository = new SqliteExperienceDefinitionRepository(database);
  const prospectRepository = new SqliteProspectRepository(database);
  const sessionRepository = new SqliteExperienceSessionRepository(database);
  const analyticsRepository = new SqliteAnalyticsEventRepository(analyticsDatabase);
  const analyticsService = new AnalyticsService(analyticsRepository);

  const experienceDefinitionService = new ExperienceDefinitionService(definitionRepository, logger);
  const prospectService = new ProspectService(prospectRepository, logger);
  const experienceSessionService = new ExperienceSessionService(
    sessionRepository,
    prospectRepository,
    definitionRepository,
    logger,
  );
  const workflowOrchestrator = new WorkflowOrchestrator(sessionRepository, eventPublisher, logger);
  const leadboardConfig = loadLeadBoardClientConfigFromEnv();
  const leadboardAdapterMode = options?.leadboardAdapterMode ?? leadboardConfig.mode;
  const leadboardSharedDemoOrgId =
    options?.leadboardSharedDemoOrgId ?? leadboardConfig.sharedDemoOrgId;
  const leadboardSharedDemoPhoneNumber =
    options?.leadboardSharedDemoPhoneNumber ?? leadboardConfig.sharedDemoPhoneNumber;
  const leadBoardClient = options?.leadBoardClient ?? createLeadBoardClient(leadboardConfig);
  const discoveryBookingService = new MockDiscoveryBookingService();
  const demoStartGuard = options?.demoStartGuard ?? new DemoStartGuard();
  const experienceTokenService = new ExperienceTokenService(
    createExperienceTokenConfig(runtime.signingSecret),
    logger,
  );

  const realModeStatusPoller =
    leadboardAdapterMode === 'real'
      ? new RealModeStatusPoller({
          leadBoardClient,
          experienceSessionService,
          prospectService,
          sessionEventStream,
          analyticsService,
          logger,
          pollIntervalMs: options?.statusPollIntervalMs ?? resolveStatusPollIntervalMs(),
        })
      : null;

  const deps: DemoServiceDependencies = {
    prospectService,
    experienceDefinitionService,
    experienceSessionService,
    experienceSessionRepository: sessionRepository,
    workflowOrchestrator,
    leadBoardClient,
    experienceTokenService,
    sessionEventStream,
    discoveryBookingService,
    analyticsService,
    demoStartGuard,
    logger,
    leadboardAdapterMode,
    leadboardSharedDemoOrgId,
    leadboardSharedDemoPhoneNumber,
    realModeStatusPoller,
  };

  const opsService = new OpsService({
    experienceSessionRepository: sessionRepository,
    prospectService,
    experienceDefinitionService,
    leadBoardClient,
    discoveryBookingService,
    analyticsService,
  });

  return {
    demoService: new DemoService(deps),
    opsService,
    analyticsService,
    sessionEventStream,
    workflowOrchestrator,
    experienceTokenService,
    experienceDefinitionService,
    realModeStatusPoller,
  };
}

export async function createInitializedDemoApiDependencies(options?: {
  databasePath?: string;
  analyticsDatabasePath?: string;
  signingSecret?: string;
  demoStartGuard?: DemoStartGuard;
}): Promise<DemoApiDependencies> {
  const dependencies = createDemoApiDependencies(options);
  await ensurePlumbingDemoDefinition(dependencies.experienceDefinitionService);
  return dependencies;
}
