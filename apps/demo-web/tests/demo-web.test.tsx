import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DemoApiClient,
  applyPresentationEvents,
  parseSseChunk,
} from '../src/api/demo-api-client.js';
import { mapDomainEventToPresentationEvents } from '@experience-platform/event-contracts';
import { BookingPage } from '../src/pages/BookingPage.js';
import { containsForbiddenScriptLanguage } from '../src/components/ScenarioGuidance.js';
import { IndustryPage } from '../src/pages/IndustryPage.js';
import { LandingPage } from '../src/pages/LandingPage.js';
import { InstructionsPage } from '../src/pages/InstructionsPage.js';
import { LiveExperiencePage } from '../src/pages/LiveExperiencePage.js';
import { QualificationPage } from '../src/pages/QualificationPage.js';
import { RecoveryPage } from '../src/pages/RecoveryPage.js';
import { validateQualificationForm } from '../src/lib/validation.js';
import { saveBookingConfirmation, saveDemoSession, saveSelectedIndustry } from '../src/lib/session-storage.js';

function renderWithRouter(ui: ReactElement, initialEntries = ['/']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

describe('LandingPage', () => {
  it('renders the landing page with demo explanation and CTA', () => {
    renderWithRouter(<LandingPage />);

    expect(screen.getByText(/real LeadBoard workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/two to three minutes/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start interactive demo/i })).toHaveAttribute(
      'href',
      '/demo/industry',
    );
  });
});

describe('IndustryPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('records industry selection and shows unsupported notice for non-plumbing industries', async () => {
    const user = userEvent.setup();
    renderWithRouter(<IndustryPage />);

    await user.selectOptions(screen.getByLabelText(/your business industry/i), 'electrical');
    expect(screen.getByText(/optimized for plumbing businesses/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(sessionStorage.getItem('leadboard_demo_industry')).toBe('electrical');
  });
});

describe('QualificationPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    saveSelectedIndustry('plumbing');
  });

  it('validates required fields before starting demo', async () => {
    const fetchImpl = vi.fn();
    const client = new DemoApiClient({ fetchImpl });
    const user = userEvent.setup();
    renderWithRouter(<QualificationPage client={client} />, ['/demo/qualify']);

    await user.click(screen.getByRole('button', { name: /^start interactive demo$/i }));

    expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('starts demo on successful submit', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'started',
        prospect_id: 'prospect_1',
        experience_session_id: 'expsess_1',
        experience_version: 'plumbing_demo_v1',
        industry_supported: true,
        session_state: 'waiting_for_call',
        shared_demo_phone_number: '+31201234567',
        experience_token: 'token_123',
        instructions: {
          title: 'Your interactive demo is ready',
          message: 'Call the number below from the phone number you used to register.',
          scenario_examples: ['Blocked kitchen sink'],
        },
      }),
    });

    const client = new DemoApiClient({ fetchImpl });
    const user = userEvent.setup();
    renderWithRouter(<QualificationPage client={client} />, ['/demo/qualify']);

    await user.type(screen.getByLabelText(/full name/i), 'John Smith');
    await user.type(screen.getByLabelText(/business name/i), "Joe's Plumbing");
    await user.type(screen.getByLabelText(/^email$/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '+31612345678');
    await user.type(screen.getByLabelText(/business location/i), 'Amsterdam');
    await user.selectOptions(screen.getByLabelText(/company size/i), '2-5');
    await user.type(screen.getByLabelText(/^website$/i), 'https://example.com');
    await user.selectOptions(screen.getByLabelText(/biggest business challenge/i), 'never_miss_calls');
    await user.selectOptions(screen.getByLabelText(/implementation timeframe/i), 'within_3_months');
    await user.click(screen.getByRole('button', { name: /^start interactive demo$/i }));

    await waitFor(() => {
      expect(fetchImpl).toHaveBeenCalled();
    });
  });
});

