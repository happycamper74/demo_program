import { useEffect, useState } from 'react';
import type { LiveSessionView, OpsApiClient } from '../api/ops-api-client.js';

export function LiveOperationsPage({ client }: { client: OpsApiClient }) {
  const [sessions, setSessions] = useState<LiveSessionView[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      void client.getLiveSessions().then((response) => {
        if (!cancelled) {
          setSessions(response.sessions);
        }
      });
    };

    load();
    const interval = window.setInterval(load, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [client]);

  return (
    <section>
      <h2>Live Operations</h2>
      <p className="muted">Active sessions refresh automatically every 3 seconds.</p>
      <table className="ops-table">
        <thead>
          <tr>
            <th>Prospect</th>
            <th>Business</th>
            <th>Industry</th>
            <th>State</th>
            <th>Stage</th>
            <th>Elapsed (s)</th>
            <th>Incident</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => (
            <tr key={session.experience_session_id}>
              <td>{session.prospect_name}</td>
              <td>{session.business_name}</td>
              <td>{session.industry}</td>
              <td>{session.state}</td>
              <td>{session.current_stage}</td>
              <td>{session.elapsed_seconds}</td>
              <td>{session.incident_id ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
