import type { PresentationEvent } from '../../types/api.js';

type SessionEventListener = (event: PresentationEvent) => void;

export class SessionEventStream {
  private readonly listeners = new Map<string, Set<SessionEventListener>>();

  subscribe(experienceSessionId: string, listener: SessionEventListener): () => void {
    const sessionListeners = this.listeners.get(experienceSessionId) ?? new Set<SessionEventListener>();
    sessionListeners.add(listener);
    this.listeners.set(experienceSessionId, sessionListeners);

    return () => {
      const current = this.listeners.get(experienceSessionId);
      if (!current) {
        return;
      }

      current.delete(listener);
      if (current.size === 0) {
        this.listeners.delete(experienceSessionId);
      }
    };
  }

  publish(experienceSessionId: string, event: PresentationEvent): void {
    const sessionListeners = this.listeners.get(experienceSessionId);
    if (!sessionListeners) {
      return;
    }

    for (const listener of sessionListeners) {
      listener(event);
    }
  }
}
