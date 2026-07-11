import { useEffect, useState } from 'react';
import type { OpsApiClient, OpsIncident } from '../api/ops-api-client.js';

export function ActionCenterPage({ client }: { client: OpsApiClient }) {
  const [incidents, setIncidents] = useState<OpsIncident[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void client
      .getActionCenter()
      .then((response) => {
        setIncidents(response.incidents);
        setError(null);
      })
      .catch((fetchError: Error) => setError(fetchError.message));
  }, [client]);

  return (
    <section>
      <h2>Action Center</h2>
      <p className="muted">Actionable incidents only. Informational events are excluded.</p>
      {error ? <p>{error}</p> : null}
      {incidents.length === 0 ? (
        <p>No actionable incidents right now.</p>
      ) : (
        incidents.map((incident) => (
          <article key={incident.incident_id} className="ops-card">
            <h3 className={`ops-priority-${incident.priority}`}>{incident.title}</h3>
            <p>{incident.description}</p>
            <p className="muted">
              Priority: {incident.priority} · Action: {incident.action_type}
            </p>
            {incident.action_type === 'retry' ? (
              <button
                type="button"
                onClick={() => void client.retryIncident(incident.incident_id)}
              >
                Retry
              </button>
            ) : null}
          </article>
        ))
      )}
    </section>
  );
}
