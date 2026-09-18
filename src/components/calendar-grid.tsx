import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { packDay } from "@/lib/tickly/layout";
import { useTickly } from "@/lib/tickly/store";
import {
  HOUR_PX,
  eventsOnDay,
  formatTime,
  heightPx,
  isToday,
  topPx,
  weekDays,
  yToTime,
} from "@/lib/tickly/time";
import type { CalEvent, Category } from "@/lib/tickly/types";
import { useSheet } from "@/components/sheet-context";
import { newDraft } from "@/lib/tickly/draft";
import { freeGaps } from "@/lib/tickly/gaps";
import { FreeMap } from "@/components/free-map";

const CAT_CLASS: Record<Category, string> = {
  study: "bg-cat-study text-cat-study-ink",
  deadline: "bg-cat-deadline text-cat-deadline-ink",
  focus: "bg-cat-focus text-cat-focus-ink",
  social: "bg-cat-social text-cat-social-ink",
  health: "bg-cat-health text-cat-health-ink",
  personal: "bg-cat-personal text-cat-personal-ink",
};

type Mode = "day" | "three" | "week";

export function CalendarGrid() {
  const events = useTickly((s) => s.events);
  const { dayStartHour, dayEndHour, defaultRemind } = useTickly((s) => s.settings);
  const upsert = useTickly((s) => s.upsert);
  const { openNew, openEdit } = useSheet();
  const [anchor, setAnchor] = useState(() => new Date());
  const [mode, setMode] = useState<Mode>("day");

  const days =
    mode === "week"
      ? weekDays(anchor)
      : mode === "three"
        ? [addDays(anchor, -1), anchor, addDays(anchor, 1)]
        : [anchor];

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let h = dayStartHour; h < dayEndHour; h += 1) list.push(h);
    return list;
  }, [dayStartHour, dayEndHour]);

  const gridH = hours.length * HOUR_PX;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <IconBtn
            label="Trước"
            onClick={() =>
              setAnchor(addDays(anchor, mode === "week" ? -7 : mode === "three" ? -3 : -1))
            }
          >
            <ChevronLeft className="size-5" />
          </IconBtn>
          <button
            type="button"
            className="min-h-11 rounded-2xl px-3 text-sm font-semibold capitalize"
            onClick={() => setAnchor(new Date())}
          >
            {mode === "week"
              ? `Tuần ${format(days[0]!, "d/M")}–${format(days[6]!, "d/M")}`
              : format(anchor, "EEE d/M")}
          </button>
          <IconBtn
            label="Sau"
            onClick={() =>
              setAnchor(addDays(anchor, mode === "week" ? 7 : mode === "three" ? 3 : 1))
            }
          >
            <ChevronRight className="size-5" />
          </IconBtn>
        </div>
        <div className="flex rounded-2xl bg-canvas-2 p-1 text-xs font-semibold">
          {(["day", "three", "week"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-xl px-2.5 py-1.5",
                mode === m ? "bg-canvas text-accent shadow-soft" : "text-muted",
              )}
            >
              {m === "day" ? "Ngày" : m === "three" ? "3 ngày" : "Tuần"}
            </button>
          ))}
        </div>
      </div>
      <FreeMap anchor={anchor} />
      <div className="overflow-hidden rounded-3xl bg-canvas-2 shadow-soft">
        <div
          className="grid border-b border-line"
          style={{ gridTemplateColumns: `3rem repeat(${days.length}, minmax(0,1fr))` }}
        >
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="px-1 py-2 text-center">
              <div className="text-xs font-medium text-muted capitalize">{format(d, "EEE")}</div>
              <div
                className={cn(
                  "mx-auto mt-1 flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                  isToday(d) ? "bg-accent text-white" : "",
                )}
              >
                {format(d, "d")}
              </div>
            </div>
          ))}
        </div>
        <div className="max-h-[70dvh] overflow-auto">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `3rem repeat(${days.length}, minmax(0,1fr))`,
              height: gridH,
            }}
          >
            <div className="relative">
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute right-1 -translate-y-2 text-xs tabular-nums text-muted"
                  style={{ top: i * HOUR_PX }}
                >
                  {String(h).padStart(2, "0")}
                </div>
              ))}
            </div>
            {days.map((d) => (
              <DayColumn
                key={d.toISOString()}
                day={d}
                hours={hours}
                events={eventsOnDay(events, d)}
                startHour={dayStartHour}
                endHour={dayEndHour}
                gridH={gridH}
                allEvents={events}
                onEmpty={(ts) =>
                  openNew(
                    newDraft(
                      { start: ts, end: ts + 60 * 60 * 1000, title: "" },
                      defaultRemind,
                    ),
                  )
                }
                onSelect={openEdit}
                onMove={(e, start, end) => upsert({ ...e, start, end })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  day,
  hours,
  events,
  startHour,
  endHour,
  gridH,
  allEvents,
  onEmpty,
  onSelect,
  onMove,
}: {
  day: Date;
  hours: number[];
  events: CalEvent[];
  startHour: number;
  endHour: number;
  gridH: number;
  allEvents: CalEvent[];
  onEmpty: (ts: number) => void;
  onSelect: (e: CalEvent) => void;
  onMove: (e: CalEvent, start: number, end: number) => void;
}) {
  const packed = packDay(events);
  const nowTop = isToday(day) ? topPx(Date.now(), startHour) : null;
  const gaps = freeGaps(allEvents, day, startHour, endHour, 45);

  return (
    <div
      className="relative border-l border-line"
      style={{ height: gridH }}
      onClick={(ev) => {
        if (ev.target !== ev.currentTarget) return;
        const rect = ev.currentTarget.getBoundingClientRect();
        const y = ev.clientY - rect.top;
        onEmpty(yToTime(y, day, startHour));
      }}
    >
      {hours.map((_, i) => (
        <div
          key={i}
          className="pointer-events-none absolute inset-x-0 border-t border-line/80"
          style={{ top: i * HOUR_PX }}
        />
      ))}
      {gaps.map((g) => (
        <button
          key={g.start}
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            onEmpty(g.start);
          }}
          className="absolute inset-x-0.5 z-0 rounded-2xl bg-done/10"
          style={{
            top: topPx(g.start, startHour),
            height: heightPx(g.start, g.end),
          }}
          aria-label={`Rảnh ${formatTime(g.start)}`}
        />
      ))}
      {nowTop != null && nowTop >= 0 && nowTop <= gridH ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-accent"
          style={{ top: nowTop }}
        >
          <span className="absolute -left-1 -top-1 size-2.5 rounded-full bg-accent" />
        </div>
      ) : null}
      {packed.map((e) => (
        <EventBlock
          key={e.id}
          event={e}
          startHour={startHour}
          onSelect={() => onSelect(e)}
          onMove={(start, end) => onMove(e, start, end)}
        />
      ))}
    </div>
  );
}

