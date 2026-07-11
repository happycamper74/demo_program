import type { ExperienceTokenClaims, SessionOwnershipContext } from './experience-token-types.js';
import { ExperienceTokenOwnershipError } from './experience-token-errors.js';

export function validateSessionOwnership(
  claims: ExperienceTokenClaims,
  context: SessionOwnershipContext,
): void {
  if (claims.experience_session_id !== context.experienceSessionId) {
    throw new ExperienceTokenOwnershipError(
      'Experience token does not belong to the requested session',
    );
  }

  if (
    context.prospectId !== undefined &&
    claims.prospect_id !== context.prospectId
  ) {
    throw new ExperienceTokenOwnershipError('Experience token does not belong to the requested prospect');
  }

  if (
    context.experienceDefinitionId !== undefined &&
    claims.experience_definition_id !== context.experienceDefinitionId
  ) {
    throw new ExperienceTokenOwnershipError(
      'Experience token does not belong to the requested experience definition',
    );
  }
}

export function hasExperienceTokenPermission(
  claims: ExperienceTokenClaims,
  permission: ExperienceTokenClaims['permissions'][number],
): boolean {
  return claims.permissions.includes(permission);
}
