import { randomUUID } from 'node:crypto';
import { DiscoverySlotCatalog } from './slot-catalog.js';
import type {
  BookDiscoveryRequest,
  BookDiscoveryResponse,
  DiscoveryBookingRecord,
  DiscoverySlotsResponse,
  MockNotificationRecord,
} from './types.js';

export class DiscoveryBookingNotFoundError extends Error {
  constructor(public readonly slotId: string) {
    super(`Discovery slot not found: ${slotId}`);
    this.name = 'DiscoveryBookingNotFoundError';
  }
}

export class DiscoveryAlreadyBookedError extends Error {
  constructor(public readonly experienceSessionId: string) {
    super(`Discovery session already booked for ${experienceSessionId}`);
    this.name = 'DiscoveryAlreadyBookedError';
  }
}

export class MockDiscoveryBookingService {
  private readonly catalog: DiscoverySlotCatalog;
  private readonly bookings = new Map<string, DiscoveryBookingRecord>();
  private readonly notifications: MockNotificationRecord[] = [];

  constructor(catalog: DiscoverySlotCatalog = new DiscoverySlotCatalog()) {
    this.catalog = catalog;
  }

  getSuggestedSlots(cursor?: string | null): DiscoverySlotsResponse {
    const page = this.catalog.getSuggestedSlots(cursor);
    return {
      slots: page.slots,
      nextCursor: page.nextCursor,
    };
  }

  bookDiscovery(request: BookDiscoveryRequest): BookDiscoveryResponse {
    if (this.bookings.has(request.experienceSessionId)) {
      throw new DiscoveryAlreadyBookedError(request.experienceSessionId);
    }

    const slot = this.catalog.findSlot(request.selectedSlotId);
    if (!slot) {
      throw new DiscoveryBookingNotFoundError(request.selectedSlotId);
    }

    const discoverySessionId = `disc_${randomUUID()}`;
    const bookedAt = new Date().toISOString();
    const confirmation = {
      emailSent: this.recordNotification('email', request.prospectEmail, request, discoverySessionId, bookedAt),
      smsSent: this.recordNotification('sms', request.prospectPhoneNumber, request, discoverySessionId, bookedAt),
    };

    const record: DiscoveryBookingRecord = {
      discoverySessionId,
      experienceSessionId: request.experienceSessionId,
      prospectId: request.prospectId,
      slotId: slot.slotId,
      scheduledAt: slot.startsAt,
      timezone: request.timezone,
      confirmation,
      bookedAt,
    };

    this.bookings.set(request.experienceSessionId, record);

    return {
      status: 'booked',
      discoverySessionId,
      scheduledAt: slot.startsAt,
      confirmation,
    };
  }

  getBooking(experienceSessionId: string): DiscoveryBookingRecord | null {
    return this.bookings.get(experienceSessionId) ?? null;
  }

  getNotifications(): readonly MockNotificationRecord[] {
    return [...this.notifications];
  }

  private recordNotification(
    channel: 'email' | 'sms',
    destination: string,
    request: BookDiscoveryRequest,
    discoverySessionId: string,
    sentAt: string,
  ): boolean {
    this.notifications.push({
      channel,
      destination,
      experienceSessionId: request.experienceSessionId,
      discoverySessionId,
      sentAt,
    });
    return true;
  }
}
