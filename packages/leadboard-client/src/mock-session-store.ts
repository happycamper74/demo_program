import { randomUUID } from 'node:crypto';
import type {
  DemoProcessingState,
  DemoSessionMirrorStatus,
  RestrictedLeadViewData,
} from './types.js';

export interface DemoSessionMirrorRecord {
  leadboardDemoSessionId: string;
  experienceSessionId: string;
  experienceDefinitionId: string;
  prospectPhoneE164: string;
  sharedDemoOrgId: string;
  expiresAt: string;
  status: DemoSessionMirrorStatus;
  leadId: string | null;
  callSid: string | null;
  processingState: DemoProcessingState;
  leadData: RestrictedLeadViewData | null;
  purgedArtifacts: boolean;
}

export function buildLeadboardDemoSessionId(): string {
  return `lbds_${randomUUID()}`;
}

export function buildLeadId(): string {
  return `lead_${randomUUID()}`;
}

export function buildCallSid(): string {
  return `CA${randomUUID().replace(/-/g, '').slice(0, 32)}`;
}

export class MockSessionStore {
  private readonly mirrorsByLeadboardId = new Map<string, DemoSessionMirrorRecord>();
  private readonly mirrorsByExperienceSessionId = new Map<string, DemoSessionMirrorRecord>();

  create(record: DemoSessionMirrorRecord): DemoSessionMirrorRecord {
    this.mirrorsByLeadboardId.set(record.leadboardDemoSessionId, record);
    this.mirrorsByExperienceSessionId.set(record.experienceSessionId, record);
    return record;
  }

  update(record: DemoSessionMirrorRecord): DemoSessionMirrorRecord {
    this.mirrorsByLeadboardId.set(record.leadboardDemoSessionId, record);
    this.mirrorsByExperienceSessionId.set(record.experienceSessionId, record);
    return record;
  }

  findByLeadboardDemoSessionId(leadboardDemoSessionId: string): DemoSessionMirrorRecord | null {
    return this.mirrorsByLeadboardId.get(leadboardDemoSessionId) ?? null;
  }

  findByExperienceSessionId(experienceSessionId: string): DemoSessionMirrorRecord | null {
    return this.mirrorsByExperienceSessionId.get(experienceSessionId) ?? null;
  }
}
