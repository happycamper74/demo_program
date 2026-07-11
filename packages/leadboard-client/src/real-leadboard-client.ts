import type { LeadBoardClient } from './leadboard-client.js';
import { BindIncomingCallUnsupportedError } from './errors.js';
import {
  mapCreateSessionRequest,
  mapCreateSessionResponse,
  mapLeadViewResponse,
  mapPurgeResponse,
  mapSessionStatusResponse,
  type LeadBoardCreateSessionResponse,
  type LeadBoardLeadViewResponse,
  type LeadBoardPurgeResponse,
  type LeadBoardSessionStatusResponse,
} from './leadboard-api-mapping.js';
import { LeadBoardHttpClient } from './leadboard-http.js';
import { RestrictedLeadAccessDeniedError } from './errors.js';
import type {
  BindIncomingCallRequest,
  BindIncomingCallResponse,
  CreateDemoSessionMirrorRequest,
  CreateDemoSessionMirrorResponse,
  DemoSessionStatusResponse,
  GetRestrictedLeadViewRequest,
  PurgeTemporaryDemoDataResponse,
  RealLeadBoardClientConfig,
  RestrictedLeadViewData,
} from './types.js';

const INTERNAL_API_PREFIX = '/internal/leadboard-demo/v1';

export class RealLeadBoardClient implements LeadBoardClient {
  private readonly http: LeadBoardHttpClient;

  constructor(config: RealLeadBoardClientConfig) {
    this.http = new LeadBoardHttpClient({
      baseUrl: config.baseUrl,
      internalApiKey: config.internalApiKey,
      fetchImpl: config.fetch,
      logger: config.logger,
    });
  }

  async createDemoSessionMirror(
    request: CreateDemoSessionMirrorRequest,
  ): Promise<CreateDemoSessionMirrorResponse> {
    const body = await this.http.requestJson<LeadBoardCreateSessionResponse>(
      'POST',
      `${INTERNAL_API_PREFIX}/sessions`,
      { operation: 'createDemoSessionMirror' },
      mapCreateSessionRequest(request),
    );

    return mapCreateSessionResponse(body);
  }

  async getDemoSessionStatus(leadboardDemoSessionId: string): Promise<DemoSessionStatusResponse> {
    const body = await this.http.requestJson<LeadBoardSessionStatusResponse>(
      'GET',
      `${INTERNAL_API_PREFIX}/sessions/${encodeURIComponent(leadboardDemoSessionId)}`,
      {
        operation: 'getDemoSessionStatus',
        leadboardDemoSessionId,
      },
    );

    return mapSessionStatusResponse(body);
  }

  async bindIncomingCall(request: BindIncomingCallRequest): Promise<BindIncomingCallResponse> {
    void request;
    throw new BindIncomingCallUnsupportedError();
  }

  async getRestrictedLeadView(
    request: GetRestrictedLeadViewRequest,
  ): Promise<RestrictedLeadViewData> {
    const body = await this.http.requestJson<LeadBoardLeadViewResponse>(
      'GET',
      `${INTERNAL_API_PREFIX}/sessions/${encodeURIComponent(request.leadboardDemoSessionId)}/lead-view`,
      {
        operation: 'getRestrictedLeadView',
        leadboardDemoSessionId: request.leadboardDemoSessionId,
        leadId: request.leadId,
      },
    );

    if (body.experience_session_id !== request.experienceSessionId) {
      throw new RestrictedLeadAccessDeniedError(
        'Experience token cannot access lead data for a different session',
      );
    }

    if (body.header.lead_id !== request.leadId) {
      throw new RestrictedLeadAccessDeniedError('Lead does not belong to the requested session');
    }

    return mapLeadViewResponse(body);
  }

  async purgeTemporaryDemoData(
    leadboardDemoSessionId: string,
  ): Promise<PurgeTemporaryDemoDataResponse> {
    const body = await this.http.requestJson<LeadBoardPurgeResponse>(
      'POST',
      `${INTERNAL_API_PREFIX}/sessions/${encodeURIComponent(leadboardDemoSessionId)}/purge`,
      {
        operation: 'purgeTemporaryDemoData',
        leadboardDemoSessionId,
      },
    );

    return mapPurgeResponse(body);
  }
}
