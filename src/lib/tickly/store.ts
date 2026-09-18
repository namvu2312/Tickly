import { addDays, addWeeks, setHours, setMinutes, startOfDay } from "date-fns";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CalEvent, ChecklistItem, TicklySettings } from "./types";
import { nid } from "./time";

type State = {
  hydrated: boolean;
  events: CalEvent[];
  settings: TicklySettings;
  notified: string[];
  setHydrated: () => void;
  upsert: (e: CalEvent) => void;
  upsertMany: (list: CalEvent[]) => void;
  remove: (id: string) => void;
  removeSeries: (seriesId: string) => void;
  setStatus: (id: string, status: CalEvent["status"]) => void;
  setChecklist: (id: string, checklist: ChecklistItem[]) => void;
  moveToDay: (id: string, day: Date) => void;
  patchSettings: (p: Partial<TicklySettings>) => void;
  markNotified: (key: string) => void;
  importAll: (events: CalEvent[]) => void;
  mergeEvents: (events: CalEvent[]) => void;
  bumpPomo: (id: string) => void;
  resetDemo: () => void;
};

const defaultSettings: TicklySettings = {
  theme: "system",
  defaultRemind: 10,
  quietStart: "00:30",
  quietEnd: "06:30",
  dayStartHour: 7,
  dayEndHour: 22,
  weekGoalHours: 6,
  pomoWork: 25,
  pomoBreak: 5,
};

function at(d: Date, h: number, m: number) {
  return setMinutes(setHours(d, h), m).getTime();
}

function normalize(e: CalEvent): CalEvent {
  return {
    ...e,
    seriesId: e.seriesId ?? "",
    important: Boolean(e.important),
    pomoDone: e.pomoDone ?? 0,
    checklist: e.checklist ?? [],
    location: e.location ?? "",
    notes: e.notes ?? "",
    remindOffsets: e.remindOffsets?.length ? e.remindOffsets : [10],
    status: e.status ?? "open",
  };
}

function demoEvents(): CalEvent[] {
  const today = startOfDay(new Date());
  const mk = (
    title: string,
    start: number,
    mins: number,
    category: CalEvent["category"],
    extra: Partial<CalEvent> = {},
  ): CalEvent => ({
    id: nid(),
    title,
    start,
    end: start + mins * 60 * 1000,
    category,
    location: "",
    notes: "",
    remindOffsets: [10],
    status: "open",
    checklist: [],
    seriesId: "",
    important: false,
    pomoDone: 0,
    ...extra,
  });

  const series = nid();
  const classStart = at(today, 10, 30);
  const weekly: CalEvent[] = [];
  for (let w = 0; w < 4; w += 1) {
    const day = addDays(today, w * 7);
    // keep weekday of "today" for the sample series
    weekly.push(
      mk("An toàn mạng", at(day, 10, 30), 90, "study", {
        seriesId: series,
        location: "P.201",
      }),
    );
    void classStart;
  }

  return [
    mk("Ôn mật mã AES", at(today, 9, 0), 90, "study", {
      location: "Thư viện",
      checklist: [
        { id: nid(), text: "Đọc slide chương 3", done: true },
        { id: nid(), text: "Làm 5 bài tập", done: false },
      ],
    }),
    ...weekly,
    mk("Đọc slide ATTT", at(today, 14, 0), 60, "focus"),
    mk("Gym nhẹ", at(today, 18, 30), 45, "health"),
    mk("Nộp LAB", at(today, 21, 0), 30, "deadline", { important: true }),
    mk("Tự học React", at(addDays(today, 1), 8, 0), 120, "focus"),
    mk("Thi giữa kỳ ATTT", at(addWeeks(today, 2), 7, 30), 90, "deadline", {
      important: true,
      location: "Hội trường A",
    }),
  ];
}

export const useTickly = create<State>()(
  persist(
    (set, get) => ({
      hydrated: true,
      events: demoEvents(),
      settings: defaultSettings,
      notified: [],
      setHydrated: () => set({ hydrated: true }),
      upsert: (e) =>
        set({
          events: get().events.some((x) => x.id === e.id)
            ? get().events.map((x) => (x.id === e.id ? normalize(e) : x))
            : [...get().events, normalize(e)],
        }),
      upsertMany: (list) => {
        const map = new Map(get().events.map((e) => [e.id, e]));
        for (const e of list) map.set(e.id, normalize(e));
        set({ events: [...map.values()] });
      },
      remove: (id) => set({ events: get().events.filter((e) => e.id !== id) }),
      removeSeries: (seriesId) =>
        set({
          events: get().events.filter((e) => !seriesId || e.seriesId !== seriesId),
        }),
      setStatus: (id, status) =>
        set({
          events: get().events.map((e) => (e.id === id ? { ...e, status } : e)),
        }),
      setChecklist: (id, checklist) =>
        set({
          events: get().events.map((e) =>
            e.id === id ? { ...e, checklist } : e,
          ),
        }),
      moveToDay: (id, day) =>
        set({
          events: get().events.map((e) => {
            if (e.id !== id) return e;
            const next = new Date(e.start);
            next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
            const delta = next.getTime() - e.start;
            return { ...e, start: e.start + delta, end: e.end + delta, status: "open" };
          }),
        }),
      patchSettings: (p) => set({ settings: { ...get().settings, ...p } }),
      markNotified: (key) =>
        set({ notified: [...get().notified.slice(-200), key] }),
      importAll: (events) => set({ events: events.map(normalize) }),
      mergeEvents: (incoming) => {
        const map = new Map(get().events.map((e) => [e.id, e]));
        for (const e of incoming) {
          if (!map.has(e.id)) map.set(e.id, normalize(e));
        }
        set({ events: [...map.values()] });
      },
      bumpPomo: (id) =>
        set({
          events: get().events.map((e) =>
            e.id === id ? { ...e, pomoDone: (e.pomoDone ?? 0) + 1 } : e,
          ),
        }),
      resetDemo: () => set({ events: demoEvents(), notified: [] }),
    }),
    {
      name: "tickly-v3",
      partialize: (s) => ({
        events: s.events,
        settings: s.settings,
        notified: s.notified,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>;
        const events = Array.isArray(p.events)
          ? p.events.map(normalize)
          : current.events;
        return {
          ...current,
          ...p,
          events,
          settings: { ...current.settings, ...(p.settings ?? {}) },
          notified: p.notified ?? [],
          hydrated: true,
        };
      },
    },
  ),
);
