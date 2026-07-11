import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../src/App.js';
import { OpsApiClient } from '../src/api/ops-api-client.js';
import { ActionCenterPage } from '../src/pages/ActionCenterPage.js';
import { FunnelReportPage } from '../src/pages/FunnelReportPage.js';
import { LiveOperationsPage } from '../src/pages/LiveOperationsPage.js';
import { PlatformHealthPage } from '../src/pages/PlatformHealthPage.js';
import { SessionHistoryPage } from '../src/pages/SessionHistoryPage.js';

function renderWithRouter(ui: ReactElement, initialEntries = ['/']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

function createMockClient() {
  return new OpsApiClient({
    fetchImpl: vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        incidents: [
          {
            incident_id: 'incident_1',
            priority: 'high',
            title: 'Recovery failed',
            description: 'Session needs attention',
            experience_session_id: 'sess_1',
            action_type: 'investigate',
            created_at: '2026-07-09T10:00:00Z',
          },
        ],
        sessions: [
          {
            experience_session_id: 'sess_1',
            prospect_name: 'Jane',
            business_name: 'Jane Plumbing',
            industry: 'plumbing',
            experience_definition_id: 'expdef_1',
            state: 'waiting_for_call',
            current_stage: 'waiting_for_call',
            elapsed_seconds: 42,
            incident_id: null,
          },
        ],
        components: [
          { component: 'demo-api-bff', status: 'healthy', message: 'Running' },
          { component: 'analytics', status: 'healthy', message: 'Available' },
        ],
        stages: [
          {
            stage: 'landing.viewed',
            count: 2,
            drop_off_from_previous: null,
            drop_off_rate_from_previous: null,
            average_seconds_from_previous: null,
          },
        ],
        industries: [
          {
            industry: 'plumbing',
            industry_selected: 1,
            demo_started: 1,
            demo_completed: 1,
            discovery_booked: 1,
          },
        ],
      }),
    }),
  });
}

describe('operations-center app', () => {
  it('renders main navigation views', () => {
    render(<App />);
    expect(screen.getByText(/operations center/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /live operations/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /session history/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /platform health/i })).toBeInTheDocument();
  });

  it('shows actionable incidents in action center', async () => {
    renderWithRouter(<ActionCenterPage client={createMockClient()} />, ['/actions']);
    expect(await screen.findByText(/recovery failed/i)).toBeInTheDocument();
  });

  it('lists live operations sessions', async () => {
    renderWithRouter(<LiveOperationsPage client={createMockClient()} />, ['/live']);
    expect(await screen.findByText(/jane plumbing/i)).toBeInTheDocument();
  });

  it('supports session history search UI', () => {
    renderWithRouter(<SessionHistoryPage client={createMockClient()} />, ['/history']);
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('renders platform health response', async () => {
    renderWithRouter(<PlatformHealthPage client={createMockClient()} />, ['/health']);
    expect(await screen.findByText(/demo-api-bff/i)).toBeInTheDocument();
  });

  it('renders funnel reporting view', async () => {
    renderWithRouter(<FunnelReportPage client={createMockClient()} />, ['/analytics/funnel']);
    expect(await screen.findByText(/landing.viewed/i)).toBeInTheDocument();
  });
});
