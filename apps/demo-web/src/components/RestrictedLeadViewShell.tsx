import type { RestrictedLeadViewData } from '../api/demo-api-client.js';

interface RestrictedLeadViewShellProps {
  leadView: RestrictedLeadViewData | null;
  loading: boolean;
  error: string | null;
}

export function RestrictedLeadViewShell({
  leadView,
  loading,
  error,
}: RestrictedLeadViewShellProps) {
  if (loading) {
    return <p>Loading lead view…</p>;
  }

  if (error) {
    return <p className="field-error">{error}</p>;
  }

  if (!leadView) {
    return <p className="muted">Lead view will appear here when processing is complete.</p>;
  }

  return (
    <div className="lead-view" aria-label="Restricted lead view">
      <section>
        <h3>Lead header</h3>
        <p>
          <strong>{leadView.header.businessName}</strong> — {leadView.header.contactName}
        </p>
        <p className="muted">
          {leadView.header.phoneNumber} · {leadView.header.industry}
        </p>
      </section>

      <section>
        <h3>Summary</h3>
        <p>{leadView.summary}</p>
      </section>

      <section>
        <h3>Transcript</h3>
        {leadView.transcript.map((entry, index) => (
          <div key={`${entry.timestamp}-${index}`} className="transcript-entry">
            <div className="speaker">{entry.speaker}</div>
            <div>{entry.text}</div>
          </div>
        ))}
      </section>

      <section>
        <h3>Timeline</h3>
        <ul className="scenario-list">
          {leadView.timeline.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.title}</strong> — {entry.description}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
