import { useEffect } from 'react';
import { Layout, PageCard, PrimaryLink } from '../components/Layout.js';
import { recordClientAnalyticsEvent } from '../lib/analytics.js';

export function LandingPage() {
  useEffect(() => {
    recordClientAnalyticsEvent('landing.viewed');
  }, []);

  return (
    <Layout>
      <PageCard title="Experience the real LeadBoard workflow">
        <p>
          This interactive demo uses LeadBoard&apos;s real processing pipeline to show how inbound
          calls become structured leads with transcripts, summaries, and timelines.
        </p>
        <p className="muted">
          The demonstration normally takes approximately two to three minutes once you place your
          call.
        </p>
        <ul className="scenario-list">
          <li>AI call handling for a realistic plumbing scenario</li>
          <li>Automatic transcript and customer detail extraction</li>
          <li>Temporary restricted lead view for your own call</li>
        </ul>
        <div className="button-row">
          <PrimaryLink to="/demo/industry">Start interactive demo</PrimaryLink>
        </div>
      </PageCard>
    </Layout>
  );
}
