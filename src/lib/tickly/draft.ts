import type { CalEvent } from "./types";
import { nid } from "./time";

export function newDraft(
  partial: Partial<CalEvent> = {},
  defaultRemind = 10,
): CalEvent {
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(Math.ceil((now.getMinutes() + 15) / 15) * 15);
  const s = partial.start ?? now.getTime();
  return {
    id: partial.id ?? nid(),
    title: partial.title ?? "",
    start: s,
    end: partial.end ?? s + 60 * 60 * 1000,
    category: partial.category ?? "personal",
    location: partial.location ?? "",
    notes: partial.notes ?? "",
    remindOffsets: partial.remindOffsets ?? [defaultRemind],
    status: partial.status ?? "open",
    checklist: partial.checklist ?? [],
    seriesId: partial.seriesId ?? "",
    important: partial.important ?? false,
    pomoDone: partial.pomoDone ?? 0,
  };
}
