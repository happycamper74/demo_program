export interface DemoSessionState {
  readonly experienceSessionId: string;
  readonly experienceToken: string;
  readonly prospectId: string;
  readonly sharedDemoPhoneNumber: string;
  readonly industry: string;
  readonly industrySupported: boolean;
  readonly scenarioExamples: readonly string[];
  readonly instructionsTitle: string;
  readonly instructionsMessage: string;
}

const STORAGE_KEY = 'leadboard_demo_session';

export function saveDemoSession(session: DemoSessionState): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadDemoSession(): DemoSessionState | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as DemoSessionState;
}

export function updateDemoSessionToken(experienceToken: string): void {
  const current = loadDemoSession();
  if (!current) {
    return;
  }

  saveDemoSession({ ...current, experienceToken });
}

export function clearDemoSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function saveSelectedIndustry(industry: string): void {
  sessionStorage.setItem('leadboard_demo_industry', industry);
}

export function loadSelectedIndustry(): string | null {
  return sessionStorage.getItem('leadboard_demo_industry');
}

export function clearBookingState(): void {
  sessionStorage.removeItem(SELECTED_SLOT_KEY);
  sessionStorage.removeItem(BOOKING_CONFIRMATION_KEY);
}

export interface SelectedDiscoverySlot {
  readonly slot_id: string;
  readonly starts_at: string;
  readonly display: string;
}

const SELECTED_SLOT_KEY = 'leadboard_selected_discovery_slot';
const BOOKING_CONFIRMATION_KEY = 'leadboard_booking_confirmation';

export function saveSelectedDiscoverySlot(slot: SelectedDiscoverySlot): void {
  sessionStorage.setItem(SELECTED_SLOT_KEY, JSON.stringify(slot));
}

export function loadSelectedDiscoverySlot(): SelectedDiscoverySlot | null {
  const raw = sessionStorage.getItem(SELECTED_SLOT_KEY);
  return raw ? (JSON.parse(raw) as SelectedDiscoverySlot) : null;
}

export function saveBookingConfirmation(confirmation: {
  discovery_session_id: string;
  scheduled_at: string;
  confirmation: { email_sent: boolean; sms_sent: boolean };
}): void {
  sessionStorage.setItem(BOOKING_CONFIRMATION_KEY, JSON.stringify(confirmation));
}

export function loadBookingConfirmation(): {
  discovery_session_id: string;
  scheduled_at: string;
  confirmation: { email_sent: boolean; sms_sent: boolean };
} | null {
  const raw = sessionStorage.getItem(BOOKING_CONFIRMATION_KEY);
  return raw
    ? (JSON.parse(raw) as {
        discovery_session_id: string;
        scheduled_at: string;
        confirmation: { email_sent: boolean; sms_sent: boolean };
      })
    : null;
}

export const WAITLIST_CONFIRMATION_VERSION = 1 as const;

export type WaitlistConfirmationOutcome = 'created' | 'already_exists';

export interface WaitlistConfirmationState {
  readonly version: typeof WAITLIST_CONFIRMATION_VERSION;
  readonly outcome: WaitlistConfirmationOutcome;
  readonly country_name: string;
}

const WAITLIST_CONFIRMATION_KEY = 'leadboard_waitlist_confirmation';

export function saveWaitlistConfirmation(state: WaitlistConfirmationState): void {
  sessionStorage.setItem(WAITLIST_CONFIRMATION_KEY, JSON.stringify(state));
}

export function loadWaitlistConfirmation(): WaitlistConfirmationState | null {
  const raw = sessionStorage.getItem(WAITLIST_CONFIRMATION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as WaitlistConfirmationState;
    if (parsed.version !== WAITLIST_CONFIRMATION_VERSION) {
      return null;
    }
    if (parsed.outcome !== 'created' && parsed.outcome !== 'already_exists') {
      return null;
    }
    if (typeof parsed.country_name !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearWaitlistConfirmation(): void {
  sessionStorage.removeItem(WAITLIST_CONFIRMATION_KEY);
}
