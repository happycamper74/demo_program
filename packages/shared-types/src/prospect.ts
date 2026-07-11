export type ProspectStatus = 'new' | 'active' | 'completed' | 'blocked';

export interface Prospect {
  readonly prospectId: string;
  readonly fullName: string;
  readonly businessName: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly industry: string;
  readonly businessLocation: string;
  readonly companySize: string;
  readonly website: string | null;
  readonly biggestChallenge: string;
  readonly implementationTimeframe: string;
  readonly currentStatus: ProspectStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UpsertProspectInput {
  readonly fullName: string;
  readonly businessName: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly industry: string;
  readonly businessLocation: string;
  readonly companySize: string;
  readonly website?: string | null;
  readonly biggestChallenge: string;
  readonly implementationTimeframe: string;
}
