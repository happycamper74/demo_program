import { randomUUID } from 'node:crypto';
import type { DiscoverySlot } from './types.js';

const SUGGESTED_PAGE_SIZE = 3;

function buildSlotPool(now: Date = new Date()): DiscoverySlot[] {
  const slots: DiscoverySlot[] = [];
  const base = new Date(now);
  base.setHours(9, 30, 0, 0);

  for (let dayOffset = 1; dayOffset <= 7; dayOffset += 1) {
    for (const hour of [9, 11, 14, 16]) {
      const startsAt = new Date(base);
      startsAt.setDate(base.getDate() + dayOffset);
      startsAt.setHours(hour, dayOffset % 2 === 0 ? 30 : 0, 0, 0);

      slots.push({
        slotId: `slot_${randomUUID()}`,
        startsAt: startsAt.toISOString(),
        display: formatDisplay(startsAt, dayOffset),
      });
    }
  }

  return slots;
}

function formatDisplay(startsAt: Date, dayOffset: number): string {
  const hours = startsAt.getHours().toString().padStart(2, '0');
  const minutes = startsAt.getMinutes().toString().padStart(2, '0');
  const dayLabel = dayOffset === 1 ? 'Tomorrow' : `In ${dayOffset} days`;
  return `${dayLabel} ${hours}:${minutes}`;
}

export class DiscoverySlotCatalog {
  private readonly slots: DiscoverySlot[];

  constructor(now?: Date) {
    this.slots = buildSlotPool(now);
  }

  getSuggestedSlots(cursor?: string | null): { slots: DiscoverySlot[]; nextCursor: string | null } {
    const offset = cursor ? Number.parseInt(cursor, 10) : 0;
    const page = this.slots.slice(offset, offset + SUGGESTED_PAGE_SIZE);
    const nextOffset = offset + SUGGESTED_PAGE_SIZE;
    const nextCursor = nextOffset < this.slots.length ? String(nextOffset) : null;

    return {
      slots: page,
      nextCursor,
    };
  }

  findSlot(slotId: string): DiscoverySlot | null {
    return this.slots.find((slot) => slot.slotId === slotId) ?? null;
  }
}

export { SUGGESTED_PAGE_SIZE };
