import { describe, expect, it } from 'vitest';
import { DiscoverySlotCatalog } from '../src/slot-catalog.js';
import { MockDiscoveryBookingService } from '../src/mock-discovery-booking-service.js';

describe('MockDiscoveryBookingService', () => {
  it('returns a small suggested slot set without showing a full calendar', () => {
    const service = new MockDiscoveryBookingService();
    const firstPage = service.getSuggestedSlots();

    expect(firstPage.slots.length).toBeGreaterThan(0);
    expect(firstPage.slots.length).toBeLessThanOrEqual(3);
    expect(firstPage.nextCursor).toBeTypeOf('string');
  });

  it('supports show more times via cursor pagination', () => {
    const service = new MockDiscoveryBookingService();
    const firstPage = service.getSuggestedSlots();
    const secondPage = service.getSuggestedSlots(firstPage.nextCursor);

    expect(secondPage.slots.length).toBeGreaterThan(0);
    expect(secondPage.slots[0]?.slotId).not.toBe(firstPage.slots[0]?.slotId);
  });

  it('books a discovery session and records mock email and sms confirmations', () => {
    const catalog = new DiscoverySlotCatalog(new Date('2026-07-09T08:00:00Z'));
    const service = new MockDiscoveryBookingService(catalog);
    const slotId = service.getSuggestedSlots().slots[0]?.slotId;

    const response = service.bookDiscovery({
      experienceSessionId: 'expsess_1',
      prospectId: 'prospect_1',
      selectedSlotId: slotId ?? '',
      timezone: 'Europe/Amsterdam',
      prospectEmail: 'john@example.com',
      prospectPhoneNumber: '+31612345678',
    });

    expect(response.status).toBe('booked');
    expect(response.confirmation.emailSent).toBe(true);
    expect(response.confirmation.smsSent).toBe(true);

    const notifications = service.getNotifications();
    expect(notifications.some((entry) => entry.channel === 'email')).toBe(true);
    expect(notifications.some((entry) => entry.channel === 'sms')).toBe(true);
  });
});