describe('validation helpers', () => {
  it('rejects honeypot submissions', () => {
    const result = validateQualificationForm({
      fullName: 'John',
      businessName: 'Biz',
      email: 'john@example.com',
      phoneNumber: '+31612345678',
      industry: 'plumbing',
      businessLocation: 'Amsterdam',
      companySize: '2-5',
      website: 'https://example.com',
      noWebsite: false,
      biggestChallenge: 'never_miss_calls',
      implementationTimeframe: 'within_3_months',
      honeypot: 'spam',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.form).toBeDefined();
  });

  it('supports no website option', () => {
    const result = validateQualificationForm({
      fullName: 'John',
      businessName: 'Biz',
      email: 'john@example.com',
      phoneNumber: '+31612345678',
      industry: 'plumbing',
      businessLocation: 'Amsterdam',
      companySize: '2-5',
      website: '',
      noWebsite: true,
      biggestChallenge: 'never_miss_calls',
      implementationTimeframe: 'within_3_months',
      honeypot: '',
    });

    expect(result.valid).toBe(true);
  });
});

describe('InstructionsPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    saveDemoSession({
      experienceSessionId: 'expsess_1',
      experienceToken: 'token_123',
      prospectId: 'prospect_1',
      sharedDemoPhoneNumber: '+31201234567',
      industry: 'plumbing',
      industrySupported: true,
      scenarioExamples: ['Blocked kitchen sink', 'No hot water'],
      instructionsTitle: 'Your interactive demo is ready',
      instructionsMessage: 'Call the number below from the phone number you used to register.',
    });
  });

  it('shows phone instructions and scenario guidance without a full script', () => {
    renderWithRouter(<InstructionsPage />, ['/demo/instructions']);

    expect(screen.getByLabelText(/shared demo phone number/i)).toHaveTextContent('+31201234567');
    expect(
      screen.getByText(/call from the phone number you registered/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/blocked kitchen sink/i)).toBeInTheDocument();
    expect(screen.getByText(/not a script to read word for word/i)).toBeInTheDocument();
    expect(containsForbiddenScriptLanguage(document.body.textContent ?? '')).toBe(false);
  });
});

describe('LiveExperiencePage SSE progress', () => {
  beforeEach(() => {
    sessionStorage.clear();
    saveDemoSession({
      experienceSessionId: 'expsess_1',
      experienceToken: 'token_123',
      prospectId: 'prospect_1',
      sharedDemoPhoneNumber: '+31201234567',
      industry: 'plumbing',
      industrySupported: true,
      scenarioExamples: ['Blocked kitchen sink'],
      instructionsTitle: 'Ready',
      instructionsMessage: 'Call now',
    });
  });

  it('updates milestones from parsed SSE chunks', () => {
    const events = parseSseChunk(
      'event: call_started\ndata: {"experience_session_id":"expsess_1","label":"Call received","timestamp":"2026-07-08T14:01:00Z"}\n\n',
    );
    const updated = applyPresentationEvents(new Set(['waiting_for_call']), events);
    expect(updated.has('call_started')).toBe(true);
  });

  it('renders progress UI with mocked status', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          experience_session_id: 'expsess_1',
          state: 'waiting_for_call',
          current_step: 'waiting_for_call',
          lead_view_available: false,
          restricted_lead_view_url: null,
          recovery_available: false,
          expires_at: new Date(Date.now() + 600000).toISOString(),
          simulate_call_available: true,
        }),
      });

    class MockEventSource {
      static instances: MockEventSource[] = [];
      url: string;
      onmessage: ((event: MessageEvent) => void) | null = null;
      constructor(url: string) {
        this.url = url;
        MockEventSource.instances.push(this);
      }
      addEventListener() {}
      close() {}
    }

    vi.stubGlobal('EventSource', MockEventSource);

    const client = new DemoApiClient({ fetchImpl });
    renderWithRouter(<LiveExperiencePage client={client} />, ['/demo/live']);

    expect(await screen.findByText(/live demo progress/i)).toBeInTheDocument();
    expect(screen.getByText(/waiting for call/i)).toBeInTheDocument();
    expect(MockEventSource.instances[0]?.url).toContain('token=token_123');
  });

  it('hides simulate-call button in real mode', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        experience_session_id: 'expsess_1',
        state: 'waiting_for_call',
        current_step: 'waiting_for_call',
        lead_view_available: false,
        restricted_lead_view_url: null,
        recovery_available: false,
        expires_at: new Date(Date.now() + 600000).toISOString(),
        simulate_call_available: false,
      }),
    });

    class MockEventSource {
      constructor() {}
      addEventListener() {}
      close() {}
    }

    vi.stubGlobal('EventSource', MockEventSource);

    const client = new DemoApiClient({ fetchImpl });
    renderWithRouter(<LiveExperiencePage client={client} />, ['/demo/live']);

    expect(await screen.findByText(/live demo progress/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /simulate incoming call/i })).not.toBeInTheDocument();
  });
});

