import { addDays, addWeeks, nextDay, setHours, setMinutes, startOfDay } from "date-fns";
import type { CalEvent, Category } from "./types";
import { nid } from "./time";

const WEEKDAY: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  "chủ nhật": 0,
  cn: 0,
  "thứ 2": 1,
  t2: 1,
  "thứ 3": 2,
  t3: 2,
  "thứ 4": 3,
  t4: 3,
  "thứ 5": 4,
  t5: 4,
  "thứ 6": 5,
  t6: 5,
  "thứ 7": 6,
  t7: 6,
};

const CAT_HINTS: { re: RegExp; cat: Category }[] = [
  { re: /deadline|nộp|bài tập|lab/, cat: "deadline" },
  { re: /gym|chạy|yoga|ngủ|ăn/, cat: "health" },
  { re: /ôn|học|môn|slide|thi/, cat: "study" },
  { re: /pomodoro|tự học|đọc|focus/, cat: "focus" },
  { re: /clb|hẹn|bạn|nhóm/, cat: "social" },
];

export type ParseResult = {
  event: CalEvent;
  repeatDays?: number[];
  weeks?: number;
};

function clock(h: string, m?: string) {
  return { h: Math.min(23, Number(h)), m: m ? Math.min(59, Number(m)) : 0 };
}

function parseClocks(s: string) {
  const range = s.match(
    /(?:từ\s*)?(\d{1,2})\s*[h:]\s*(\d{2})?\s*(?:-|–|đến|toi|tới)\s*(\d{1,2})\s*[h:]\s*(\d{2})?/,
  );
  if (range) {
    return {
      start: clock(range[1]!, range[2]),
      end: clock(range[3]!, range[4]),
    };
  }
  const one =
    s.match(/\b(\d{1,2})\s*[h:]\s*(\d{2})\b/) ||
    s.match(/\b(\d{1,2})\s*h\b/) ||
    s.match(/\b(\d{1,2}):(\d{2})\b/);
  if (one) return { start: clock(one[1]!, one[2]), end: null };
  return { start: null, end: null };
}

export function parseQuickAdd(raw: string, now = new Date()): ParseResult | null {
  const input = raw.trim();
  if (!input) return null;
  const s = input.toLowerCase();

  let day = startOfDay(now);
  const nextWeek = /\btuần sau\b/.test(s);
  if (/\bngày mai\b|\bmai\b/.test(s)) day = addDays(day, 1);
  else if (/\bhôm nay\b/.test(s)) day = startOfDay(now);

  let pickedDow: number | null = null;
  for (const [label, dow] of Object.entries(WEEKDAY)) {
    if (s.includes(label)) {
      pickedDow = dow;
      day = startOfDay(nextDay(now, dow));
      if (isSameWeekday(now, dow) && !nextWeek) day = startOfDay(now);
      if (nextWeek) day = addWeeks(startOfDay(day), day.getDay() === now.getDay() ? 1 : 0);
      if (nextWeek && isSameWeekday(now, dow)) day = addDays(startOfDay(now), 7);
      break;
    }
  }

  const clocks = parseClocks(s);
  let hour = 9;
  let minute = 0;
  if (clocks.start) {
    hour = clocks.start.h;
    minute = clocks.start.m;
  } else if (/\btối\b/.test(s)) hour = 20;
  else if (/\bsáng\b/.test(s)) hour = 8;
  else if (/\bchiều\b/.test(s)) hour = 14;
  else if (/deadline|nộp/.test(s)) {
    hour = 23;
    minute = 59;
  }

  let duration = 60;
  const minM = s.match(/(\d+)\s*(phút|phut)/);
  const hrM = s.match(/(\d+(?:[.,]\d+)?)\s*(tiếng|gio|giờ)/);
  if (clocks.start && clocks.end) {
    duration = clocks.end.h * 60 + clocks.end.m - (clocks.start.h * 60 + clocks.start.m);
    if (duration <= 0) duration += 24 * 60;
  } else if (minM) duration = Number(minM[1]);
  else if (hrM) duration = Math.round(Number(hrM[1]!.replace(",", ".")) * 60);

  const start = setMinutes(setHours(day, hour), minute).getTime();
  const end = start + duration * 60 * 1000;

  let category: Category = "personal";
  for (const h of CAT_HINTS) {
    if (h.re.test(s)) {
      category = h.cat;
      break;
    }
  }

  const weekly = /\b(mỗi|hang tuần|hàng tuần|cả kỳ|ca ky)\b/.test(s);
  const weeks = /\bcả kỳ\b|\bca ky\b/.test(s) ? 12 : weekly ? 8 : undefined;
  const repeatDays = weekly && pickedDow != null ? [pickedDow] : weekly ? [day.getDay()] : undefined;

  const title = cap(stripMeta(input));
  return {
    event: {
      id: nid(),
      title: title || "Việc mới",
      start,
      end,
      category,
      location: "",
      notes: "",
      remindOffsets: [10],
      status: "open",
      checklist: [],
      seriesId: "",
      important: category === "deadline",
      pomoDone: 0,
    },
    repeatDays,
    weeks,
  };
}

export function formatParseHint(r: ParseResult) {
  const t = new Date(r.event.start);
  const e = new Date(r.event.end);
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(t.getHours())}:${pad(t.getMinutes())}–${pad(e.getHours())}:${pad(e.getMinutes())}`;
  const extra = r.weeks ? ` · lặp ${r.weeks} tuần` : "";
  return `${r.event.title} · ${t.getDate()}/${t.getMonth() + 1} ${time}${extra}`;
}

function cap(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isSameWeekday(d: Date, dow: number) {
  return d.getDay() === dow;
}

function stripMeta(input: string) {
  return input
    .replace(/\b(hôm nay|ngày mai|mai|tối nay|tối|sáng|chiều|tuần sau|mỗi|hàng tuần|hang tuần|cả kỳ|ca ky)\b/gi, "")
    .replace(/\b(thứ\s*[2-7]|chủ nhật|t[2-7]|cn)\b/gi, "")
    .replace(/\b(từ|đến|toi|tới)\b/gi, "")
    .replace(/\b\d{1,2}\s*[h:]\s*\d{0,2}\b/gi, "")
    .replace(/\b\d+\s*(phút|phut|tiếng|gio|giờ)\b/gi, "")
    .replace(/[-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
