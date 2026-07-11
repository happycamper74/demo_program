export const PACKAGE_NAME = '@experience-platform/discovery-booking' as const;

export { DiscoverySlotCatalog, SUGGESTED_PAGE_SIZE } from './slot-catalog.js';
export {
  DiscoveryAlreadyBookedError,
  DiscoveryBookingNotFoundError,
  MockDiscoveryBookingService,
} from './mock-discovery-booking-service.js';
export type {
  BookDiscoveryRequest,
  BookDiscoveryResponse,
  DiscoveryBookingConfirmation,
  DiscoveryBookingRecord,
  DiscoverySlot,
  DiscoverySlotsResponse,
  MockNotificationRecord,
} from './types.js';
