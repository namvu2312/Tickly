import type { CalEvent, Category } from "./types";
import { nid } from "./time";

function unfold(raw: string) {
  return raw.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function unescapeIcs(s: string) {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseStamp(value: string, tzHint: string): number | null {
  const v = value.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const hh = Number(m[4] ?? "0");
  const mm = Number(m[5] ?? "0");
  const ss = Number(m[6] ?? "0");
  if (m[7] === "Z") return Date.UTC(y, mo, d, hh, mm, ss);
  if (tzHint.toUpperCase() === "UTC") return Date.UTC(y, mo, d, hh, mm, ss);
  return new Date(y, mo, d, hh, mm, ss).getTime();
}

function field(block: string, name: string): { value: string; params: string } | null {
  const re = new RegExp(`^${name}([^:]*):(.*)$`, "im");
  const hit = block.match(re);
  if (!hit) return null;
  return { params: hit[1] ?? "", value: (hit[2] ?? "").trim() };
}

function guessCategory(title: string): Category {
  const s = title.toLowerCase();
  if (/exam|thi|deadline|nộp|assignment/.test(s)) return "deadline";
  if (/gym|run|yoga|sức khỏe/.test(s)) return "health";
  if (/study|học|lecture|class/.test(s)) return "study";
  return "personal";
}

export function parseIcs(raw: string): CalEvent[] {
  const text = unfold(raw);
  const blocks = text.split(/BEGIN:VEVENT/i).slice(1);
  const out: CalEvent[] = [];
  for (const chunk of blocks) {
    const block = chunk.split(/END:VEVENT/i)[0] ?? "";
    const startF = field(block, "DTSTART");
    const endF = field(block, "DTEND");
    const sumF = field(block, "SUMMARY");
    if (!startF) continue;
    const tz =
      startF.params.match(/TZID=([^;]+)/i)?.[1] ??
      (startF.params.includes("VALUE=DATE") ? "DATE" : "");
    const start = parseStamp(startF.value, tz);
    if (start == null) continue;
    let end = endF ? parseStamp(endF.value, tz) : null;
    if (end == null) end = start + 60 * 60 * 1000;
    const title = unescapeIcs(sumF?.value ?? "Sự kiện");
    const loc = unescapeIcs(field(block, "LOCATION")?.value ?? "");
    out.push({
      id: nid(),
      title: title || "Sự kiện",
      start,
      end,
      category: guessCategory(title),
      location: loc,
      notes: unescapeIcs(field(block, "DESCRIPTION")?.value ?? ""),
      remindOffsets: [10],
      status: "open",
      checklist: [],
      seriesId: "",
      important: /exam|thi|deadline/i.test(title),
      pomoDone: 0,
    });
  }
  return out;
}

function stampLocal(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function escapeIcs(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function toIcs(events: CalEvent[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tickly//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@tickly`,
      `DTSTAMP:${stampLocal(Date.now())}`,
      `DTSTART:${stampLocal(e.start)}`,
      `DTEND:${stampLocal(e.end)}`,
      `SUMMARY:${escapeIcs(e.title)}`,
    );
    if (e.location) lines.push(`LOCATION:${escapeIcs(e.location)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
