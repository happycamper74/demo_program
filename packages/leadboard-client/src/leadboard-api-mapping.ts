import type {
  CreateDemoSessionMirrorRequest,
  DemoProcessingState,
  DemoSessionMirrorStatus,
  DemoSessionStatusResponse,
  PurgeTemporaryDemoDataResponse,
  RestrictedLeadViewData,
} from './types.js';

export type LeadBoardApiErrorBody = {
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
  };
};

export type LeadBoardCreateSessionResponse = {
  readonly leadboard_demo_session_id: string;
  readonly status: 'active';
  readonly shared_demo_phone_number?: string;
};

export type LeadBoardSessionStatusResponse = {
  readonly leadboard_demo_session_id: string;
  readonly experience_session_id: string;
  readonly status: string;
  readonly lead_id: string | null;
  readonly call_sid: string | null;
  readonly processing_state: string | null;
  readonly expires_at?: string;
  readonly is_expired?: boolean;
};

export type LeadBoardLeadViewResponse = {
  readonly leadboard_demo_session_id: string;
  readonly experience_session_id: string;
  readonly processing_state: string | null;
  readonly header: {
    readonly lead_id: string;
    readonly business_name: string;
    readonly contact_name: string;
    readonly phone_number: string;
    readonly industry: string;
  };
  readonly transcript: ReadonlyArray<{
    readonly speaker: 'agent' | 'caller';
    readonly text: string;
    readonly timestamp: string;
  }>;
  readonly summary: string;
  readonly timeline: ReadonlyArray<{
    readonly id: string;
    readonly title: string;
    readonly description: string;
    readonly occurred_at: string;
  }>;
};

export type LeadBoardPurgeResponse = {
  readonly status: 'purged';
  readonly deleted: {
    readonly lead: boolean;
    readonly transcript: boolean;
    readonly summary: boolean;
    readonly timeline: boolean;
    readonly call_records: boolean;
  };
};

const DEMO_PROCESSING_STATES = new Set<DemoProcessingState>([
  'waiting_for_call',
  'call_received',
  'transcript_stored',
  'lead_created',
  'summary_ready',
  'lead_ready',
  'purged',
]);

const DEMO_SESSION_STATUSES = new Set<DemoSessionMirrorStatus>([
  'active',
  'lead_bound',
  'expired',
  'purged',
]);

export function mapCreateSessionRequest(
  request: CreateDemoSessionMirrorRequest,
): Record<string, string> {
  return {
    experience_session_id: request.experienceSessionId,
    prospect_phone_e164: request.prospectPhoneE164,
    experience_definition_id: request.experienceDefinitionId,
    shared_demo_org_id: request.sharedDemoOrgId,
    expires_at: request.expiresAt,
  };
}

export function mapCreateSessionResponse(
  body: LeadBoardCreateSessionResponse,
): { leadboardDemoSessionId: string; status: 'active'; sharedDemoPhoneNumber?: string } {
  return {
    leadboardDemoSessionId: body.leadboard_demo_session_id,
    status: body.status,
    sharedDemoPhoneNumber: body.shared_demo_phone_number,
  };
}

function mapProcessingState(value: string | null | undefined): DemoProcessingState {
  if (value && DEMO_PROCESSING_STATES.has(value as DemoProcessingState)) {
    return value as DemoProcessingState;
  }
  return 'waiting_for_call';
}

function mapSessionStatus(value: string): DemoSessionMirrorStatus {
  if (DEMO_SESSION_STATUSES.has(value as DemoSessionMirrorStatus)) {
    return value as DemoSessionMirrorStatus;
  }
  return 'active';
}

export function mapSessionStatusResponse(
  body: LeadBoardSessionStatusResponse,
): DemoSessionStatusResponse {
  return {
    leadboardDemoSessionId: body.leadboard_demo_session_id,
    experienceSessionId: body.experience_session_id,
    status: mapSessionStatus(body.status),
    leadId: body.lead_id,
    callSid: body.call_sid,
    processingState: mapProcessingState(body.processing_state),
  };
}

export function mapLeadViewResponse(body: LeadBoardLeadViewResponse): RestrictedLeadViewData {
  return {
    header: {
      leadId: body.header.lead_id,
      businessName: body.header.business_name,
      contactName: body.header.contact_name,
      phoneNumber: body.header.phone_number,
      industry: body.header.industry,
    },
    transcript: body.transcript.map((entry) => ({
      speaker: entry.speaker,
      text: entry.text,
      timestamp: entry.timestamp,
    })),
    summary: body.summary,
    timeline: body.timeline.map((entry) => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      occurredAt: entry.occurred_at,
    })),
  };
}

export function mapPurgeResponse(body: LeadBoardPurgeResponse): PurgeTemporaryDemoDataResponse {
  return {
    status: body.status,
    deleted: {
      lead: body.deleted.lead,
      transcript: body.deleted.transcript,
      summary: body.deleted.summary,
      timeline: body.deleted.timeline,
      callRecords: body.deleted.call_records,
    },
  };
}
