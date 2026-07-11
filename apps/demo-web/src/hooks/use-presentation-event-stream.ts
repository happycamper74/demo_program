import { useCallback, useEffect, useState } from 'react';
import { isInternalEventName } from '@experience-platform/event-contracts/presentation-events';
import type { DemoApiClient, PresentationEvent } from '../api/demo-api-client.js';
import { reducePresentationEvent } from '../hooks/demo-session-hooks.js';

const PRESENTATION_EVENT_NAMES = [
  'session_started',
  'waiting_for_call',
  'call_started',
  'call_completed',
  'processing_started',
  'transcript_ready',
  'customer_details_ready',
  'summary_ready',
  'lead_ready',
  'discovery_booked',
] as const;

export function usePresentationEventStream(
  client: DemoApiClient,
  experienceSessionId: string | null,
  experienceToken: string | null,
  initialEvents: ReadonlySet<string>,
) {
  const [completedEvents, setCompletedEvents] = useState(initialEvents);
  const [latestLabel, setLatestLabel] = useState<string | null>(null);

  const applyEvent = useCallback((eventName: string, label?: string) => {
    if (isInternalEventName(eventName)) {
      return;
    }

    setCompletedEvents((current) => reducePresentationEvent(current, eventName));
    if (label) {
      setLatestLabel(label);
    }
  }, []);

  useEffect(() => {
    if (!experienceSessionId || !experienceToken || typeof EventSource === 'undefined') {
      return;
    }

    const source = client.createEventSource(experienceSessionId, experienceToken);

    for (const eventName of PRESENTATION_EVENT_NAMES) {
      source.addEventListener(eventName, (message) => {
        try {
          const data = JSON.parse((message as MessageEvent).data) as PresentationEvent['data'];
          applyEvent(eventName, data.label);
        } catch {
          applyEvent(eventName);
        }
      });
    }

    return () => {
      source.close();
    };
  }, [applyEvent, client, experienceSessionId, experienceToken]);

  return { completedEvents, latestLabel, applyEvent };
}
