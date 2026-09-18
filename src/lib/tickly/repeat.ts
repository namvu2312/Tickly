import { addDays, addMinutes, addWeeks, startOfDay } from "date-fns";
import type { CalEvent } from "./types";
import { nid } from "./time";

export function expandWeekly(base: CalEvent, days: number[], weeks: number): CalEvent[] {
  const seriesId = base.seriesId || nid();
  const duration = Math.max(base.end - base.start, 15 * 60 * 1000);
  const start0 = new Date(base.start);
  const mins = start0.getHours() * 60 + start0.getMinutes();
  const origin = startOfDay(start0);
  const until = addWeeks(origin, Math.max(1, weeks));
  const out: CalEvent[] = [];
  let d = origin;
  let first = true;
  while (d.getTime() < until.getTime()) {
    if (days.includes(d.getDay())) {
      const start = addMinutes(d, mins).getTime();
      out.push({
        ...base,
        id: first ? base.id : nid(),
        seriesId,
        start,
        end: start + duration,
        status: first ? base.status : "open",
      });
      first = false;
    }
    d = addDays(d, 1);
  }
  return out.length ? out : [{ ...base, seriesId }];
}
