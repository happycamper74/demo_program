import type { DomainEventEnvelope } from '@experience-platform/event-contracts';

export class InMemoryEventPublisher {
  private readonly publishedEvents: DomainEventEnvelope[] = [];

  async publish(event: DomainEventEnvelope): Promise<void> {
    this.publishedEvents.push(event);
  }

  getPublishedEvents(): readonly DomainEventEnvelope[] {
    return [...this.publishedEvents];
  }

  clear(): void {
    this.publishedEvents.length = 0;
  }
}
