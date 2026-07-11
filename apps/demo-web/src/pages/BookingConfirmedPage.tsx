import { Link } from 'react-router-dom';
import { Layout, PageCard } from '../components/Layout.js';
import { loadBookingConfirmation } from '../lib/session-storage.js';

export function BookingConfirmedPage() {
  const booking = loadBookingConfirmation();

  if (!booking) {
    return (
      <Layout>
        <PageCard title="Booking confirmation">
          <p>No booking confirmation is available yet.</p>
          <Link className="button-link primary" to="/demo/booking">
            Book a Discovery Session
          </Link>
        </PageCard>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageCard title="Discovery Session booked">
        <p>Your Discovery Session is scheduled.</p>
        <p>
          <strong>When:</strong> {new Date(booking.scheduled_at).toLocaleString()}
        </p>
        <p>
          <strong>Confirmation ID:</strong> {booking.discovery_session_id}
        </p>
        <ul className="scenario-list">
          <li>Mock email confirmation: {booking.confirmation.email_sent ? 'sent' : 'not sent'}</li>
          <li>Mock SMS confirmation: {booking.confirmation.sms_sent ? 'sent' : 'not sent'}</li>
        </ul>
        <div className="button-row">
          <Link className="button-link primary" to="/demo/live">
            Return to live demo
          </Link>
          <Link className="button-link secondary" to="/">
            Back to landing page
          </Link>
        </div>
      </PageCard>
    </Layout>
  );
}
