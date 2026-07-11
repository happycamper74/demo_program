import { Link } from 'react-router-dom';
import { recordClientAnalyticsEvent } from '../lib/analytics.js';
import { loadDemoSession } from '../lib/session-storage.js';

export function DiscoveryBookingCta() {
  const session = loadDemoSession();

  return (
    <div className="discovery-cta">
      <h3>Ready for a Discovery Session?</h3>
      <p className="muted">
        Book a short call with our team. We suggest a few available times instead of showing a full
        calendar first.
      </p>
      <Link
        className="button-link primary"
        to="/demo/booking"
        onClick={() =>
          recordClientAnalyticsEvent('discovery.clicked', {
            experienceSessionId: session?.experienceSessionId,
            prospectId: session?.prospectId,
            industry: session?.industry,
          })
        }
      >
        Book Discovery Session
      </Link>
    </div>
  );
}
