import type { LeadBoardClient } from './leadboard-client.js';
import {
  ActiveCallAlreadyExistsError,
  DemoSessionMirrorNotFoundError,
  PhoneNumberMismatchError,
  PurgeOperationFailedError,
  RestrictedLeadAccessDeniedError,
  RestrictedLeadNotReadyError,
} from './errors.js';
import { createMockRestrictedLeadViewData } from './mock-lead-data.js';
import {
  buildCallSid,
  buildLeadboardDemoSessionId,
  buildLeadId,
  MockSessionStore,
} from './mock-session-store.js';
import type {
  BindIncomingCallRequest,
  BindIncomingCallResponse,
  CreateDemoSessionMirrorRequest,
  CreateDemoSessionMirrorResponse,
  DemoSessionStatusResponse,
  GetRestrictedLeadViewRequest,
  LeadBoardProcessingEvent,
  MockLeadBoardClientConfig,
  PurgeTemporaryDemoDataResponse,
  RestrictedLeadViewData,
} from './types.js';

const DEFAULT_SHARED_DEMO_ORG_ID = 'org_demo_shared';
const DEFAULT_SHARED_DEMO_PHONE_NUMBER = '+31201234567';

export class MockLeadBoardClient implements LeadBoardClient {
  private readonly store = new MockSessionStore();
  private readonly sharedDemoOrgId: string;
  private readonly sharedDemoPhoneNumber: string;

  constructor(config: MockLeadBoardClientConfig = {}) {
    this.sharedDemoOrgId = config.sharedDemoOrgId ?? DEFAULT_SHARED_DEMO_ORG_ID;
    this.sharedDemoPhoneNumber = config.sharedDemoPhoneNumber ?? DEFAULT_SHARED_DEMO_PHONE_NUMBER;
  }

  getSharedDemoOrgId(): string {
    return this.sharedDemoOrgId;
  }

  getSharedDemoPhoneNumber(): string {
    return this.sharedDemoPhoneNumber;
  }

  async createDemoSessionMirror(
    request: CreateDemoSessionMirrorRequest,
  ): Promise<CreateDemoSessionMirrorResponse> {
    const record = this.store.create({
      leadboardDemoSessionId: buildLeadboardDemoSessionId(),
      experienceSessionId: request.experienceSessionId,
      experienceDefinitionId: request.experienceDefinitionId,
      prospectPhoneE164: request.prospectPhoneE164,
      sharedDemoOrgId: request.sharedDemoOrgId || this.sharedDemoOrgId,
      expiresAt: request.expiresAt,
      status: 'active',
      leadId: null,
      callSid: null,
      processingState: 'waiting_for_call',
      leadData: null,
      purgedArtifacts: false,
    });

    return {
      leadboardDemoSessionId: record.leadboardDemoSessionId,
      status: 'active',
      sharedDemoPhoneNumber: this.sharedDemoPhoneNumber,
    };
  }

  async getDemoSessionStatus(leadboardDemoSessionId: string): Promise<DemoSessionStatusResponse> {
    const record = this.requireMirrorByLeadboardId(leadboardDemoSessionId);
    return this.toStatusResponse(record);
  }

  async bindIncomingCall(request: BindIncomingCallRequest): Promise<BindIncomingCallResponse> {
    const record = this.requireMirrorByExperienceSessionId(request.experienceSessionId);

    if (record.prospectPhoneE164 !== request.callerPhoneE164) {
      throw new PhoneNumberMismatchError();
    }

    if (record.callSid !== null && record.status !== 'purged') {
      throw new ActiveCallAlreadyExistsError(request.experienceSessionId);
    }

    const now = new Date().toISOString();
    const callSid = request.callSid ?? buildCallSid();
    const leadId = buildLeadId();
    const leadData = createMockRestrictedLeadViewData({
      leadId,
      businessName: "Joe's Plumbing",
      contactName: 'John Smith',
      phoneNumber: record.prospectPhoneE164,
      industry: 'plumbing',
    });

    const processingEvents: LeadBoardProcessingEvent[] = [
      this.createProcessingEvent('leadboard.call_received', record, now, { call_sid: callSid }),
      this.createProcessingEvent('leadboard.transcript_ready', record, now, { lead_id: leadId }),
      this.createProcessingEvent('leadboard.lead_created', record, now, { lead_id: leadId }),
      this.createProcessingEvent('leadboard.summary_ready', record, now, { lead_id: leadId }),
      this.createProcessingEvent('leadboard.processing_completed', record, now, { lead_id: leadId }),
    ];

    const updated = this.store.update({
      ...record,
      status: 'lead_bound',
      callSid,
      leadId,
      processingState: 'lead_ready',
      leadData,
      purgedArtifacts: false,
    });

    return {
      leadboardDemoSessionId: updated.leadboardDemoSessionId,
      experienceSessionId: updated.experienceSessionId,
      callSid,
      leadId,
      status: 'lead_bound',
      processingState: 'lead_ready',
      processingEvents,
    };
  }

