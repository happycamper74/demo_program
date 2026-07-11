import {
  DemoSessionMirrorNotFoundError,
  LeadBoardApiError,
  PurgeOperationFailedError,
  RestrictedLeadAccessDeniedError,
  RestrictedLeadNotReadyError,
} from './errors.js';
import type { LeadBoardApiErrorBody } from './leadboard-api-mapping.js';
import { redactHeaders, redactUrl, type LeadBoardClientLogger } from './leadboard-logging.js';

export type LeadBoardHttpClientOptions = {
  readonly baseUrl: string;
  readonly internalApiKey: string;
  readonly fetchImpl?: typeof fetch;
  readonly logger?: LeadBoardClientLogger;
};

export type LeadBoardRequestContext = {
  readonly operation: string;
  readonly leadId?: string;
  readonly leadboardDemoSessionId?: string;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/u, '');
}

async function readErrorBody(response: Response): Promise<LeadBoardApiErrorBody | null> {
  try {
    return (await response.json()) as LeadBoardApiErrorBody;
  } catch {
    return null;
  }
}

export function mapLeadBoardHttpError(
  response: Response,
  body: LeadBoardApiErrorBody | null,
  context: LeadBoardRequestContext,
): Error {
  const code = body?.error?.code ?? 'LEADBOARD_HTTP_ERROR';
  const message = body?.error?.message ?? `LeadBoard request failed with status ${response.status}`;

  switch (code) {
    case 'NOT_FOUND':
      return new DemoSessionMirrorNotFoundError(
        context.leadboardDemoSessionId ?? context.operation,
      );
    case 'LEAD_NOT_READY':
      return new RestrictedLeadNotReadyError(context.leadId ?? 'unknown');
    case 'FORBIDDEN_ORG':
      return new RestrictedLeadAccessDeniedError(message);
    case 'PURGE_FAILED':
      return new PurgeOperationFailedError(
        context.leadboardDemoSessionId ?? 'unknown',
        message,
      );
    default:
      return new LeadBoardApiError({
        code,
        message,
        status: response.status,
        operation: context.operation,
      });
  }
}

export class LeadBoardHttpClient {
  private readonly baseUrl: string;
  private readonly internalApiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly logger?: LeadBoardClientLogger;

  constructor(options: LeadBoardHttpClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.internalApiKey = options.internalApiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.logger = options.logger;
  }

  async requestJson<T>(
    method: 'GET' | 'POST',
    path: string,
    context: LeadBoardRequestContext,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.internalApiKey}`,
      'X-Leadboard-Demo-Internal-Key': this.internalApiKey,
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    this.logger?.debug?.('LeadBoard HTTP request', {
      operation: context.operation,
      method,
      url: redactUrl(url),
      headers: redactHeaders(headers),
    });

    const response = await this.fetchImpl(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await readErrorBody(response);
      this.logger?.warn?.('LeadBoard HTTP error', {
        operation: context.operation,
        status: response.status,
        code: errorBody?.error?.code ?? 'unknown',
      });
      throw mapLeadBoardHttpError(response, errorBody, context);
    }

    return (await response.json()) as T;
  }
}
