import type { ExperienceDefinitionServiceLogger } from '../../application/experience-definition-service.js';

export function createConsoleLogger(): ExperienceDefinitionServiceLogger {
  return {
    info(event: string, details: Record<string, unknown>): void {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          severity: 'info',
          event,
          ...details,
        }),
      );
    },
  };
}