  async getRestrictedLeadView(request: GetRestrictedLeadViewRequest): Promise<RestrictedLeadViewData> {
    const record = this.requireMirrorByLeadboardId(request.leadboardDemoSessionId);

    if (record.experienceSessionId !== request.experienceSessionId) {
      throw new RestrictedLeadAccessDeniedError(
        'Experience token cannot access lead data for a different session',
      );
    }

    if (record.leadId !== request.leadId) {
      throw new RestrictedLeadAccessDeniedError('Lead does not belong to the requested session');
    }

    if (!record.leadData || record.purgedArtifacts) {
      throw new RestrictedLeadNotReadyError(request.leadId);
    }

    return record.leadData;
  }

  async purgeTemporaryDemoData(
    leadboardDemoSessionId: string,
  ): Promise<PurgeTemporaryDemoDataResponse> {
    const record = this.requireMirrorByLeadboardId(leadboardDemoSessionId);

    if (record.purgedArtifacts) {
      return {
        status: 'purged',
        deleted: {
          lead: true,
          transcript: true,
          summary: true,
          timeline: true,
          callRecords: true,
        },
      };
    }

    if (record.status === 'active' && record.callSid === null) {
      throw new PurgeOperationFailedError(
        leadboardDemoSessionId,
        'Cannot purge active session before call binding completes',
      );
    }

    this.store.update({
      ...record,
      status: 'purged',
      processingState: 'purged',
      leadData: null,
      purgedArtifacts: true,
      leadId: null,
      callSid: null,
    });

    return {
      status: 'purged',
      deleted: {
        lead: true,
        transcript: true,
        summary: true,
        timeline: true,
        callRecords: true,
      },
    };
  }

  private requireMirrorByLeadboardId(leadboardDemoSessionId: string) {
    const record = this.store.findByLeadboardDemoSessionId(leadboardDemoSessionId);
    if (!record) {
      throw new DemoSessionMirrorNotFoundError(leadboardDemoSessionId);
    }

    return record;
  }

  private requireMirrorByExperienceSessionId(experienceSessionId: string) {
    const record = this.store.findByExperienceSessionId(experienceSessionId);
    if (!record) {
      throw new DemoSessionMirrorNotFoundError(experienceSessionId);
    }

    return record;
  }

  private toStatusResponse(record: {
    leadboardDemoSessionId: string;
    experienceSessionId: string;
    status: DemoSessionStatusResponse['status'];
    leadId: string | null;
    callSid: string | null;
    processingState: DemoSessionStatusResponse['processingState'];
  }): DemoSessionStatusResponse {
    return {
      leadboardDemoSessionId: record.leadboardDemoSessionId,
      experienceSessionId: record.experienceSessionId,
      status: record.status,
      leadId: record.leadId,
      callSid: record.callSid,
      processingState: record.processingState,
    };
  }

  private createProcessingEvent(
    eventName: string,
    record: { experienceSessionId: string; leadboardDemoSessionId: string },
    occurredAt: string,
    payload: Record<string, unknown>,
  ): LeadBoardProcessingEvent {
    return {
      eventName,
      occurredAt,
      experienceSessionId: record.experienceSessionId,
      leadboardDemoSessionId: record.leadboardDemoSessionId,
      payload,
    };
  }
}
