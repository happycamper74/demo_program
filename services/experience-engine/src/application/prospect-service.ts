import type { Prospect, UpsertProspectInput } from '@experience-platform/shared-types';
import { createCorrelationId } from '../domain/experience-definition.js';
import { createProspectEntity, updateProspectEntity } from '../domain/prospect.js';
import type { ProspectRepository } from '../repositories/prospect-repository.js';

export interface ProspectServiceLogger {
  info(event: string, details: Record<string, unknown>): void;
}

export class ProspectService {
  constructor(
    private readonly repository: ProspectRepository,
    private readonly logger: ProspectServiceLogger,
  ) {}

  async upsert(input: UpsertProspectInput): Promise<Prospect> {
    const existingByEmail = await this.repository.findByEmail(input.email);
    const existingByPhone = await this.repository.findByPhoneNumber(input.phoneNumber);
    const existing = existingByEmail ?? existingByPhone;

    if (!existing) {
      const created = await this.repository.create(createProspectEntity(input));

      this.logger.info('prospect.created', {
        correlationId: createCorrelationId(),
        component: 'experience-engine',
        prospectId: created.prospectId,
      });

      return created;
    }

    const updated = await this.repository.update(updateProspectEntity(existing, input));

    this.logger.info('prospect.updated', {
      correlationId: createCorrelationId(),
      component: 'experience-engine',
      prospectId: updated.prospectId,
    });

    return updated;
  }

  async getById(prospectId: string): Promise<Prospect | null> {
    return this.repository.findById(prospectId);
  }

  async findByEmail(email: string): Promise<Prospect | null> {
    return this.repository.findByEmail(email);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Prospect | null> {
    return this.repository.findByPhoneNumber(phoneNumber);
  }
}
