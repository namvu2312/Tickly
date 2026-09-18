export type Category =
  | "study"
  | "deadline"
  | "focus"
  | "social"
  | "health"
  | "personal";

export type EventStatus = "open" | "done" | "skipped";

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type CalEvent = {
  id: string;
  title: string;
  start: number;
  end: number;
  category: Category;
  location: string;
  notes: string;
  remindOffsets: number[];
  status: EventStatus;
  checklist: ChecklistItem[];
  seriesId: string;
  important: boolean;
  pomoDone: number;
};

export type ThemePref = "system" | "light" | "dark";

export type TicklySettings = {
  theme: ThemePref;
  defaultRemind: number;
  quietStart: string;
  quietEnd: string;
  dayStartHour: number;
  dayEndHour: number;
  weekGoalHours: number;
  pomoWork: number;
  pomoBreak: number;
  cleanupHour: number;
};

export const CATEGORIES: {
  id: Category;
  label: string;
}[] = [
  { id: "study", label: "Học" },
  { id: "deadline", label: "Deadline" },
  { id: "focus", label: "Tự học" },
  { id: "social", label: "Hoạt động" },
  { id: "health", label: "Sức khỏe" },
  { id: "personal", label: "Cá nhân" },
];

export const DURATION_CHIPS = [25, 30, 45, 60, 90, 120];
export const REMIND_CHIPS = [0, 10, 30, 60];
export const WEEKDAY_CHIPS: { d: number; label: string }[] = [
  { d: 1, label: "T2" },
  { d: 2, label: "T3" },
  { d: 3, label: "T4" },
  { d: 4, label: "T5" },
  { d: 5, label: "T6" },
  { d: 6, label: "T7" },
  { d: 0, label: "CN" },
];
export const REPEAT_WEEKS = [1, 4, 8, 12];

export function blankEventFields() {
  return {
    seriesId: "",
    important: false,
    pomoDone: 0,
  };
}
