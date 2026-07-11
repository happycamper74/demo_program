export class ExperienceDefinitionNotFoundError extends Error {
  constructor(public readonly experienceDefinitionId: string) {
    super(`Experience definition not found: ${experienceDefinitionId}`);
    this.name = 'ExperienceDefinitionNotFoundError';
  }
}

export class ExperienceDefinitionAlreadyExistsError extends Error {
  constructor(
    public readonly slug: string,
    public readonly version: string,
  ) {
    super(`Experience definition already exists for slug "${slug}" and version "${version}"`);
    this.name = 'ExperienceDefinitionAlreadyExistsError';
  }
}
