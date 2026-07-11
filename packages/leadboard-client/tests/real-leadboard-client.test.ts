import { describe, expect, it, vi } from 'vitest';
import {
  BindIncomingCallUnsupportedError,
  DemoSessionMirrorNotFoundError,
  LeadBoardApiError,
  LeadBoardConfigurationError,
  RealLeadBoardClient,
  RestrictedLeadAccessDeniedError,
  RestrictedLeadNotReadyError,
  createLeadBoardClient,
  loadLeadBoardClientConfigFromEnv,
} from '../src/index.js';
import { redactHeaders } from '../src/leadboard-logging.js';

const mirrorRequest = {
  experienceSessionId: 'expsess_real_123',
  prospectPhoneE164: '+31612345678',
  experienceDefinitionId: 'expdef_plumbing_demo_v1',
  sharedDemoOrgId: '00000000-0000-4000-8000-000000000099',
  expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

const baseUrl = 'https://leadboard.example';
const internalApiKey = 'server-only-internal-api-key';

function createMockFetch(handlers: Record<string, () => Response>): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const key = `${method} ${url}`;
    const handler = handlers[key];
    if (!handler) {
      throw new Error(`Unexpected fetch: ${key}`);
    }
    return handler();
  }) as typeof fetch;
}

describe('LeadBoard real adapter config', () => {
  it('loads real mode from environment', () => {
    const config = loadLeadBoardClientConfigFromEnv({
      LEADBOARD_ADAPTER_MODE: 'real',
      LEADBOARD_BASE_URL: 'http://localhost:4000',
      LEADBOARD_INTERNAL_API_KEY: 'secret-key',
      LEADBOARD_SHARED_DEMO_ORG_ID: mirrorRequest.sharedDemoOrgId,
      LEADBOARD_SHARED_DEMO_PHONE_NUMBER: '+3197010225604',
    });

    expect(config.mode).toBe('real');
    expect(config.sharedDemoOrgId).toBe(mirrorRequest.sharedDemoOrgId);
    expect(config.sharedDemoPhoneNumber).toBe('+3197010225604');
    expect(config.real).toEqual({
      baseUrl: 'http://localhost:4000',
      internalApiKey: 'secret-key',
    });
  });

  it('fails fast when real mode shared demo org id is not a UUID', () => {
    expect(() =>
      loadLeadBoardClientConfigFromEnv({
        LEADBOARD_ADAPTER_MODE: 'real',
        LEADBOARD_BASE_URL: 'http://localhost:4000',
        LEADBOARD_INTERNAL_API_KEY: 'secret-key',
        LEADBOARD_SHARED_DEMO_ORG_ID: 'org_demo_shared',
      }),
    ).toThrow(LeadBoardConfigurationError);
  });

  it('fails fast when real mode is missing base URL', () => {
    expect(() =>
      createLeadBoardClient({
        mode: 'real',
        sharedDemoOrgId: mirrorRequest.sharedDemoOrgId,
        sharedDemoPhoneNumber: '+3197010225604',
        real: { baseUrl: '', internalApiKey: 'secret-key' },
      }),
    ).toThrow(LeadBoardConfigurationError);
  });

  it('fails fast when real mode is missing API key', () => {
    expect(() =>
      createLeadBoardClient({
        mode: 'real',
        sharedDemoOrgId: mirrorRequest.sharedDemoOrgId,
        sharedDemoPhoneNumber: '+3197010225604',
        real: { baseUrl: 'http://localhost:4000', internalApiKey: '' },
      }),
    ).toThrow(LeadBoardConfigurationError);
  });

  it('creates RealLeadBoardClient for real mode', () => {
    const client = createLeadBoardClient({
      mode: 'real',
      sharedDemoOrgId: mirrorRequest.sharedDemoOrgId,
      sharedDemoPhoneNumber: '+3197010225604',
      real: { baseUrl, internalApiKey },
    });
    expect(client).toBeInstanceOf(RealLeadBoardClient);
  });
});

