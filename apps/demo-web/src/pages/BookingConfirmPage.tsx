import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { DemoApiClient } from '../api/demo-api-client.js';
import { Layout, PageCard } from '../components/Layout.js';
import { loadDemoSession, loadSelectedDiscoverySlot, saveBookingConfirmation } from '../lib/session-storage.js';

export function BookingConfirmPage({ client }: { client: DemoApiClient }) {
  const navigate = useNavigate();
  const session = loadDemoSession();
  const slot = loadSelectedDiscoverySlot();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmBooking() {
    if (!session || !slot) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await client.bookDiscovery(session.experienceSessionId, session.experienceToken, {
        selected_slot_id: slot.slot_id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Amsterdam',
      });
      saveBookingConfirmation(response);
      navigate('/demo/booking/confirmed');
    } catch (bookingError) {
      setError(bookingError instanceof Error ? bookingError.message : 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!session || !slot) {
    return (
      <Layout>
        <PageCard title="Confirm booking">
          <p>Select a slot before confirming your Discovery Session.</p>
          <Link className="button-link primary" to="/demo/booking">
            Choose a time
          </Link>
        </PageCard>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageCard title="Confirm your Discovery Session">
        <p>
          You selected <strong>{slot.display}</strong>.
        </p>
        <p className="muted">
          We will send a mock email and SMS confirmation. Your demo remains available after booking.
        </p>
        <div className="button-row">
          <button type="button" className="primary" disabled={submitting} onClick={() => void confirmBooking()}>
            {submitting ? 'Booking…' : 'Confirm booking'}
          </button>
          <Link className="button-link secondary" to="/demo/booking">
            Choose another time
          </Link>
        </div>
        {error ? <p className="field-error">{error}</p> : null}
      </PageCard>
    </Layout>
  );
}
