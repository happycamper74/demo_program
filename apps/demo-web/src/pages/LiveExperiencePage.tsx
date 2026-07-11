import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isInternalEventName } from '@experience-platform/event-contracts/presentation-events';
import type { DemoApiClient } from '../api/demo-api-client.js';
import { DiscoveryBookingCta } from '../components/DiscoveryBookingCta.js';
import { ProgressMilestones } from '../components/ProgressMilestones.js';
import { RestrictedLeadViewShell } from '../components/RestrictedLeadViewShell.js';
import { Layout, PageCard } from '../components/Layout.js';
import {
  createInitialCompletedEvents,
  useDemoSessionStatus,
  useRestrictedLeadView,
} from '../hooks/demo-session-hooks.js';
import { usePresentationEventStream } from '../hooks/use-presentation-event-stream.js';
import { loadDemoSession } from '../lib/session-storage.js';

export function LiveExperiencePage({ client }: { client: DemoApiClient }) {
  const navigate = useNavigate();
  const session = loadDemoSession();
  const [simulating, setSimulating] = useState(false);
  const [simulateError, setSimulateError] = useState<string | null>(null);
  const [leadViewEnabled, setLeadViewEnabled] = useState(false);

  const { status } = useDemoSessionStatus(
    client,
    session?.experienceSessionId ?? null,
    session?.experienceToken ?? null,
  );

  const { completedEvents, latestLabel } = usePresentationEventStream(
    client,
    session?.experienceSessionId ?? null,
    session?.experienceToken ?? null,
    createInitialCompletedEvents(),
  );

  const shouldLoadLeadView = leadViewEnabled || Boolean(status?.lead_view_available);
  const { leadView, loading, error, reload } = useRestrictedLeadView(
    client,
    session?.experienceSessionId ?? null,
    session?.experienceToken ?? null,
    shouldLoadLeadView,
  );

  useEffect(() => {
    if (status?.recovery_available) {
      navigate('/demo/recover');
    }
  }, [navigate, status?.recovery_available]);

  useEffect(() => {
    if (completedEvents.has('lead_ready')) {
      setLeadViewEnabled(true);
      reload();
    }
  }, [completedEvents, reload]);

  const visibleEvents = useMemo(
    () =>
      [...completedEvents].filter((eventName) => !isInternalEventName(eventName)),
    [completedEvents],
  );

  async function handleSimulateCall() {
    if (!session) {
      return;
    }

    setSimulating(true);
    setSimulateError(null);

    try {
      await client.simulateIncomingCall(session.experienceSessionId, session.experienceToken);
      setLeadViewEnabled(true);
      reload();
    } catch (simulateFailure) {
      setSimulateError(
        simulateFailure instanceof Error ? simulateFailure.message : 'Unable to simulate call.',
      );
    } finally {
      setSimulating(false);
    }
  }

  const currentStep = status?.current_step ?? 'waiting_for_call';

  if (!session) {
    return <Navigate to="/demo/industry" replace />;
  }

  return (
    <Layout>
      <PageCard title="Live demo progress">
        <p className="muted">Current step: {currentStep}</p>
        {latestLabel ? <p aria-live="polite">{latestLabel}</p> : null}
        <ProgressMilestones completedEvents={new Set(visibleEvents)} />
        {status?.simulate_call_available ===true ? (
          <div className="button-row">
            <button
              type="button"
              className="secondary"
              disabled={simulating}
              onClick={() => void handleSimulateCall()}
            >
              {simulating ? 'Simulating call…' : 'Simulate incoming call (mock)'}
            </button>
          </div>
        ) : null}
        {simulateError ? <p className="field-error">{simulateError}</p> : null}
        <RestrictedLeadViewShell leadView={leadView} loading={loading} error={error} />
        <DiscoveryBookingCta />
      </PageCard>
    </Layout>
  );
}
