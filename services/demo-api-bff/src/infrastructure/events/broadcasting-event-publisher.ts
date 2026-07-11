import type { DomainEventEnvelope, EventPublisher } from '@experience-platform/event-contracts';
import { mapDomainEventToPresentationEvents } from '../../application/presentation-event-mapper.js';
import type { SessionEventStream } from './session-event-stream.js';

export class BroadcastingEventPublisher implements EventPublisher {
  constructor(
    private readonly inner: EventPublisher,
    private readonly stream: SessionEventStream,
  ) {}

  async publish(event: DomainEventEnvelope): Promise<void> {
    await this.inner.publish(event);

    for (const presentationEvent of mapDomainEventToPresentationEvents(event)) {
      this.stream.publish(event.experienceSessionId, presentationEvent);
    }
  }
}
