import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { DemoApiClient, DiscoverySlotResponse } from '../api/demo-api-client.js';
import { Layout, PageCard } from '../components/Layout.js';
import { loadDemoSession, saveSelectedDiscoverySlot } from '../lib/session-storage.js';

export function BookingPage({ client }: { client: DemoApiClient }) {
  const navigate = useNavigate();
  const session = loadDemoSession();
  const [slots, setSlots] = useState<DiscoverySlotResponse[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void client.getDiscoverySlots(cursor).then((response) => {
      setSlots((current) => (cursor ? [...current, ...response.slots] : response.slots));
      setNextCursor(response.next_cursor);
      setLoading(false);
    });
  }, [client, cursor]);

  function selectSlot(slot: DiscoverySlotResponse) {
    saveSelectedDiscoverySlot(slot);
    navigate('/demo/booking/confirm');
  }

  if (!session) {
    return (
      <Layout>
        <PageCard title="Book a Discovery Session">
          <p>Start a demo session before booking a Discovery Session.</p>
          <Link className="button-link primary" to="/demo/industry">
            Start demo
          </Link>
        </PageCard>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageCard title="Suggested Discovery Session times">
        <p className="muted">Pick one of our best available slots. You can show more times if needed.</p>
        {loading ? <p>Loading suggested slots…</p> : null}
        <div className="stack">
          {slots.map((slot) => (
            <button
              key={slot.slot_id}
              type="button"
              className="secondary"
              onClick={() => selectSlot(slot)}
            >
              {slot.display}
            </button>
          ))}
        </div>
        {nextCursor ? (
          <button type="button" className="secondary" onClick={() => setCursor(nextCursor)}>
            Show more times
          </button>
        ) : null}
        <Link className="button-link secondary" to="/demo/live">
          Return to live demo
        </Link>
      </PageCard>
    </Layout>
  );
}
