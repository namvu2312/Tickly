import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Pause, Play, SkipForward, X } from "lucide-react";
import type { CalEvent } from "@/lib/tickly/types";
import { useTickly } from "@/lib/tickly/store";
import { showReminder } from "@/lib/tickly/remind";
import { cn } from "@/lib/cn";

type Mode = "work" | "break";

type FocusCtx = {
  active: CalEvent | null;
  mode: Mode;
  remaining: number;
  running: boolean;
  start: (event: CalEvent) => void;
  stop: () => void;
  toggle: () => void;
  skip: () => void;
};

const Ctx = createContext<FocusCtx | null>(null);

function beep() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.18);
  } catch {
    /* ignore */
  }
}

export function FocusProvider({ children }: { children: ReactNode }) {
  const pomoWork = useTickly((s) => s.settings.pomoWork);
  const pomoBreak = useTickly((s) => s.settings.pomoBreak);
  const bumpPomo = useTickly((s) => s.bumpPomo);
  const [active, setActive] = useState<CalEvent | null>(null);
  const [mode, setMode] = useState<Mode>("work");
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const endAt = useRef(0);
  const lock = useRef(false);

  const start = useCallback(
    (event: CalEvent) => {
      setActive(event);
      setMode("work");
      const secs = Math.max(1, pomoWork) * 60;
      setRemaining(secs);
      endAt.current = Date.now() + secs * 1000;
      setRunning(true);
    },
    [pomoWork],
  );

  const stop = useCallback(() => {
    setActive(null);
    setRunning(false);
    setRemaining(0);
  }, []);

  const toggle = useCallback(() => {
    setRunning((r) => {
      if (r) return false;
      endAt.current = Date.now() + remaining * 1000;
      return true;
    });
  }, [remaining]);

  const finishPhase = useCallback(() => {
    if (lock.current) return;
    lock.current = true;
    window.setTimeout(() => {
      lock.current = false;
    }, 400);
    beep();
    if (mode === "work" && active) {
      bumpPomo(active.id);
      showReminder("Tickly", `Xong 1 pomodoro — ${active.title}`);
      const secs = Math.max(1, pomoBreak) * 60;
      setMode("break");
      setRemaining(secs);
      endAt.current = Date.now() + secs * 1000;
      setRunning(true);
      setActive((e) => (e ? { ...e, pomoDone: (e.pomoDone ?? 0) + 1 } : e));
    } else {
      showReminder("Tickly", "Hết giờ nghỉ — bắt đầu phiên mới");
      const secs = Math.max(1, pomoWork) * 60;
      setMode("work");
      setRemaining(secs);
      endAt.current = Date.now() + secs * 1000;
      setRunning(true);
    }
  }, [active, bumpPomo, mode, pomoBreak, pomoWork]);

  const skip = useCallback(() => {
    finishPhase();
  }, [finishPhase]);

  useEffect(() => {
    if (!running || !active) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) finishPhase();
    }, 250);
    return () => window.clearInterval(id);
  }, [running, active, finishPhase]);

  const value = useMemo(
    () => ({ active, mode, remaining, running, start, stop, toggle, skip }),
    [active, mode, remaining, running, start, stop, toggle, skip],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {active ? (
        <PomodoroOverlay
          title={active.title}
          pomoDone={active.pomoDone}
          mode={mode}
          remaining={remaining}
          running={running}
          workMin={pomoWork}
          breakMin={pomoBreak}
          onStop={stop}
          onToggle={toggle}
          onSkip={skip}
        />
      ) : null}
    </Ctx.Provider>
  );
}

export function useFocus() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFocus");
  return ctx;
}

function PomodoroOverlay({
  title,
  pomoDone,
  mode,
  remaining,
  running,
  workMin,
  breakMin,
  onStop,
  onToggle,
  onSkip,
}: {
  title: string;
  pomoDone: number;
  mode: Mode;
  remaining: number;
  running: boolean;
  workMin: number;
  breakMin: number;
  onStop: () => void;
  onToggle: () => void;
  onSkip: () => void;
}) {
  const total = (mode === "work" ? workMin : breakMin) * 60;
  const pct = total ? Math.min(100, ((total - remaining) / total) * 100) : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const circ = 2 * Math.PI * 52;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-3xl bg-canvas p-5 shadow-soft">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">
              {mode === "work" ? "Tập trung" : "Nghỉ"} · {pomoDone} pomodoro
            </p>
            <p className="text-lg font-semibold">{title}</p>
          </div>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-2xl bg-canvas-2"
            onClick={onStop}
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="relative mx-auto mb-5 size-44">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-line)" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke={mode === "work" ? "var(--color-accent)" : "var(--color-done)"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${circ}`}
              strokeDashoffset={`${((100 - pct) / 100) * circ}`}
            />
          </svg>
          <p className="absolute inset-0 flex items-center justify-center text-4xl font-semibold tabular-nums">
            {mm}:{ss}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl font-semibold text-white",
              mode === "work" ? "bg-accent" : "bg-done",
            )}
          >
            {running ? <Pause className="size-5" /> : <Play className="size-5" />}
            {running ? "Tạm dừng" : "Tiếp tục"}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="flex size-12 items-center justify-center rounded-2xl bg-canvas-2"
            aria-label="Bỏ qua"
          >
            <SkipForward className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
