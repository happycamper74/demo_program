import { ExperienceDefinitionService } from './application/experience-definition-service.js';
import { createDatabase } from './infrastructure/database/connection.js';
import { createConsoleLogger } from './infrastructure/logging/console-logger.js';
import { SqliteExperienceDefinitionRepository } from './infrastructure/repositories/sqlite-experience-definition-repository.js';

export function createExperienceDefinitionService(
  databasePath?: string,
): ExperienceDefinitionService {
  const database = createDatabase({ filePath: databasePath });
  const repository = new SqliteExperienceDefinitionRepository(database);
  return new ExperienceDefinitionService(repository, createConsoleLogger());
}

export { SqliteExperienceDefinitionRepository } from './infrastructure/repositories/sqlite-experience-definition-repository.js';

export { ExperienceDefinitionService } from './application/experience-definition-service.js';
export {
  ExperienceDefinitionAlreadyExistsError,
  ExperienceDefinitionNotFoundError,
} from './domain/experience-definition-errors.js';
export {
  activateExperienceDefinition,
  buildExperienceDefinitionId,
  createExperienceDefinitionEntity,
  deactivateExperienceDefinition,
} from './domain/experience-definition.js';