function EventBlock({
  event,
  startHour,
  onSelect,
  onMove,
}: {
  event: CalEvent & { col: number; cols: number };
  startHour: number;
  onSelect: () => void;
  onMove: (start: number, end: number) => void;
}) {
  const top = topPx(event.start, startHour);
  const h = Math.max(heightPx(event.start, event.end), 22);
  const width = `calc(${100 / event.cols}% - 4px)`;
  const left = `calc(${(event.col / event.cols) * 100}% + 2px)`;
  const done = event.status === "done";
  const moved = useRef(false);

  return (
    <button
      type="button"
      onClick={() => {
        if (moved.current) return;
        onSelect();
      }}
      onPointerDown={(ev) => {
        if (ev.button !== 0) return;
        moved.current = false;
        const startY = ev.clientY;
        const origS = event.start;
        const dur = event.end - event.start;
        const move = (p: PointerEvent) => {
          const dy = p.clientY - startY;
          if (Math.abs(dy) > 6) moved.current = true;
          const dm = Math.round(((dy / HOUR_PX) * 60) / 15) * 15;
          const ns = origS + dm * 60000;
          onMove(ns, ns + dur);
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
      className={cn(
        "absolute z-10 overflow-hidden rounded-2xl px-1.5 py-1 text-left shadow-soft",
        CAT_CLASS[event.category],
        done && "opacity-50",
      )}
      style={{ top, height: h, width, left }}
    >
      <div className="truncate text-xs font-semibold leading-tight">
        {done ? "✓ " : ""}
        {event.title}
      </div>
      {h > 36 ? (
        <div className="truncate text-xs tabular-nums opacity-80">
          {formatTime(event.start)}–{formatTime(event.end)}
        </div>
      ) : null}
    </button>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-2xl bg-canvas-2"
    >
      {children}
    </button>
  );
}
