import type { WaitlistEntry } from '../domain/waitlist.js';

export interface WaitlistRepository {
  create(entry: WaitlistEntry): Promise<WaitlistEntry>;
  findByEmailNormalized(emailNormalized: string): Promise<WaitlistEntry | null>;
  findById(id: string): Promise<WaitlistEntry | null>;
}
