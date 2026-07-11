import type { ExperienceTokenPermission } from './experience-token-types.js';

export const FORBIDDEN_EXPERIENCE_TOKEN_PERMISSIONS = [
  'lead:update',
  'lead:delete',
  'lead:list',
  'settings:*',
  'users:*',
  'admin:*',
] as const;

export const FORBIDDEN_LEADBOARD_USER_CLAIMS = [
  'user_id',
  'sub',
  'org_id',
  'organization_id',
  'account_id',
  'leadboard_user_id',
  'email',
  'role',
  'roles',
] as const;

export function isAllowedExperienceTokenPermission(
  permission: string,
): permission is ExperienceTokenPermission {
  return (
    permission === 'experience:view' ||
    permission === 'experience:recover' ||
    permission === 'lead:view' ||
    permission === 'lead:timeline:view' ||
    permission === 'lead:summary:view' ||
    permission === 'lead:transcript:view' ||
    permission === 'discovery:book'
  );
}

export function isForbiddenExperienceTokenPermission(permission: string): boolean {
  if ((FORBIDDEN_EXPERIENCE_TOKEN_PERMISSIONS as readonly string[]).includes(permission)) {
    return true;
  }

  return (
    permission.startsWith('settings:') ||
    permission.startsWith('users:') ||
    permission.startsWith('admin:')
  );
}

export function assertAllowedExperienceTokenPermissions(permissions: readonly string[]): void {
  for (const permission of permissions) {
    if (isForbiddenExperienceTokenPermission(permission)) {
      throw new ForbiddenExperienceTokenPermissionError(permission);
    }

    if (!isAllowedExperienceTokenPermission(permission)) {
      throw new UnknownExperienceTokenPermissionError(permission);
    }
  }
}

export function assertNoLeadBoardUserClaims(payload: Record<string, unknown>): void {
  for (const claim of FORBIDDEN_LEADBOARD_USER_CLAIMS) {
    if (claim in payload && payload[claim] !== undefined && payload[claim] !== null) {
      throw new LeadBoardUserClaimPresentError(claim);
    }
  }
}

export class ForbiddenExperienceTokenPermissionError extends Error {
  constructor(public readonly permission: string) {
    super(`Forbidden experience token permission: ${permission}`);
    this.name = 'ForbiddenExperienceTokenPermissionError';
  }
}

export class UnknownExperienceTokenPermissionError extends Error {
  constructor(public readonly permission: string) {
    super(`Unknown experience token permission: ${permission}`);
    this.name = 'UnknownExperienceTokenPermissionError';
  }
}

export class LeadBoardUserClaimPresentError extends Error {
  constructor(public readonly claim: string) {
    super(`LeadBoard user claim is not allowed on experience tokens: ${claim}`);
    this.name = 'LeadBoardUserClaimPresentError';
  }
}
