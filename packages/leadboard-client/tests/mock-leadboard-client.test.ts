import { describe, expect, it } from 'vitest';
import {
  ActiveCallAlreadyExistsError,
  LeadBoardConfigurationError,
  MockLeadBoardClient,
  PhoneNumberMismatchError,
  RestrictedLeadAccessDeniedError,
  createLeadBoardClient,
  loadLeadBoardClientConfigFromEnv,
} from '../src/index.js';

const mirrorRequest = {
  experienceSessionId: 'expsess_123',
  prospectPhoneE164: '+31612345678',
  experienceDefinitionId: 'expdef_plumbing_demo_v1',
  sharedDemoOrgId: 'org_demo_shared',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

describe('LeadBoard adapter config', () => {
  it('defaults to mock adapter mode', () => {
    const config = loadLeadBoardClientConfigFromEnv({});
    expect(config.mode).toBe('mock');
    expect(config.sharedDemoOrgId).toBe('org_demo_shared');
    expect(config.sharedDemoPhoneNumber).toBe('+31201234567');
    expect(config.mock?.sharedDemoOrgId).toBe('org_demo_shared');
  });

  it('creates a mock client for mock mode', () => {
    const client = createLeadBoardClient({
      mode: 'mock',
      sharedDemoOrgId: 'org_demo_shared',
      sharedDemoPhoneNumber: '+31201234567',
    });
    expect(client).toBeInstanceOf(MockLeadBoardClient);
  });

  it('creates a real client when real config is provided', () => {
    const client = createLeadBoardClient({
      mode: 'real',
      sharedDemoOrgId: '00000000-0000-4000-8000-000000000099',
      sharedDemoPhoneNumber: '+3197010225604',
      real: {
        baseUrl: 'http://localhost:4000',
        internalApiKey: 'test-internal-key',
      },
    });
    expect(client.constructor.name).toBe('RealLeadBoardClient');
  });

  it('fails fast when real mode is missing required config', () => {
    expect(() =>
      createLeadBoardClient({
        mode: 'real',
        sharedDemoOrgId: '00000000-0000-4000-8000-000000000099',
        sharedDemoPhoneNumber: '+3197010225604',
      }),
    ).toThrow(LeadBoardConfigurationError);
  });
});

describe('MockLeadBoardClient', () => {
  it('creates and retrieves a mock demo session mirror', async () => {
    const client = new MockLeadBoardClient();
    const created = await client.createDemoSessionMirror(mirrorRequest);
    const status = await client.getDemoSessionStatus(created.leadboardDemoSessionId);

    expect(created.leadboardDemoSessionId).toMatch(/^lbds_/);
    expect(created.status).toBe('active');
    expect(status.experienceSessionId).toBe(mirrorRequest.experienceSessionId);
    expect(status.leadId).toBeNull();
    expect(status.callSid).toBeNull();
    expect(status.processingState).toBe('waiting_for_call');
  });

  it('binds an incoming call when the phone number matches', async () => {
    const client = new MockLeadBoardClient();
    const created = await client.createDemoSessionMirror(mirrorRequest);

    const bound = await client.bindIncomingCall({
      experienceSessionId: mirrorRequest.experienceSessionId,
      callerPhoneE164: mirrorRequest.prospectPhoneE164,
    });

    expect(bound.status).toBe('lead_bound');
    expect(bound.callSid).toMatch(/^CA/);
    expect(bound.leadId).toMatch(/^lead_/);
    expect(bound.processingEvents.map((event) => event.eventName)).toEqual([
      'leadboard.call_received',
      'leadboard.transcript_ready',
      'leadboard.lead_created',
      'leadboard.summary_ready',
      'leadboard.processing_completed',
    ]);

    const status = await client.getDemoSessionStatus(created.leadboardDemoSessionId);
    expect(status.processingState).toBe('lead_ready');
  });

  it('rejects phone binding when the caller phone does not match', async () => {
    const client = new MockLeadBoardClient();
    await client.createDemoSessionMirror(mirrorRequest);

    await expect(
      client.bindIncomingCall({
        experienceSessionId: mirrorRequest.experienceSessionId,
        callerPhoneE164: '+31600000000',
      }),
    ).rejects.toBeInstanceOf(PhoneNumberMismatchError);
  });

  it('rejects a second active call for the same session', async () => {
    const client = new MockLeadBoardClient();
    await client.createDemoSessionMirror(mirrorRequest);
    await client.bindIncomingCall({
      experienceSessionId: mirrorRequest.experienceSessionId,
      callerPhoneE164: mirrorRequest.prospectPhoneE164,
    });

    await expect(
      client.bindIncomingCall({
        experienceSessionId: mirrorRequest.experienceSessionId,
        callerPhoneE164: mirrorRequest.prospectPhoneE164,
      }),
    ).rejects.toBeInstanceOf(ActiveCallAlreadyExistsError);
  });

  it('returns mock restricted lead view data for the owning session', async () => {
    const client = new MockLeadBoardClient();
    const created = await client.createDemoSessionMirror(mirrorRequest);
    const bound = await client.bindIncomingCall({
      experienceSessionId: mirrorRequest.experienceSessionId,
      callerPhoneE164: mirrorRequest.prospectPhoneE164,
    });

    const leadView = await client.getRestrictedLeadView({
      experienceSessionId: mirrorRequest.experienceSessionId,
      leadboardDemoSessionId: created.leadboardDemoSessionId,
      leadId: bound.leadId,
    });

    expect(leadView.header.leadId).toBe(bound.leadId);
    expect(leadView.transcript.length).toBeGreaterThan(0);
    expect(leadView.summary.length).toBeGreaterThan(0);
    expect(leadView.timeline.length).toBeGreaterThan(0);
  });

  it('blocks cross-session restricted lead access', async () => {
    const client = new MockLeadBoardClient();
    const created = await client.createDemoSessionMirror(mirrorRequest);
    const bound = await client.bindIncomingCall({
      experienceSessionId: mirrorRequest.experienceSessionId,
      callerPhoneE164: mirrorRequest.prospectPhoneE164,
    });

    await expect(
      client.getRestrictedLeadView({
        experienceSessionId: 'expsess_other',
        leadboardDemoSessionId: created.leadboardDemoSessionId,
        leadId: bound.leadId,
      }),
    ).rejects.toBeInstanceOf(RestrictedLeadAccessDeniedError);
  });

  it('purges temporary demo data idempotently', async () => {
    const client = new MockLeadBoardClient();
    const created = await client.createDemoSessionMirror(mirrorRequest);
    await client.bindIncomingCall({
      experienceSessionId: mirrorRequest.experienceSessionId,
      callerPhoneE164: mirrorRequest.prospectPhoneE164,
    });

    const firstPurge = await client.purgeTemporaryDemoData(created.leadboardDemoSessionId);
    const secondPurge = await client.purgeTemporaryDemoData(created.leadboardDemoSessionId);

    expect(firstPurge.status).toBe('purged');
    expect(secondPurge).toEqual(firstPurge);

    const status = await client.getDemoSessionStatus(created.leadboardDemoSessionId);
    expect(status.status).toBe('purged');
    expect(status.leadId).toBeNull();
  });

  it('uses configurable shared demo resources without production org data', () => {
    const client = new MockLeadBoardClient({
      sharedDemoOrgId: 'org_demo_shared',
      sharedDemoPhoneNumber: '+31201234567',
    });

    expect(client.getSharedDemoOrgId()).toBe('org_demo_shared');
    expect(client.getSharedDemoPhoneNumber()).toBe('+31201234567');
    expect(client.getSharedDemoOrgId()).not.toContain('production');
  });
});

describe('LeadBoardClient interface contract', () => {
  it('exposes the required adapter operations', () => {
    const client = new MockLeadBoardClient();

    expect(typeof client.createDemoSessionMirror).toBe('function');
    expect(typeof client.getDemoSessionStatus).toBe('function');
    expect(typeof client.bindIncomingCall).toBe('function');
    expect(typeof client.getRestrictedLeadView).toBe('function');
    expect(typeof client.purgeTemporaryDemoData).toBe('function');
  });
});
