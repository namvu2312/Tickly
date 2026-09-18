import type { CalEvent, TicklySettings } from "./types";

function hmToMin(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function inQuiet(settings: TicklySettings, now: Date) {
  const cur = now.getHours() * 60 + now.getMinutes();
  const a = hmToMin(settings.quietStart);
  const b = hmToMin(settings.quietEnd);
  if (a === b) return false;
  if (a < b) return cur >= a && cur < b;
  return cur >= a || cur < b;
}

export function dueReminders(
  events: CalEvent[],
  settings: TicklySettings,
  notified: string[],
  now = Date.now(),
) {
  if (inQuiet(settings, new Date(now))) return [];
  const hits: { event: CalEvent; offset: number; key: string }[] = [];
  for (const e of events) {
    if (e.status !== "open") continue;
    for (const off of e.remindOffsets) {
      const fireAt = e.start - off * 60 * 1000;
      const key = `${e.id}:${off}`;
      if (notified.includes(key)) continue;
      if (now >= fireAt && now < e.end) {
        hits.push({ event: e, offset: off, key });
      }
    }
  }
  return hits;
}

export async function ensureNotifyPermission() {
  if (typeof Notification === "undefined") return "denied" as const;
  if (Notification.permission === "granted") return "granted" as const;
  if (Notification.permission === "denied") return "denied" as const;
  return Notification.requestPermission();
}

export function showReminder(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.svg" });
  } catch {
    /* ignore */
  }
}
