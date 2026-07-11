import { ExperienceTokenConfigurationError } from './experience-token-errors.js';

export interface ExperienceTokenConfig {
  readonly signingSecret: string;
}

export function createExperienceTokenConfig(signingSecret: string): ExperienceTokenConfig {
  if (!signingSecret || signingSecret.trim().length === 0) {
    throw new ExperienceTokenConfigurationError('Experience token signing secret must not be empty');
  }

  return { signingSecret };
}

export function loadExperienceTokenConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ExperienceTokenConfig {
  const signingSecret = env.EXPERIENCE_TOKEN_SIGNING_SECRET;

  if (!signingSecret) {
    throw new ExperienceTokenConfigurationError(
      'EXPERIENCE_TOKEN_SIGNING_SECRET environment variable is required',
    );
  }

  return createExperienceTokenConfig(signingSecret);
}
