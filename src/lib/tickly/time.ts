import {
  addDays,
  addMinutes,
  differenceInMinutes,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { vi } from "date-fns/locale";
import type { CalEvent } from "./types";

export const HOUR_PX = 56;
export const SNAP_MIN = 15;

export function dayRange(date: Date, startHour: number, endHour: number) {
  const start = startOfDay(date);
  start.setHours(startHour, 0, 0, 0);
  const end = startOfDay(date);
  end.setHours(endHour, 0, 0, 0);
  return { start, end };
}

export function minutesFromDayStart(ts: number, startHour: number) {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes() - startHour * 60;
}

export function topPx(ts: number, startHour: number) {
  return (minutesFromDayStart(ts, startHour) / 60) * HOUR_PX;
}

export function heightPx(start: number, end: number) {
  const mins = Math.max(differenceInMinutes(end, start), SNAP_MIN);
  return (mins / 60) * HOUR_PX;
}

export function snapMinutes(mins: number) {
  return Math.round(mins / SNAP_MIN) * SNAP_MIN;
}

export function yToTime(y: number, day: Date, startHour: number) {
  const mins = snapMinutes(startHour * 60 + (y / HOUR_PX) * 60);
  const d = startOfDay(day);
  d.setHours(0, 0, 0, 0);
  return addMinutes(d, Math.max(0, mins)).getTime();
}

export function formatTime(ts: number) {
  return format(ts, "HH:mm");
}

export function formatDayHeading(date: Date) {
  return format(date, "EEEE, d MMMM", { locale: vi });
}

export function formatShortDay(date: Date) {
  return format(date, "EEE", { locale: vi });
}

export function weekDays(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function eventsOnDay(events: CalEvent[], day: Date) {
  return events.filter((e) => isSameDay(e.start, day));
}

export function isToday(date: Date) {
  return isSameDay(date, new Date());
}

export function nid() {
  return crypto.randomUUID();
}
