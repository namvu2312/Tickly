import { addMinutes, startOfDay } from "date-fns";
import type { CalEvent } from "./types";
import { eventsOnDay } from "./time";

export type Gap = {
  day: Date;
  start: number;
  end: number;
  minutes: number;
};

export function overlaps(a: CalEvent, b: CalEvent) {
  return a.id !== b.id && a.start < b.end && b.start < a.end;
}

export function conflictsFor(events: CalEvent[], candidate: CalEvent) {
  return events.filter((e) => e.status !== "skipped" && overlaps(e, candidate));
}

export function freeGaps(
  events: CalEvent[],
  day: Date,
  startHour: number,
  endHour: number,
  minMinutes = 30,
): Gap[] {
  const origin = startOfDay(day);
  const from = addMinutes(origin, startHour * 60).getTime();
  const to = addMinutes(origin, endHour * 60).getTime();
  const busy = eventsOnDay(events, day)
    .filter((e) => e.status !== "skipped")
    .sort((a, b) => a.start - b.start);
  const gaps: Gap[] = [];
  let cursor = from;
  for (const e of busy) {
    const s = Math.max(e.start, from);
    const t = Math.min(e.end, to);
    if (t <= from || s >= to) continue;
    if (s - cursor >= minMinutes * 60 * 1000) {
      gaps.push({
        day,
        start: cursor,
        end: s,
        minutes: Math.round((s - cursor) / 60000),
      });
    }
    cursor = Math.max(cursor, t);
  }
  if (to - cursor >= minMinutes * 60 * 1000) {
    gaps.push({
      day,
      start: cursor,
      end: to,
      minutes: Math.round((to - cursor) / 60000),
    });
  }
  return gaps;
}

