export const FIRST_HOUR = 7;
export const LAST_HOUR = 23;
export const SLOT_MINUTES = 15;
export const SLOT_HEIGHT = 25;
export const SLOT_COUNT = ((LAST_HOUR - FIRST_HOUR) * 60) / SLOT_MINUTES;

export function slotFromStart(start: string) {
  const date = new Date(start);
  return ((date.getHours() - FIRST_HOUR) * 60 + date.getMinutes()) / SLOT_MINUTES;
}

export function startFromSlot(date: string, slot: number) {
  const start = new Date(`${date}T00:00:00`);
  start.setHours(FIRST_HOUR, slot * SLOT_MINUTES, 0, 0);
  return start.toISOString();
}

export function clampSlot(slot: number, durationSlots = 1) {
  return Math.max(0, Math.min(SLOT_COUNT - durationSlots, Math.round(slot)));
}

export function taskModalX(columnLeft: number, columnRight: number, viewportWidth: number) {
  const right = columnRight - 9;
  if (right + 320 <= viewportWidth) return right;
  return Math.max(8, Math.min(columnLeft + 15 - 6 - 320, viewportWidth - 328));
}

export function nearestFreeSlot(
  preferredSlot: number,
  occupied: { start: number; duration: number }[],
  durationSlots = 2,
) {
  const preferred = clampSlot(preferredSlot, durationSlots);
  const maxSlot = SLOT_COUNT - durationSlots;
  for (let offset = 0; offset <= maxSlot; offset++) {
    for (const slot of offset ? [preferred + offset, preferred - offset] : [preferred]) {
      if (slot < 0 || slot > maxSlot) continue;
      if (occupied.every((task) => slot + durationSlots <= task.start || slot >= task.start + task.duration)) {
        return slot;
      }
    }
  }
  return null;
}
