import type { IncomingMessage, ServerResponse } from 'node:http';
import { DemoApiError, internalError } from '../../domain/api-errors.js';
import type { OpsService } from '../../application/ops-service.js';
import type { AnalyticsService } from '@experience-platform/analytics-core';
import type { AnalyticsEventName } from '@experience-platform/analytics-core';
import {
  createRequestContext,
  readJsonBody,
  sendError,
  sendJson,
} from '../../infrastructure/http/http-utils.js';
import { authorizeOpsRequest } from '../../infrastructure/ops-auth.js';
import { logUnhandledRequestError } from '../../infrastructure/http/unhandled-request-error.js';

const OPS_PREFIX = '/api/ops/v1';

export interface OpsRouterDependencies {
  readonly opsService: OpsService;
  readonly analyticsService: AnalyticsService;
}

export async function handleOpsApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: OpsRouterDependencies,
): Promise<boolean> {
  const context = createRequestContext(req);

  if (!context.pathname.startsWith(OPS_PREFIX)) {
    return false;
  }

  try {
    authorizeOpsRequest(req);

    if (context.method === 'GET' && context.pathname === `${OPS_PREFIX}/actions`) {
      const incidents = await deps.opsService.listActionableIncidents();
      sendJson(res, 200, { incidents }, context.requestId);
      return true;
    }

    const retryMatch = context.pathname.match(/^\/api\/ops\/v1\/actions\/([^/]+)\/retry$/);
    if (context.method === 'POST' && retryMatch) {
      const incidentId = decodeURIComponent(retryMatch[1] ?? '');
      const result = await deps.opsService.retryIncident(incidentId);
      sendJson(res, 200, result, context.requestId);
      return true;
    }

    const cleanupMatch = context.pathname.match(/^\/api\/ops\/v1\/actions\/([^/]+)\/cleanup$/);
    if (context.method === 'POST' && cleanupMatch) {
      const incidentId = decodeURIComponent(cleanupMatch[1] ?? '');
      const result = await deps.opsService.cleanupIncident(incidentId);
      sendJson(res, 200, result, context.requestId);
      return true;
    }

    if (context.method === 'GET' && context.pathname === `${OPS_PREFIX}/sessions/live`) {
      const sessions = await deps.opsService.listLiveSessions();
      sendJson(res, 200, { sessions }, context.requestId);
      return true;
    }

    if (context.method === 'GET' && context.pathname === `${OPS_PREFIX}/sessions/history`) {
      const url = new URL(context.url, 'http://localhost');
      const filters = {
        prospect_name: url.searchParams.get('prospect_name') ?? undefined,
        business_name: url.searchParams.get('business_name') ?? undefined,
        email: url.searchParams.get('email') ?? undefined,
        phone: url.searchParams.get('phone') ?? undefined,
        industry: url.searchParams.get('industry') ?? undefined,
        experience_session_id: url.searchParams.get('experience_session_id') ?? undefined,
        started_after: url.searchParams.get('started_after') ?? undefined,
        started_before: url.searchParams.get('started_before') ?? undefined,
      };
      const sessions = await deps.opsService.searchSessionHistory(filters);
      sendJson(res, 200, { sessions }, context.requestId);
      return true;
    }

    if (context.method === 'GET' && context.pathname === `${OPS_PREFIX}/health`) {
      const health = await deps.opsService.getPlatformHealth();
      sendJson(res, 200, health, context.requestId);
      return true;
    }

    if (context.method === 'GET' && context.pathname === `${OPS_PREFIX}/reports/funnel`) {
      const report = await deps.opsService.getFunnelReport();
      sendJson(res, 200, report, context.requestId);
      return true;
    }

    if (context.method === 'GET' && context.pathname === `${OPS_PREFIX}/reports/industry-demand`) {
      const report = await deps.opsService.getIndustryDemandReport();
      sendJson(res, 200, report, context.requestId);
      return true;
    }

    if (context.method === 'POST' && context.pathname === `${OPS_PREFIX}/analytics/events`) {
      const body = await readJsonBody<{
        event_name: AnalyticsEventName;
        experience_session_id?: string;
        prospect_id?: string;
        industry?: string;
        payload?: Record<string, unknown>;
      }>(req);

      const recorded = await deps.analyticsService.recordEvent({
        eventName: body.event_name,
        experienceSessionId: body.experience_session_id ?? null,
        prospectId: body.prospect_id ?? null,
        industry: body.industry ?? null,
        payload: body.payload,
      });

      sendJson(res, 201, recorded, context.requestId);
      return true;
    }

    res.writeHead(404).end();
    return true;
  } catch (error) {
    if (error instanceof DemoApiError) {
      sendError(res, error, context.requestId);
      return true;
    }

    logUnhandledRequestError(context, error);
    sendError(res, internalError(), context.requestId);
    return true;
  }
}
