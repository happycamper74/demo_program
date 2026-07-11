import type { Prospect, UpsertProspectInput } from '@experience-platform/shared-types';

export interface ProspectRepository {
  create(prospect: Prospect): Promise<Prospect>;
  update(prospect: Prospect): Promise<Prospect>;
  findById(prospectId: string): Promise<Prospect | null>;
  findByEmail(email: string): Promise<Prospect | null>;
  findByPhoneNumber(phoneNumber: string): Promise<Prospect | null>;
}

export type { UpsertProspectInput };
