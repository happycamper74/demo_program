import { SignJWT } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import {
  ExperienceTokenExpiredError,
  ExperienceTokenService,
  ForbiddenExperienceTokenPermissionError,
  InvalidExperienceTokenTypeError,
  LeadBoardUserClaimPresentError,
  MissingExperienceTokenClaimError,
  assertNoLeadBoardUserClaims,
  createExperienceTokenConfig,
  createSafeAuthLogger,
  hasExperienceTokenPermission,
  isAllowedExperienceTokenPermission,
  isForbiddenExperienceTokenPermission,
  loadExperienceTokenConfigFromEnv,
  redactTokenFields,
  validateSessionOwnership,
  EXPERIENCE_TOKEN_TYPE,
} from '../src/index.js';

const TEST_SECRET = 'test-signing-secret-not-for-production';

function createService(logger?: ReturnType<typeof createSafeAuthLogger>): ExperienceTokenService {
  return new ExperienceTokenService(createExperienceTokenConfig(TEST_SECRET), logger);
}

function createTokenInput(overrides: Partial<Parameters<ExperienceTokenService['createToken']>[0]> = {}) {
  const issuedAt = new Date();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  return {
    experienceSessionId: 'expsess_123',
    experienceDefinitionId: 'expdef_plumbing_demo_v1',
    prospectId: 'prospect_123',
    permissions: ['experience:view', 'lead:view'] as const,
    issuedAt,
    expiresAt,
    industry: 'plumbing',
    experienceVersion: 'v1',
    ...overrides,
  };
}

async function createResignedToken(
  modifier: (payload: Record<string, unknown>) => void,
): Promise<string> {
  const service = createService();
  const token = await service.createToken(createTokenInput());
  const parts = token.split('.');
  const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;
  modifier(payload);

  const issuedAt = Number(payload.issued_at);
  const expiresAt = Number(payload.expires_at);

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(TEST_SECRET));
}

describe('ExperienceTokenService', () => {
  it('creates and verifies a valid experience token', async () => {
    const service = createService();
    const token = await service.createToken(createTokenInput());

    const verified = await service.verifyToken(token);

    expect(verified.claims.token_type).toBe(EXPERIENCE_TOKEN_TYPE);
    expect(verified.claims.experience_session_id).toBe('expsess_123');
    expect(verified.claims.experience_definition_id).toBe('expdef_plumbing_demo_v1');
    expect(verified.claims.prospect_id).toBe('prospect_123');
    expect(verified.claims.permissions).toEqual(['experience:view', 'lead:view']);
    expect(verified.claims.industry).toBe('plumbing');
    expect(verified.claims.experience_version).toBe('v1');
  });

  it('rejects expired tokens', async () => {
    const service = createService();
    const token = await service.createToken(
      createTokenInput({
        issuedAt: new Date('2020-01-01T00:00:00.000Z'),
        expiresAt: new Date('2020-01-01T01:00:00.000Z'),
      }),
    );

    await expect(service.verifyToken(token)).rejects.toBeInstanceOf(ExperienceTokenExpiredError);
  });

  it('rejects wrong token_type values', async () => {
    const service = createService();
    const token = await createResignedToken((payload) => {
      payload.token_type = 'leadboard_user';
    });

    await expect(service.verifyToken(token)).rejects.toBeInstanceOf(InvalidExperienceTokenTypeError);
  });

  it('rejects tokens with missing required claims', async () => {
    const service = createService();
    const token = await createResignedToken((payload) => {
      delete payload.prospect_id;
    });

    await expect(service.verifyToken(token)).rejects.toBeInstanceOf(MissingExperienceTokenClaimError);
  });

  it('checks allowed permissions and rejects forbidden permissions', async () => {
    expect(isAllowedExperienceTokenPermission('experience:view')).toBe(true);
    expect(isForbiddenExperienceTokenPermission('lead:update')).toBe(true);
    expect(isForbiddenExperienceTokenPermission('settings:read')).toBe(true);
    expect(isForbiddenExperienceTokenPermission('users:manage')).toBe(true);
    expect(isForbiddenExperienceTokenPermission('admin:all')).toBe(true);

    const service = createService();
    await expect(
      service.createToken(
        createTokenInput({
          permissions: ['lead:update'],
        }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenExperienceTokenPermissionError);
  });

  it('does not include LeadBoard user semantics in token claims', async () => {
    const service = createService();
    const token = await service.createToken(createTokenInput());
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));

    expect(payload.user_id).toBeUndefined();
    expect(payload.sub).toBeUndefined();
    expect(payload.org_id).toBeUndefined();
    expect(payload.leadboard_user_id).toBeUndefined();
    expect(payload.token_type).toBe(EXPERIENCE_TOKEN_TYPE);
    expect(() => assertNoLeadBoardUserClaims({ ...payload, user_id: 'user_123' })).toThrow(
      LeadBoardUserClaimPresentError,
    );
  });

  it('never logs raw tokens', async () => {
    const underlyingInfo = vi.fn();
    const logger = createSafeAuthLogger({ info: underlyingInfo, warn: vi.fn() });
    const service = createService(logger);
    const token = await service.createToken(createTokenInput());

    expect(token.length).toBeGreaterThan(0);
    expect(underlyingInfo).toHaveBeenCalled();
    const loggedDetails = underlyingInfo.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(loggedDetails.token).toBe('[REDACTED]');
    expect(JSON.stringify(loggedDetails)).not.toContain(token);
  });

  it('validates session ownership and permissions', async () => {
    const service = createService();
    const token = await service.createToken(
      createTokenInput({
        permissions: ['experience:view', 'lead:transcript:view'],
      }),
    );
    const verified = await service.verifyToken(token);

    validateSessionOwnership(verified.claims, {
      experienceSessionId: 'expsess_123',
      prospectId: 'prospect_123',
      experienceDefinitionId: 'expdef_plumbing_demo_v1',
    });

    expect(hasExperienceTokenPermission(verified.claims, 'lead:transcript:view')).toBe(true);
    expect(hasExperienceTokenPermission(verified.claims, 'discovery:book')).toBe(false);
  });

  it('loads signing secret from environment configuration', () => {
    expect(() => loadExperienceTokenConfigFromEnv({})).toThrow(/EXPERIENCE_TOKEN_SIGNING_SECRET/);
    expect(
      loadExperienceTokenConfigFromEnv({ EXPERIENCE_TOKEN_SIGNING_SECRET: 'secret-from-env' })
        .signingSecret,
    ).toBe('secret-from-env');
  });

  it('redacts token-like fields from log payloads', () => {
    expect(
      redactTokenFields({
        token: 'abc.def.ghi',
        experience_session_id: 'expsess_123',
      }),
    ).toEqual({
      token: '[REDACTED]',
      experience_session_id: 'expsess_123',
    });
  });
});