describe('RecoveryPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    saveDemoSession({
      experienceSessionId: 'expsess_1',
      experienceToken: 'token_123',
      prospectId: 'prospect_1',
      sharedDemoPhoneNumber: '+31201234567',
      industry: 'plumbing',
      industrySupported: true,
      scenarioExamples: [],
      instructionsTitle: 'Ready',
      instructionsMessage: 'Call now',
    });
  });

  it('renders recovery actions', () => {
    renderWithRouter(<RecoveryPage client={new DemoApiClient({ fetchImpl: vi.fn() })} />, [
      '/demo/recover',
    ]);

    expect(screen.getByText(/recover your demo session/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recover session/i })).toBeInTheDocument();
  });
});

describe('presentation mapping and booking UI', () => {
  beforeEach(() => {
    sessionStorage.clear();
    saveDemoSession({
      experienceSessionId: 'expsess_1',
      experienceToken: 'token_123',
      prospectId: 'prospect_1',
      sharedDemoPhoneNumber: '+31201234567',
      industry: 'plumbing',
      industrySupported: true,
      scenarioExamples: [],
      instructionsTitle: 'Ready',
      instructionsMessage: 'Call now',
    });
  });

  it('maps internal leadboard events to presentation-safe milestones', () => {
    const events = mapDomainEventToPresentationEvents({
      eventId: 'evt_1',
      eventName: 'leadboard.lead_created',
      eventVersion: 1,
      occurredAt: '2026-07-09T10:00:00Z',
      experienceSessionId: 'expsess_1',
      experienceDefinitionId: 'expdef_1',
      prospectId: 'prospect_1',
      payload: {},
    });

    expect(events[0]?.event).toBe('customer_details_ready');
    expect(events[0]?.event).not.toMatch(/^leadboard\./);
  });

  it('renders suggested slots and show more times', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          slots: [{ slot_id: 'slot_1', starts_at: '2026-07-10T09:30:00Z', display: 'Tomorrow 09:30' }],
          next_cursor: '3',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          slots: [{ slot_id: 'slot_2', starts_at: '2026-07-10T14:00:00Z', display: 'Tomorrow 14:00' }],
          next_cursor: null,
        }),
      });

    const user = userEvent.setup();
    renderWithRouter(<BookingPage client={new DemoApiClient({ fetchImpl })} />, ['/demo/booking']);

    expect(await screen.findByText(/tomorrow 09:30/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /show more times/i }));
    expect(await screen.findByText(/tomorrow 14:00/i)).toBeInTheDocument();
  });

  it('keeps the demo available after booking from the confirmation page', async () => {
    saveBookingConfirmation({
      discovery_session_id: 'disc_1',
      scheduled_at: '2026-07-10T09:30:00Z',
      confirmation: { email_sent: true, sms_sent: true },
    });

    const { BookingConfirmedPage } = await import('../src/pages/BookingConfirmedPage.js');
    renderWithRouter(<BookingConfirmedPage />, ['/demo/booking/confirmed']);

    expect(screen.getByText(/mock email confirmation: sent/i)).toBeInTheDocument();
    expect(screen.getByText(/mock sms confirmation: sent/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to live demo/i })).toHaveAttribute('href', '/demo/live');
  });
});
