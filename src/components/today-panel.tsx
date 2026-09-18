import { differenceInCalendarDays, format, startOfDay } from "date-fns";
import { Check, Clock3, MapPin, Timer } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTickly } from "@/lib/tickly/store";
import { eventsOnDay, formatTime } from "@/lib/tickly/time";
import type { CalEvent, Category } from "@/lib/tickly/types";
import { useSheet } from "@/components/sheet-context";
import { QuickAdd } from "@/components/quick-add";
import { WeekGoalBar } from "@/components/free-map";
import { useFocus } from "@/components/pomodoro";

const CAT_CLASS: Record<Category, string> = {
  study: "bg-cat-study text-cat-study-ink",
  deadline: "bg-cat-deadline text-cat-deadline-ink",
  focus: "bg-cat-focus text-cat-focus-ink",
  social: "bg-cat-social text-cat-social-ink",
  health: "bg-cat-health text-cat-health-ink",
  personal: "bg-cat-personal text-cat-personal-ink",
};

export function TodayPanel() {
  const events = useTickly((s) => s.events);
  const setStatus = useTickly((s) => s.setStatus);
  const moveToDay = useTickly((s) => s.moveToDay);
  const { openEdit } = useSheet();
  const today = new Date();
  const list = eventsOnDay(events, today).sort((a, b) => a.start - b.start);
  const open = list.filter((e) => e.status === "open");
  const done = list.filter((e) => e.status === "done");
  const now = Date.now();
  const happening = open.find((e) => e.start <= now && e.end >= now);
  const upcoming = open.find((e) => e.start > now);
  const next = happening ?? upcoming;
  const total = list.length || 1;
  const progress = done.length / total;
  const startToday = startOfDay(today).getTime();
  const drifted = events
    .filter((e) => e.status === "open" && e.start < startToday)
    .sort((a, b) => a.start - b.start);
  const countdowns = events
    .filter(
      (e) =>
        e.status === "open" &&
        (e.important || e.category === "deadline") &&
        e.start >= startToday,
    )
    .sort((a, b) => a.start - b.start)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      <QuickAdd />
      <section className="flex items-center gap-4 rounded-3xl bg-canvas-2 p-4 shadow-soft">
        <ProgressRing value={progress} label={`${done.length}/${list.length}`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">
            Hôm nay · {format(today, "d/M")}
          </p>
          {next ? (
            <>
              <p className="text-balance text-lg font-semibold">{next.title}</p>
              <p className="text-sm text-muted tabular-nums">
                {happening
                  ? `Đang diễn ra · đến ${formatTime(next.end)}`
                  : `Tới lúc ${formatTime(next.start)}`}
              </p>
            </>
          ) : (
            <p className="text-lg font-semibold">Trống lịch — thêm một block?</p>
          )}
        </div>
      </section>
      <WeekGoalBar />
      {countdowns.length ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Đếm ngược</h2>
          <ul className="flex flex-col gap-2">
            {countdowns.map((e) => {
              const days = differenceInCalendarDays(e.start, today);
              const label =
                days === 0 ? "Hôm nay" : days === 1 ? "Ngày mai" : `Còn ${days} ngày`;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => openEdit(e)}
                    className="flex w-full items-center justify-between rounded-3xl bg-accent-soft px-4 py-3 text-left"
                  >
                    <span className="min-w-0 truncate font-semibold">{e.title}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-accent">
                      {label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {drifted.length ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Túi việc trôi</h2>
          <ul className="flex flex-col gap-2">
            {drifted.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-3xl bg-canvas-2 px-3 py-2 shadow-soft"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium"
                  onClick={() => openEdit(e)}
                >
                  {e.title}
                </button>
                <button
                  type="button"
                  className="h-9 rounded-2xl bg-accent px-3 text-xs font-semibold text-white"
                  onClick={() => moveToDay(e.id, today)}
                >
                  Dời hôm nay
                </button>
                <button
                  type="button"
                  className="h-9 rounded-2xl px-2 text-xs text-muted"
                  onClick={() => setStatus(e.id, "skipped")}
                >
                  Bỏ
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted">Việc trong ngày</h2>
        {list.length === 0 ? (
          <p className="rounded-3xl bg-canvas-2 px-4 py-8 text-center text-sm text-muted">
            Chưa có việc nào. Gõ nhanh phía trên hoặc bấm nút +.
          </p>
        ) : (
          list.map((e) => (
            <EventRow
              key={e.id}
              event={e}
              onOpen={() => openEdit(e)}
              onToggle={() => setStatus(e.id, e.status === "done" ? "open" : "done")}
            />
          ))
        )}
      </section>
      <FreeHint events={open} now={now} />
    </div>
  );
}

function EventRow({
  event,
  onOpen,
  onToggle,
}: {
  event: CalEvent;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const done = event.status === "done";
  const checks = event.checklist;
  const cDone = checks.filter((c) => c.done).length;
  const setChecklist = useTickly((s) => s.setChecklist);
  const { start } = useFocus();
  const canPomo = event.category === "study" || event.category === "focus";
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl shadow-soft",
        CAT_CLASS[event.category],
        done && "opacity-60",
      )}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onToggle}
          className="flex w-12 shrink-0 items-center justify-center"
          aria-label={done ? "Mở lại" : "Đánh dấu xong"}
        >
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-full border-2 border-current",
              done && "border-done bg-done text-white",
            )}
          >
            {done ? <Check className="size-4" /> : null}
          </span>
        </button>
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-3 pr-2 text-left">
          <p className={cn("font-semibold", done && "line-through")}>{event.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs tabular-nums opacity-80">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" />
              {formatTime(event.start)}–{formatTime(event.end)}
            </span>
            {event.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {event.location}
              </span>
            ) : null}
            {checks.length ? (
              <span>
                {cDone}/{checks.length} việc con
              </span>
            ) : null}
            {event.pomoDone ? <span>{event.pomoDone} pomodoro</span> : null}
          </p>
        </button>
        {canPomo && !done ? (
          <button
            type="button"
            className="flex w-12 shrink-0 items-center justify-center"
            aria-label="Pomodoro"
            onClick={() => start(event)}
          >
            <Timer className="size-5" />
          </button>
        ) : null}
      </div>
      {checks.length ? (
        <ul className="flex flex-col gap-1 px-4 pb-3">
          {checks.map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={() =>
                    setChecklist(
                      event.id,
                      event.checklist.map((x) =>
                        x.id === c.id ? { ...x, done: !x.done } : x,
                      ),
                    )
                  }
                  className="size-4 accent-done"
                />
                <span className={cn(c.done && "line-through opacity-70")}>{c.text}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(1, Math.max(0, value));
  return (
    <svg viewBox="0 0 72 72" className="size-16 shrink-0" aria-hidden="true">
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-line)" strokeWidth="6" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="var(--color-done)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 36 36)"
      />
      <text
        x="36"
        y="41"
        textAnchor="middle"
        fill="var(--color-ink)"
        fontSize="11"
        fontWeight="600"
        fontFamily="var(--font-sans)"
      >
        {label}
      </text>
    </svg>
  );
}

function FreeHint({ events, now }: { events: CalEvent[]; now: number }) {
  const next = [...events].filter((e) => e.start > now).sort((a, b) => a.start - b.start)[0];
  if (!next) return null;
  const gap = Math.round((next.start - now) / 60000);
  if (gap < 20) return null;
  return (
    <p className="text-sm text-muted">
      Còn {gap} phút trống trước <span className="font-medium text-ink">{next.title}</span>.
    </p>
  );
}
