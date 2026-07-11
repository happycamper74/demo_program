import { useState } from 'react';
import type { OpsApiClient, SessionHistoryEntry } from '../api/ops-api-client.js';

export function SessionHistoryPage({ client }: { client: OpsApiClient }) {
  const [filters, setFilters] = useState({
    email: '',
    industry: '',
    prospect_name: '',
  });
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);

  async function search() {
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value.trim().length > 0),
    );
    const response = await client.searchSessionHistory(activeFilters);
    setSessions(response.sessions);
  }

  return (
    <section>
      <h2>Session History</h2>
      <div className="ops-filters">
        <input
          placeholder="Email"
          value={filters.email}
          onChange={(event) => setFilters((current) => ({ ...current, email: event.target.value }))}
        />
        <input
          placeholder="Industry"
          value={filters.industry}
          onChange={(event) =>
            setFilters((current) => ({ ...current, industry: event.target.value }))
          }
        />
        <input
          placeholder="Prospect name"
          value={filters.prospect_name}
          onChange={(event) =>
            setFilters((current) => ({ ...current, prospect_name: event.target.value }))
          }
        />
        <button type="button" onClick={() => void search()}>
          Search
        </button>
      </div>
      {sessions.map((session) => (
        <article key={session.experience_session_id} className="ops-card">
          <h3>
            {session.prospect_name} · {session.business_name}
          </h3>
          <p>
            {session.email} · {session.phone_number} · {session.industry}
          </p>
          <p className="muted">
            Session {session.experience_session_id} · State {session.state}
          </p>
          <ul>
            {session.timeline.map((event) => (
              <li key={`${event.event_name}-${event.occurred_at}`}>
                {event.label} ({event.occurred_at})
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
