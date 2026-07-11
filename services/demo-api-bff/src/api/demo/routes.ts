import type { IncomingMessage, ServerResponse } from 'node:http';
import { DemoApiError, internalError, waitlistEmailExists } from '../../domain/api-errors.js';
import type { DemoService } from '../../application/demo-service.js';
import { WaitlistEmailExistsError } from '@experience-platform/experience-engine/experience-waitlist';
import type { SessionEventStream } from '../../infrastructure/events/session-event-stream.js';
import {
  createRequestContext,
  readJsonBody,
  sendError,
  sendJson,
  sendSseEvent,
} from '../../infrastructure/http/http-utils.js';
import { resolveClientIp } from '../../infrastructure/http/client-ip.js';
import { logUnhandledRequestError } from '../../infrastructure/http/unhandled-request-error.js';
import type { RecoverSessionRequest, StartDemoRequest, PresentationEvent, BookDiscoveryApiRequest } from '../../types/api.js';
import { WAITLIST_SUCCESS_MESSAGE } from '../../types/api.js';
import { isPresentationSafeEventName } from '../../application/presentation-event-mapper.js';

const API_PREFIX = '/api/demo/v1';

export interface DemoApiRouterDependencies {
  readonly demoService: DemoService;
  readonly sessionEventStream: SessionEventStream;
}

