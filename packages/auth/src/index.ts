export const PACKAGE_NAME = '@experience-platform/auth' as const;

export { ExperienceTokenService } from './experience-token-service.js';
export {
  createExperienceTokenConfig,
  loadExperienceTokenConfigFromEnv,
  type ExperienceTokenConfig,
} from './experience-token-config.js';
export {
  assertAllowedExperienceTokenPermissions,
  assertNoLeadBoardUserClaims,
  ForbiddenExperienceTokenPermissionError,
  FORBIDDEN_EXPERIENCE_TOKEN_PERMISSIONS,
  FORBIDDEN_LEADBOARD_USER_CLAIMS,
  isAllowedExperienceTokenPermission,
  isForbiddenExperienceTokenPermission,
  LeadBoardUserClaimPresentError,
  UnknownExperienceTokenPermissionError,
} from './experience-token-permissions.js';
export {
  hasExperienceTokenPermission,
  validateSessionOwnership,
} from './experience-token-ownership.js';
export {
  ExperienceTokenConfigurationError,
  ExperienceTokenExpiredError,
  ExperienceTokenOwnershipError,
  ExperienceTokenVerificationError,
  InvalidExperienceTokenTypeError,
  MissingExperienceTokenClaimError,
} from './experience-token-errors.js';
export {
  createSafeAuthLogger,
  redactTokenFields,
  type SafeAuthLogger,
} from './safe-auth-logger.js';
export {
  EXPERIENCE_TOKEN_PERMISSIONS,
  EXPERIENCE_TOKEN_TYPE,
  type CreateExperienceTokenInput,
  type ExperienceTokenClaims,
  type ExperienceTokenPermission,
  type ExperienceTokenType,
  type SessionOwnershipContext,
  type VerifiedExperienceToken,
} from './experience-token-types.js';
