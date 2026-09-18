import { addWeeks, format, startOfWeek } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/cn";
import { freeGaps } from "@/lib/tickly/gaps";
import { formatTime, weekDays } from "@/lib/tickly/time";
import type { CalEvent } from "@/lib/tickly/types";
import { newDraft } from "@/lib/tickly/draft";
import { useSheet } from "@/components/sheet-context";
import { useTickly } from "@/lib/tickly/store";

export function FreeMap({ anchor }: { anchor: Date }) {
  const events = useTickly((s) => s.events);
  const { dayStartHour, dayEndHour, defaultRemind } = useTickly((s) => s.settings);
  const { openNew } = useSheet();
  const days = weekDays(anchor);
  const allGaps = days.map((d) => ({
    day: d,
    gaps: freeGaps(events, d, dayStartHour, dayEndHour, 30),
  }));
  const freeHours =
    allGaps.reduce((n, g) => n + g.gaps.reduce((a, x) => a + x.minutes, 0), 0) / 60;

  return (
    <section className="rounded-3xl bg-canvas-2 p-3 shadow-soft">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold">Giờ rảnh tuần này</h2>
        <p className="text-xs tabular-nums text-muted">{freeHours.toFixed(1)} giờ trống</p>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {allGaps.map(({ day, gaps }) => (
          <div key={day.toISOString()} className="min-w-0">
            <p className="mb-1 text-center text-xs font-medium text-muted capitalize">
              {format(day, "EEE", { locale: vi })}
            </p>
            <div className="flex min-h-24 flex-col gap-1">
              {gaps.slice(0, 4).map((g) => (
                <button
                  key={g.start}
                  type="button"
                  onClick={() =>
                    openNew(
                      newDraft(
                        {
                          start: g.start,
                          end: Math.min(g.end, g.start + 60 * 60 * 1000),
                          category: "focus",
                          title: "",
                        },
                        defaultRemind,
                      ),
                    )
                  }
                  className="rounded-xl bg-done-soft px-1 py-1 text-center text-xs text-done"
                >
                  {formatTime(g.start)}
                </button>
              ))}
              {gaps.length === 0 ? (
                <div className="rounded-xl bg-line/60 px-1 py-3 text-center text-xs text-muted">
                  Kín
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 px-1 text-xs text-muted">Bấm khung trống để biến thành block tự học.</p>
    </section>
  );
}

export function WeekGoalBar() {
  const events = useTickly((s) => s.events);
  const goal = useTickly((s) => s.settings.weekGoalHours);
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = addWeeks(start, 1);
  let mins = 0;
  for (const e of events) {
    if (e.start < start.getTime() || e.start >= end.getTime()) continue;
    if (e.category !== "study" && e.category !== "focus") continue;
    if (e.status === "skipped") continue;
    mins += Math.max(0, (e.end - e.start) / 60000);
  }
  const hours = mins / 60;
  const pct = goal <= 0 ? 0 : Math.min(100, (hours / goal) * 100);
  return (
    <section className="rounded-3xl bg-canvas-2 p-4 shadow-soft">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Mục tiêu học tuần</h2>
        <p className="text-sm tabular-nums text-muted">
          {hours.toFixed(1)} / {goal} giờ
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div
          className={cn("h-full rounded-full", pct >= 100 ? "bg-done" : "bg-accent")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        {pct >= 100
          ? "Đã xếp đủ giờ học tuần này."
          : `Còn ${(goal - hours).toFixed(1)} giờ nữa là đủ mục tiêu.`}
      </p>
    </section>
  );
}