describe('RealLeadBoardClient', () => {
  it('maps shared_demo_phone_number from create session response', async () => {
    const fetchMock = createMockFetch({
      [`POST ${baseUrl}/internal/leadboard-demo/v1/sessions`]: () =>
        new Response(
          JSON.stringify({
            leadboard_demo_session_id: '11111111-1111-4111-8111-111111111111',
            status: 'active',
            shared_demo_phone_number: '+3197010225604',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    const client = new RealLeadBoardClient({
      baseUrl,
      internalApiKey,
      fetch: fetchMock,
    });

    const created = await client.createDemoSessionMirror(mirrorRequest);
    expect(created.sharedDemoPhoneNumber).toBe('+3197010225604');
  });

  it('creates a demo session mirror with internal auth headers', async () => {
    const fetchMock = createMockFetch({
      [`POST ${baseUrl}/internal/leadboard-demo/v1/sessions`]: () =>
        new Response(
          JSON.stringify({
            leadboard_demo_session_id: '11111111-1111-4111-8111-111111111111',
            status: 'active',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    const client = new RealLeadBoardClient({
      baseUrl,
      internalApiKey,
      fetch: fetchMock,
    });

    const created = await client.createDemoSessionMirror(mirrorRequest);

    expect(created).toEqual({
      leadboardDemoSessionId: '11111111-1111-4111-8111-111111111111',
      status: 'active',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = vi.mocked(fetchMock).mock.calls[0]!;
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${internalApiKey}`);
    expect(headers['X-Leadboard-Demo-Internal-Key']).toBe(internalApiKey);
    expect(JSON.parse(String(init?.body))).toEqual({
      experience_session_id: mirrorRequest.experienceSessionId,
      prospect_phone_e164: mirrorRequest.prospectPhoneE164,
      experience_definition_id: mirrorRequest.experienceDefinitionId,
      shared_demo_org_id: mirrorRequest.sharedDemoOrgId,
      expires_at: mirrorRequest.expiresAt,
    });
  });

  it('maps session status responses', async () => {
    const sessionId = '22222222-2222-4222-8222-222222222222';
    const fetchMock = createMockFetch({
      [`GET ${baseUrl}/internal/leadboard-demo/v1/sessions/${sessionId}`]: () =>
        new Response(
          JSON.stringify({
            leadboard_demo_session_id: sessionId,
            experience_session_id: mirrorRequest.experienceSessionId,
            status: 'lead_bound',
            lead_id: '33333333-3333-4333-8333-333333333333',
            call_sid: 'CA123',
            processing_state: 'transcript_stored',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    const client = new RealLeadBoardClient({ baseUrl, internalApiKey, fetch: fetchMock });
    const status = await client.getDemoSessionStatus(sessionId);

    expect(status).toEqual({
      leadboardDemoSessionId: sessionId,
      experienceSessionId: mirrorRequest.experienceSessionId,
      status: 'lead_bound',
      leadId: '33333333-3333-4333-8333-333333333333',
      callSid: 'CA123',
      processingState: 'transcript_stored',
    });
  });

  it('maps restricted lead view responses', async () => {
    const sessionId = '44444444-4444-4444-8444-444444444444';
    const leadId = '55555555-5555-4555-8555-555555555555';
    const fetchMock = createMockFetch({
      [`GET ${baseUrl}/internal/leadboard-demo/v1/sessions/${sessionId}/lead-view`]: () =>
        new Response(
          JSON.stringify({
            leadboard_demo_session_id: sessionId,
            experience_session_id: mirrorRequest.experienceSessionId,
            processing_state: 'summary_ready',
            header: {
              lead_id: leadId,
              business_name: 'Shared Demo Plumbing Co',
              contact_name: 'Alex Caller',
              phone_number: '+31612345678',
              industry: 'plumber',
            },
            transcript: [{ speaker: 'caller', text: 'Need help', timestamp: '2026-07-09T12:00:00.000Z' }],
            summary: 'Caller needs plumbing help.',
            timeline: [
              {
                id: 'timeline-1',
                title: 'Call received',
                description: 'Inbound demo call connected.',
                occurred_at: '2026-07-09T12:01:00.000Z',
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    const client = new RealLeadBoardClient({ baseUrl, internalApiKey, fetch: fetchMock });
    const leadView = await client.getRestrictedLeadView({
      experienceSessionId: mirrorRequest.experienceSessionId,
      leadboardDemoSessionId: sessionId,
      leadId,
    });

    expect(leadView.header.leadId).toBe(leadId);
    expect(leadView.summary).toBe('Caller needs plumbing help.');
    expect(leadView.transcript[0]?.speaker).toBe('caller');
    expect(leadView.timeline[0]?.title).toBe('Call received');
  });

  it('maps purge responses', async () => {
    const sessionId = '66666666-6666-4666-8666-666666666666';
    const fetchMock = createMockFetch({
      [`POST ${baseUrl}/internal/leadboard-demo/v1/sessions/${sessionId}/purge`]: () =>
        new Response(
          JSON.stringify({
            status: 'purged',
            deleted: {
              lead: true,
              transcript: true,
              summary: true,
              timeline: true,
              call_records: true,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    const client = new RealLeadBoardClient({ baseUrl, internalApiKey, fetch: fetchMock });
    const purge = await client.purgeTemporaryDemoData(sessionId);

    expect(purge).toEqual({
      status: 'purged',
      deleted: {
        lead: true,
        transcript: true,
        summary: true,
        timeline: true,
        callRecords: true,
      },
    });
  });

  it('rejects bindIncomingCall in real mode', async () => {
    const client = new RealLeadBoardClient({ baseUrl, internalApiKey, fetch: vi.fn() });

    await expect(
      client.bindIncomingCall({
        experienceSessionId: mirrorRequest.experienceSessionId,
        callerPhoneE164: mirrorRequest.prospectPhoneE164,
      }),
    ).rejects.toBeInstanceOf(BindIncomingCallUnsupportedError);
  });

  it('maps LeadBoard NOT_FOUND errors to typed adapter errors', async () => {
    const sessionId = '77777777-7777-4777-8777-777777777777';
    const fetchMock = createMockFetch({
      [`GET ${baseUrl}/internal/leadboard-demo/v1/sessions/${sessionId}`]: () =>
        new Response(
          JSON.stringify({
            error: { code: 'NOT_FOUND', message: 'Demo session mirror was not found' },
          }),
          { status: 404, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    const client = new RealLeadBoardClient({ baseUrl, internalApiKey, fetch: fetchMock });

    await expect(client.getDemoSessionStatus(sessionId)).rejects.toBeInstanceOf(
      DemoSessionMirrorNotFoundError,
    );
  });

  it('maps LEAD_NOT_READY errors for lead view', async () => {
    const sessionId = '88888888-8888-4888-8888-888888888888';
    const leadId = '99999999-9999-4999-8999-999999999999';
    const fetchMock = createMockFetch({
      [`GET ${baseUrl}/internal/leadboard-demo/v1/sessions/${sessionId}/lead-view`]: () =>
        new Response(
          JSON.stringify({
            error: { code: 'LEAD_NOT_READY', message: 'Lead view is not ready for this demo session' },
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    const client = new RealLeadBoardClient({ baseUrl, internalApiKey, fetch: fetchMock });

    await expect(
      client.getRestrictedLeadView({
        experienceSessionId: mirrorRequest.experienceSessionId,
        leadboardDemoSessionId: sessionId,
        leadId,
      }),
    ).rejects.toBeInstanceOf(RestrictedLeadNotReadyError);
  });

  it('maps unknown LeadBoard errors to LeadBoardApiError', async () => {
    const fetchMock = createMockFetch({
      [`POST ${baseUrl}/internal/leadboard-demo/v1/sessions`]: () =>
        new Response(
          JSON.stringify({
            error: { code: 'DUPLICATE_EXPERIENCE_SESSION', message: 'Already exists' },
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    const client = new RealLeadBoardClient({ baseUrl, internalApiKey, fetch: fetchMock });

    await expect(client.createDemoSessionMirror(mirrorRequest)).rejects.toMatchObject({
      name: 'LeadBoardApiError',
      code: 'DUPLICATE_EXPERIENCE_SESSION',
      status: 409,
    } satisfies Partial<LeadBoardApiError>);
  });

  it('blocks cross-session restricted lead access after response mapping', async () => {
    const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const leadId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const fetchMock = createMockFetch({
      [`GET ${baseUrl}/internal/leadboard-demo/v1/sessions/${sessionId}/lead-view`]: () =>
        new Response(
          JSON.stringify({
            leadboard_demo_session_id: sessionId,
            experience_session_id: 'expsess_other',
            processing_state: 'lead_ready',
            header: {
              lead_id: leadId,
              business_name: 'Shared Demo Plumbing Co',
              contact_name: 'Alex Caller',
              phone_number: '+31612345678',
              industry: 'plumber',
            },
            transcript: [],
            summary: 'Summary',
            timeline: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    const client = new RealLeadBoardClient({ baseUrl, internalApiKey, fetch: fetchMock });

    await expect(
      client.getRestrictedLeadView({
        experienceSessionId: mirrorRequest.experienceSessionId,
        leadboardDemoSessionId: sessionId,
        leadId,
      }),
    ).rejects.toBeInstanceOf(RestrictedLeadAccessDeniedError);
  });

  it('redacts secrets from logged headers', () => {
    const redacted = redactHeaders({
      Authorization: 'Bearer secret-key',
      'X-Leadboard-Demo-Internal-Key': 'secret-key',
      Accept: 'application/json',
    });

    expect(redacted.Authorization).toBe('[REDACTED]');
    expect(redacted['X-Leadboard-Demo-Internal-Key']).toBe('[REDACTED]');
    expect(redacted.Accept).toBe('application/json');
    expect(JSON.stringify(redacted)).not.toContain('secret-key');
  });

  it('does not log API keys through debug logger payloads', async () => {
    const debug = vi.fn();
    const fetchMock = createMockFetch({
      [`POST ${baseUrl}/internal/leadboard-demo/v1/sessions`]: () =>
        new Response(
          JSON.stringify({
            leadboard_demo_session_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            status: 'active',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    const client = new RealLeadBoardClient({
      baseUrl,
      internalApiKey,
      fetch: fetchMock,
      logger: { debug },
    });

    await client.createDemoSessionMirror(mirrorRequest);

    expect(debug).toHaveBeenCalled();
    const payload = JSON.stringify(debug.mock.calls);
    expect(payload).not.toContain(internalApiKey);
    expect(payload).toContain('[REDACTED]');
  });
});
