import { useCallback, useEffect, useState } from 'react';
import {
  DemoApiClient,
  type PresentationEvent,
  type RestrictedLeadViewData,
  type SessionStatusResponse,
} from '../api/demo-api-client.js';

export function useDemoSessionStatus(
  client: DemoApiClient,
  experienceSessionId: string | null,
  experienceToken: string | null,
) {
  const [status, setStatus] = useState<SessionStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!experienceSessionId || !experienceToken) {
      return;
    }

    let cancelled = false;

    void client
      .getSessionStatus(experienceSessionId, experienceToken)
      .then((response) => {
        if (!cancelled) {
          setStatus(response);
        }
      })
      .catch((fetchError: Error) => {
        if (!cancelled) {
          setError(fetchError.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, experienceSessionId, experienceToken]);

  return { status, error };
}

export function useRestrictedLeadView(
  client: DemoApiClient,
  experienceSessionId: string | null,
  experienceToken: string | null,
  enabled: boolean,
) {
  const [leadView, setLeadView] = useState<RestrictedLeadViewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const reload = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    if (!enabled || !experienceSessionId || !experienceToken) {
      return;
    }

    let cancelled = false;
    setLoading(true);

    void client
      .getRestrictedLeadView(experienceSessionId, experienceToken)
      .then((response) => {
        if (!cancelled) {
          setLeadView(response);
          setError(null);
        }
      })
      .catch((fetchError: Error) => {
        if (!cancelled) {
          setError(fetchError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, enabled, experienceSessionId, experienceToken, refreshKey]);

  return { leadView, loading, error, reload };
}

export interface EventStreamController {
  completedEvents: Set<string>;
  events: PresentationEvent[];
}

export function createInitialCompletedEvents(): Set<string> {
  return new Set(['session_started', 'waiting_for_call']);
}

export function reducePresentationEvent(
  current: ReadonlySet<string>,
  eventName: string,
): Set<string> {
  const next = new Set(current);
  next.add(eventName);
  return next;
}
