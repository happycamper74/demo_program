export type LeadBoardAdapterMode = 'mock' | 'real';

export type DemoSessionMirrorStatus = 'active' | 'lead_bound' | 'expired' | 'purged';

export type DemoProcessingState =
  | 'waiting_for_call'
  | 'call_received'
  | 'transcript_stored'
  | 'lead_created'
  | 'summary_ready'
  | 'lead_ready'
  | 'purged';

export interface CreateDemoSessionMirrorRequest {
  readonly experienceSessionId: string;
  readonly prospectPhoneE164: string;
  readonly experienceDefinitionId: string;
  readonly sharedDemoOrgId: string;
  readonly expiresAt: string;
}

export interface CreateDemoSessionMirrorResponse {
  readonly leadboardDemoSessionId: string;
  readonly status: 'active';
  readonly sharedDemoPhoneNumber?: string;
}

export interface DemoSessionStatusResponse {
  readonly leadboardDemoSessionId: string;
  readonly experienceSessionId: string;
  readonly status: DemoSessionMirrorStatus;
  readonly leadId: string | null;
  readonly callSid: string | null;
  readonly processingState: DemoProcessingState;
}

export interface BindIncomingCallRequest {
  readonly experienceSessionId: string;
  readonly callerPhoneE164: string;
  readonly callSid?: string;
}

export interface LeadBoardProcessingEvent {
  readonly eventName: string;
  readonly occurredAt: string;
  readonly experienceSessionId: string;
  readonly leadboardDemoSessionId: string;
  readonly payload: Record<string, unknown>;
}

export interface BindIncomingCallResponse {
  readonly leadboardDemoSessionId: string;
  readonly experienceSessionId: string;
  readonly callSid: string;
  readonly leadId: string;
  readonly status: 'lead_bound';
  readonly processingState: DemoProcessingState;
  readonly processingEvents: readonly LeadBoardProcessingEvent[];
}

export interface RestrictedLeadHeader {
  readonly leadId: string;
  readonly businessName: string;
  readonly contactName: string;
  readonly phoneNumber: string;
  readonly industry: string;
}

export interface RestrictedLeadTranscriptEntry {
  readonly speaker: 'agent' | 'caller';
  readonly text: string;
  readonly timestamp: string;
}

export interface RestrictedLeadTimelineEntry {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly occurredAt: string;
}

export interface RestrictedLeadViewData {
  readonly header: RestrictedLeadHeader;
  readonly transcript: readonly RestrictedLeadTranscriptEntry[];
  readonly summary: string;
  readonly timeline: readonly RestrictedLeadTimelineEntry[];
}

export interface GetRestrictedLeadViewRequest {
  readonly experienceSessionId: string;
  readonly leadboardDemoSessionId: string;
  readonly leadId: string;
}

export interface PurgeTemporaryDemoDataResponse {
  readonly status: 'purged';
  readonly deleted: {
    readonly lead: boolean;
    readonly transcript: boolean;
    readonly summary: boolean;
    readonly timeline: boolean;
    readonly callRecords: boolean;
  };
}

export interface MockLeadBoardClientConfig {
  readonly sharedDemoOrgId?: string;
  readonly sharedDemoPhoneNumber?: string;
}

export interface RealLeadBoardClientConfig {
  readonly baseUrl: string;
  readonly internalApiKey: string;
  readonly fetch?: typeof fetch;
  readonly logger?: import('./leadboard-logging.js').LeadBoardClientLogger;
}

export interface LeadBoardClientConfig {
  readonly mode: LeadBoardAdapterMode;
  readonly sharedDemoOrgId: string;
  readonly sharedDemoPhoneNumber: string;
  readonly mock?: MockLeadBoardClientConfig;
  readonly real?: RealLeadBoardClientConfig;
}
