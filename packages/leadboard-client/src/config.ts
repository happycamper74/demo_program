import type { LeadBoardClient } from './leadboard-client.js';
import { LeadBoardConfigurationError } from './errors.js';
import { MockLeadBoardClient } from './mock-leadboard-client.js';
import { RealLeadBoardClient } from './real-leadboard-client.js';
import type { LeadBoardClientConfig, RealLeadBoardClientConfig } from './types.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function assertRealConfig(config: RealLeadBoardClientConfig | undefined): RealLeadBoardClientConfig {
  const baseUrl = config?.baseUrl?.trim() ?? '';
  const internalApiKey = config?.internalApiKey?.trim() ?? '';

  if (!baseUrl) {
    throw new LeadBoardConfigurationError(
      'LEADBOARD_BASE_URL is required when LEADBOARD_ADAPTER_MODE=real',
    );
  }

  if (!internalApiKey) {
    throw new LeadBoardConfigurationError(
      'LEADBOARD_INTERNAL_API_KEY is required when LEADBOARD_ADAPTER_MODE=real',
    );
  }

  return {
    ...config,
    baseUrl,
    internalApiKey,
  };
}

export function createLeadBoardClient(config: LeadBoardClientConfig): LeadBoardClient {
  if (config.mode === 'real') {
    return new RealLeadBoardClient(assertRealConfig(config.real));
  }

  return new MockLeadBoardClient({
    ...config.mock,
    sharedDemoOrgId: config.sharedDemoOrgId,
    sharedDemoPhoneNumber: config.sharedDemoPhoneNumber,
  });
}

export function loadLeadBoardClientConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): LeadBoardClientConfig {
  const mode = env.LEADBOARD_ADAPTER_MODE === 'real' ? 'real' : 'mock';
  const sharedDemoOrgId = env.LEADBOARD_SHARED_DEMO_ORG_ID?.trim() || 'org_demo_shared';
  const sharedDemoPhoneNumber = env.LEADBOARD_SHARED_DEMO_PHONE_NUMBER?.trim() || '+31201234567';

  if (mode === 'real' && !isUuid(sharedDemoOrgId)) {
    throw new LeadBoardConfigurationError(
      'LEADBOARD_SHARED_DEMO_ORG_ID must be a UUID when LEADBOARD_ADAPTER_MODE=real',
    );
  }

  return {
    mode,
    sharedDemoOrgId,
    sharedDemoPhoneNumber,
    mock: {
      sharedDemoOrgId,
      sharedDemoPhoneNumber,
    },
    real:
      mode === 'real'
        ? {
            baseUrl: env.LEADBOARD_BASE_URL ?? '',
            internalApiKey: env.LEADBOARD_INTERNAL_API_KEY ?? '',
          }
        : undefined,
  };
}
