export function DiscoveryCtaPlaceholder() {
  return (
    <div className="discovery-cta">
      <h3>Ready for a Discovery Session?</h3>
      <p className="muted">
        Booking is coming soon. This placeholder keeps the Discovery CTA visible without enabling
        scheduling yet.
      </p>
      <button type="button" className="secondary" disabled>
        Book Discovery Session
      </button>
    </div>
  );
}