export async function handleDemoApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: DemoApiRouterDependencies,
): Promise<boolean> {
  const context = createRequestContext(req);

  try {
    if (context.method === 'POST' && context.pathname === `${API_PREFIX}/start`) {
      const body = await readJsonBody<StartDemoRequest>(req);
      const outcome = await deps.demoService.startDemo(body, {
        requestId: context.requestId,
        clientIp: resolveClientIp(req),
      });
      if (outcome.kind === 'started') {
        sendJson(res, 200, outcome.response, context.requestId);
      } else {
        sendJson(
          res,
          201,
          {
            status: 'waitlisted',
            country_name: outcome.countryName,
            message: WAITLIST_SUCCESS_MESSAGE,
          },
          context.requestId,
        );
      }
      return true;
    }

    const statusMatch = context.pathname.match(
      /^\/api\/demo\/v1\/sessions\/([^/]+)\/status$/,
    );
    if (context.method === 'GET' && statusMatch) {
      const experienceSessionId = decodeURIComponent(statusMatch[1] ?? '');
      const claims = await deps.demoService.authorizeSessionRequest(
        experienceSessionId,
        context.authorization,
      );
      const response = await deps.demoService.getSessionStatus(experienceSessionId, claims);
      sendJson(res, 200, response, context.requestId);
      return true;
    }

    const recoverMatch = context.pathname.match(
      /^\/api\/demo\/v1\/sessions\/([^/]+)\/recover$/,
    );
    if (context.method === 'POST' && recoverMatch) {
      const experienceSessionId = decodeURIComponent(recoverMatch[1] ?? '');
      const body = await readJsonBody<RecoverSessionRequest>(req);
      const response = await deps.demoService.recoverSession(experienceSessionId, body);
      sendJson(res, 200, response, context.requestId);
      return true;
    }

    const eventsMatch = context.pathname.match(
      /^\/api\/demo\/v1\/sessions\/([^/]+)\/events$/,
    );
    if (context.method === 'GET' && eventsMatch) {
      const experienceSessionId = decodeURIComponent(eventsMatch[1] ?? '');
      const queryToken = extractQueryToken(context.url);
      await deps.demoService.authorizeSessionRequest(
        experienceSessionId,
        context.authorization,
        queryToken ?? undefined,
      );
      await handleSseRequest(res, experienceSessionId, deps, context.requestId);
      return true;
    }

    const leadViewMatch = context.pathname.match(
      /^\/api\/demo\/v1\/sessions\/([^/]+)\/lead-view$/,
    );
    if (context.method === 'GET' && leadViewMatch) {
      const experienceSessionId = decodeURIComponent(leadViewMatch[1] ?? '');
      const claims = await deps.demoService.authorizeSessionRequest(
        experienceSessionId,
        context.authorization,
      );
      const response = await deps.demoService.getRestrictedLeadView(experienceSessionId, claims);
      sendJson(res, 200, response, context.requestId);
      return true;
    }

    const simulateMatch = context.pathname.match(
      /^\/api\/demo\/v1\/sessions\/([^/]+)\/simulate-call$/,
    );
    if (context.method === 'POST' && simulateMatch) {
      const experienceSessionId = decodeURIComponent(simulateMatch[1] ?? '');
      const claims = await deps.demoService.authorizeSessionRequest(
        experienceSessionId,
        context.authorization,
      );
      const response = await deps.demoService.simulateIncomingCall(experienceSessionId, claims);
      sendJson(res, 200, response, context.requestId);
      return true;
    }

    const bookMatch = context.pathname.match(
      /^\/api\/demo\/v1\/sessions\/([^/]+)\/book-discovery$/,
    );
    if (context.method === 'POST' && bookMatch) {
      const experienceSessionId = decodeURIComponent(bookMatch[1] ?? '');
      const claims = await deps.demoService.authorizeSessionRequest(
        experienceSessionId,
        context.authorization,
      );
      const body = await readJsonBody<BookDiscoveryApiRequest>(req);
      const response = await deps.demoService.bookDiscovery(experienceSessionId, claims, body);
      sendJson(res, 200, response, context.requestId);
      return true;
    }

    if (context.method === 'GET' && context.pathname === `${API_PREFIX}/discovery-slots`) {
      const url = new URL(context.url, 'http://localhost');
      const cursor = url.searchParams.get('cursor');
      const response = await deps.demoService.getDiscoverySlots(cursor);
      sendJson(res, 200, response, context.requestId);
      return true;
    }

    if (context.method === 'POST' && context.pathname === `${API_PREFIX}/analytics/events`) {
      const body = await readJsonBody<{
        event_name: import('@experience-platform/analytics-core').AnalyticsEventName;
        experience_session_id?: string;
        prospect_id?: string;
        industry?: string;
        payload?: Record<string, unknown>;
      }>(req);

      await deps.demoService.recordClientAnalytics({
        eventName: body.event_name,
        experienceSessionId: body.experience_session_id ?? null,
        prospectId: body.prospect_id ?? null,
        industry: body.industry ?? null,
        payload: body.payload,
      });

      sendJson(res, 201, { status: 'recorded' }, context.requestId);
      return true;
    }

    return false;
  } catch (error) {
    if (error instanceof DemoApiError) {
      sendError(res, error, context.requestId);
      return true;
    }

    if (error instanceof WaitlistEmailExistsError) {
      sendError(res, waitlistEmailExists(error.message), context.requestId);
      return true;
    }

    logUnhandledRequestError(context, error);
    sendError(res, internalError(), context.requestId);
    return true;
  }
}

async function handleSseRequest(
  res: ServerResponse,
  experienceSessionId: string,
  deps: DemoApiRouterDependencies,
  requestId: string,
): Promise<void> {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Request-Id': requestId,
  });

  const initialEvents = await deps.demoService.buildInitialSseEvents(experienceSessionId);
  for (const event of initialEvents) {
    if (!isPresentationSafeEventName(event.event)) {
      continue;
    }

    sendSseEvent(res, event.event, event.data);
  }

  const unsubscribe = deps.sessionEventStream.subscribe(experienceSessionId, (event: PresentationEvent) => {
    if (!isPresentationSafeEventName(event.event)) {
      return;
    }

    sendSseEvent(res, event.event, event.data);
  });

  reqOnClose(res, unsubscribe);
}

function reqOnClose(res: ServerResponse, unsubscribe: () => void): void {
  res.on('close', () => {
    unsubscribe();
  });
}

function extractQueryToken(url: string): string | null {
  const queryIndex = url.indexOf('?');
  if (queryIndex === -1) {
    return null;
  }

  const params = new URLSearchParams(url.slice(queryIndex + 1));
  return params.get('token');
}
