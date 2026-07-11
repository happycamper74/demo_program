import { Link, Navigate } from 'react-router-dom';
import { Layout, PageCard } from '../components/Layout.js';
import { loadWaitlistConfirmation } from '../lib/session-storage.js';

export function WaitlistConfirmedPage() {
  const confirmation = loadWaitlistConfirmation();

  if (!confirmation) {
    return <Navigate to="/demo/qualify" replace />;
  }

  if (confirmation.outcome === 'already_exists') {
    return (
      <Layout>
        <PageCard title="You're already on our waitlist">
          <p>You&apos;re already on our waitlist.</p>
          <p>
            We&apos;ll notify you as soon as the interactive demo becomes available in your
            market.
          </p>
          <div className="button-row">
            <Link className="button-link primary" to="/">
              Back to Home
            </Link>
            <Link className="button-link secondary" to="/demo/industry">
              Return to Demo
            </Link>
          </div>
        </PageCard>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageCard title="Thank you">
        <p>Thank you.</p>
        <p>
          LeadBoard&apos;s interactive demo is currently available only in the Netherlands and
          the United States.
        </p>
        <p>
          We&apos;ve added your business in {confirmation.country_name} to our priority waitlist
          and we&apos;ll notify you as soon as your market becomes available.
        </p>
        <div className="button-row">
          <Link className="button-link primary" to="/">
            Back to Home
          </Link>
          <Link className="button-link secondary" to="/demo/industry">
            Return to Demo
          </Link>
        </div>
      </PageCard>
    </Layout>
  );
}
