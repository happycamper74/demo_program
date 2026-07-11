import { SignJWT, jwtVerify } from 'jose';
import type { ExperienceTokenConfig } from './experience-token-config.js';
import {
  ExperienceTokenExpiredError,
  ExperienceTokenVerificationError,
  InvalidExperienceTokenTypeError,
  MissingExperienceTokenClaimError,
} from './experience-token-errors.js';
import {
  assertAllowedExperienceTokenPermissions,
  assertNoLeadBoardUserClaims,
} from './experience-token-permissions.js';
import type {
  CreateExperienceTokenInput,
  ExperienceTokenClaims,
  ExperienceTokenPermission,
  VerifiedExperienceToken,
} from './experience-token-types.js';
import { EXPERIENCE_TOKEN_TYPE } from './experience-token-types.js';
import type { SafeAuthLogger } from './safe-auth-logger.js';
import { createSafeAuthLogger } from './safe-auth-logger.js';

const REQUIRED_CLAIMS = [
  'token_type',
  'experience_session_id',
  'experience_definition_id',
  'prospect_id',
  'issued_at',
  'expires_at',
  'permissions',
] as const;

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function getSecretKey(signingSecret: string): Uint8Array {
  return new TextEncoder().encode(signingSecret);
}

function parseClaims(payload: Record<string, unknown>): ExperienceTokenClaims {
  for (const claim of REQUIRED_CLAIMS) {
    if (payload[claim] === undefined || payload[claim] === null) {
      throw new MissingExperienceTokenClaimError(claim);
    }
  }

  assertNoLeadBoardUserClaims(payload);

  const tokenType = String(payload.token_type);
  if (tokenType !== EXPERIENCE_TOKEN_TYPE) {
    throw new InvalidExperienceTokenTypeError(tokenType);
  }

  const permissions = Array.isArray(payload.permissions)
    ? payload.permissions.map(String)
    : [];

  assertAllowedExperienceTokenPermissions(permissions);

  const issuedAt = Number(payload.issued_at);
  const expiresAt = Number(payload.expires_at);

  if (Number.isNaN(issuedAt) || Number.isNaN(expiresAt)) {
    throw new ExperienceTokenVerificationError('issued_at and expires_at must be numeric timestamps');
  }

  if (expiresAt <= issuedAt) {
    throw new ExperienceTokenVerificationError('expires_at must be after issued_at');
  }

  const now = toUnixSeconds(new Date());
  if (expiresAt <= now) {
    throw new ExperienceTokenExpiredError();
  }

  return {
    token_type: EXPERIENCE_TOKEN_TYPE,
    experience_session_id: String(payload.experience_session_id),
    experience_definition_id: String(payload.experience_definition_id),
    prospect_id: String(payload.prospect_id),
    issued_at: issuedAt,
    expires_at: expiresAt,
    permissions: permissions as ExperienceTokenPermission[],
    industry: payload.industry === undefined ? undefined : String(payload.industry),
    experience_version:
      payload.experience_version === undefined ? undefined : String(payload.experience_version),
    risk_level: payload.risk_level === undefined ? undefined : String(payload.risk_level),
    leadboard_demo_session_id:
      payload.leadboard_demo_session_id === undefined
        ? undefined
        : payload.leadboard_demo_session_id === null
          ? null
          : String(payload.leadboard_demo_session_id),
    leadboard_lead_id:
      payload.leadboard_lead_id === undefined
        ? undefined
        : payload.leadboard_lead_id === null
          ? null
          : String(payload.leadboard_lead_id),
  };
}

export class ExperienceTokenService {
  private readonly logger: SafeAuthLogger;

  constructor(
    private readonly config: ExperienceTokenConfig,
    logger?: SafeAuthLogger,
  ) {
    this.logger = logger ?? createSafeAuthLogger({ info: () => undefined, warn: () => undefined });
  }

  async createToken(input: CreateExperienceTokenInput): Promise<string> {
    assertAllowedExperienceTokenPermissions(input.permissions);

    const issuedAt = input.issuedAt ?? new Date();
    const issuedAtSeconds = toUnixSeconds(issuedAt);
    const expiresAtSeconds = toUnixSeconds(input.expiresAt);

    if (expiresAtSeconds <= issuedAtSeconds) {
      throw new ExperienceTokenVerificationError('expiresAt must be after issuedAt');
    }

    const payload: Record<string, unknown> = {
      token_type: EXPERIENCE_TOKEN_TYPE,
      experience_session_id: input.experienceSessionId,
      experience_definition_id: input.experienceDefinitionId,
      prospect_id: input.prospectId,
      issued_at: issuedAtSeconds,
      expires_at: expiresAtSeconds,
      permissions: [...input.permissions],
    };

    if (input.industry !== undefined) {
      payload.industry = input.industry;
    }

    if (input.experienceVersion !== undefined) {
      payload.experience_version = input.experienceVersion;
    }

    if (input.riskLevel !== undefined) {
      payload.risk_level = input.riskLevel;
    }

    if (input.leadboardDemoSessionId !== undefined) {
      payload.leadboard_demo_session_id = input.leadboardDemoSessionId;
    }

    if (input.leadboardLeadId !== undefined) {
      payload.leadboard_lead_id = input.leadboardLeadId;
    }

    assertNoLeadBoardUserClaims(payload);

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(issuedAtSeconds)
      .setExpirationTime(expiresAtSeconds)
      .sign(getSecretKey(this.config.signingSecret));

    this.logger.info('experience_token.created', {
      experience_session_id: input.experienceSessionId,
      prospect_id: input.prospectId,
      experience_definition_id: input.experienceDefinitionId,
      expires_at: expiresAtSeconds,
      token,
    });

    return token;
  }

  async verifyToken(token: string): Promise<VerifiedExperienceToken> {
    try {
      const { payload } = await jwtVerify(token, getSecretKey(this.config.signingSecret), {
        algorithms: ['HS256'],
      });

      const claims = parseClaims(payload as Record<string, unknown>);

      this.logger.info('experience_token.verified', {
        experience_session_id: claims.experience_session_id,
        prospect_id: claims.prospect_id,
        token,
      });

      return { claims };
    } catch (error) {
      if (
        error instanceof ExperienceTokenExpiredError ||
        error instanceof InvalidExperienceTokenTypeError ||
        error instanceof MissingExperienceTokenClaimError
      ) {
        this.logger.warn('experience_token.verification_failed', {
          error: error.name,
          token,
        });
        throw error;
      }

      if (error instanceof Error && error.name === 'JWTExpired') {
        this.logger.warn('experience_token.verification_failed', {
          error: 'ExperienceTokenExpiredError',
          token,
        });
        throw new ExperienceTokenExpiredError();
      }

      this.logger.warn('experience_token.verification_failed', {
        error: error instanceof Error ? error.name : 'UnknownError',
        token,
      });

      throw new ExperienceTokenVerificationError('Experience token verification failed');
    }
  }
}
