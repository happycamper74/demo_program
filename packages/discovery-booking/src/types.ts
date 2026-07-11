export interface DiscoverySlot {
  readonly slotId: string;
  readonly startsAt: string;
  readonly display: string;
}

export interface DiscoverySlotsResponse {
  readonly slots: readonly DiscoverySlot[];
  readonly nextCursor: string | null;
}

export interface BookDiscoveryRequest {
  readonly experienceSessionId: string;
  readonly prospectId: string;
  readonly selectedSlotId: string;
  readonly timezone: string;
  readonly prospectEmail: string;
  readonly prospectPhoneNumber: string;
}

export interface DiscoveryBookingConfirmation {
  readonly emailSent: boolean;
  readonly smsSent: boolean;
}

export interface DiscoveryBookingRecord {
  readonly discoverySessionId: string;
  readonly experienceSessionId: string;
  readonly prospectId: string;
  readonly slotId: string;
  readonly scheduledAt: string;
  readonly timezone: string;
  readonly confirmation: DiscoveryBookingConfirmation;
  readonly bookedAt: string;
}

export interface BookDiscoveryResponse {
  readonly status: 'booked';
  readonly discoverySessionId: string;
  readonly scheduledAt: string;
  readonly confirmation: DiscoveryBookingConfirmation;
}

export interface MockNotificationRecord {
  readonly channel: 'email' | 'sms';
  readonly destination: string;
  readonly experienceSessionId: string;
  readonly discoverySessionId: string;
  readonly sentAt: string;
}
