import { Drawer } from "vaul";
import { useEffect, useMemo, useState } from "react";
import { addDays, addMinutes, format, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import { Plus, Star, Timer, Trash2 } from "lucide-react";
import { useSheet } from "@/components/sheet-context";
import { useTickly } from "@/lib/tickly/store";
import {
  CATEGORIES,
  DURATION_CHIPS,
  REMIND_CHIPS,
  REPEAT_WEEKS,
  WEEKDAY_CHIPS,
  type CalEvent,
  type Category,
  type ChecklistItem,
} from "@/lib/tickly/types";
import { nid } from "@/lib/tickly/time";
import { cn } from "@/lib/cn";
import { ensureNotifyPermission } from "@/lib/tickly/remind";
import { expandWeekly } from "@/lib/tickly/repeat";
import { conflictsFor } from "@/lib/tickly/gaps";
import { newDraft } from "@/lib/tickly/draft";
import { useFocus } from "@/components/pomodoro";

const CAT_CHIP: Record<Category, string> = {
  study: "bg-cat-study text-cat-study-ink",
  deadline: "bg-cat-deadline text-cat-deadline-ink",
  focus: "bg-cat-focus text-cat-focus-ink",
  social: "bg-cat-social text-cat-social-ink",
  health: "bg-cat-health text-cat-health-ink",
  personal: "bg-cat-personal text-cat-personal-ink",
};

export function EventSheet() {
  const { draft, close } = useSheet();
  const events = useTickly((s) => s.events);
  const upsert = useTickly((s) => s.upsert);
  const upsertMany = useTickly((s) => s.upsertMany);
  const remove = useTickly((s) => s.remove);
  const removeSeries = useTickly((s) => s.removeSeries);
  const defaultRemind = useTickly((s) => s.settings.defaultRemind);
  const pomoWork = useTickly((s) => s.settings.pomoWork);
  const pomoBreak = useTickly((s) => s.settings.pomoBreak);
  const { start: startPomo } = useFocus();
  const [form, setForm] = useState<CalEvent | null>(null);
  const [repeatOn, setRepeatOn] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatWeeks, setRepeatWeeks] = useState(4);

  useEffect(() => {
    if (!draft.open) {
      setForm(null);
      return;
    }
    const next = newDraft(draft, defaultRemind);
    setForm(next);
    setRepeatOn(Boolean(next.seriesId));
    setRepeatDays([new Date(next.start).getDay()]);
    setRepeatWeeks(4);
  }, [draft, defaultRemind]);

  const duration = form ? Math.round((form.end - form.start) / 60000) : 60;
  const exists = form ? events.some((e) => e.id === form.id) : false;
  const clashes = useMemo(
    () => (form ? conflictsFor(events, form) : []),
    [events, form],
  );

  function patch(p: Partial<CalEvent>) {
    setForm((f) => (f ? { ...f, ...p } : f));
  }

  async function save() {
    if (!form) return;
    const title = form.title.trim() || "Việc mới";
    const payload = { ...form, title };
    if (repeatOn && repeatDays.length) {
      upsertMany(expandWeekly(payload, repeatDays, repeatWeeks));
    } else {
      upsert({ ...payload, seriesId: payload.seriesId });
    }
    close();
    await ensureNotifyPermission();
  }

  return (
    <Drawer.Root
      open={draft.open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
      repositionInputs={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[min(92dvh,760px)] w-full max-w-lg flex-col rounded-t-3xl bg-canvas outline-none"
        >
          <div className="flex shrink-0 flex-col items-center pt-3">
            <div className="h-1.5 w-10 rounded-full bg-line" />
            <Drawer.Title className="sr-only">Thêm hoặc sửa việc</Drawer.Title>
          </div>
          {form ? (
            <>
              <div className="tickly-sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-3">
                <div className="flex flex-col gap-3">
                  <input
                    autoFocus
                    value={form.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder="Tên việc…"
                    className="w-full rounded-2xl bg-canvas-2 px-4 py-3 text-lg font-semibold outline-none placeholder:text-muted"
                  />
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((c) => (
                      <Chip
                        key={c.id}
                        active={form.category === c.id}
                        onClick={() => patch({ category: c.id })}
                        className={form.category === c.id ? CAT_CHIP[c.id] : undefined}
                      >
                        {c.label}
                      </Chip>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => patch({ important: !form.important })}
                    className={cn(
                      "flex h-11 items-center justify-center gap-2 rounded-2xl text-sm font-semibold",
                      form.important ? "bg-accent-soft text-accent" : "bg-canvas-2",
                    )}
                  >
                    <Star
                      className="size-4"
                      fill={form.important ? "currentColor" : "none"}
                    />
                    {form.important ? "Đếm ngược việc này" : "Gắn đếm ngược"}
                  </button>
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                      Ngày
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {Array.from({ length: 7 }, (_, i) =>
                        addDays(startOfDay(new Date()), i),
                      ).map((d) => {
                        const active = startOfDay(form.start).getTime() === d.getTime();
                        return (
                          <button
                            key={d.toISOString()}
                            type="button"
                            onClick={() => {
                              const next = new Date(form.start);
                              next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                              const delta = next.getTime() - form.start;
                              patch({ start: next.getTime(), end: form.end + delta });
                              setRepeatDays([d.getDay()]);
                            }}
                            className={cn(
                              "min-w-14 rounded-2xl px-2 py-2 text-center text-xs font-medium",
                              active ? "bg-accent text-white" : "bg-canvas-2 text-ink",
                            )}
                          >
                            <div className="capitalize">
                              {format(d, "EEE", { locale: vi })}
                            </div>
                            <div className="text-sm font-semibold">{format(d, "d")}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">
                      Bắt đầu
                    </span>
                    <input
                      type="time"
                      value={format(form.start, "HH:mm")}
                      onChange={(e) => {
                        const [h, m] = e.target.value.split(":").map(Number);
                        const next = new Date(form.start);
                        next.setHours(h || 0, m || 0, 0, 0);
                        patch({
                          start: next.getTime(),
                          end: next.getTime() + duration * 60000,
                        });
                      }}
                      className="w-full rounded-2xl bg-canvas-2 px-4 py-3 font-medium tabular-nums outline-none"
                    />
                  </label>
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                      Thời lượng
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {DURATION_CHIPS.map((m) => (
                        <Chip
                          key={m}
                          active={duration === m}
                          onClick={() =>
                            patch({ end: addMinutes(form.start, m).getTime() })
                          }
                        >
                          {m} phút
                        </Chip>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                      Lặp theo tuần
                    </p>
                    <button
                      type="button"
                      onClick={() => setRepeatOn((v) => !v)}
                      className={cn(
                        "mb-2 h-11 w-full rounded-2xl text-sm font-semibold",
                        repeatOn ? "bg-accent text-white" : "bg-canvas-2",
                      )}
                    >
                      {repeatOn ? "Đang lặp hàng tuần" : "Không lặp"}
                    </button>
                    {repeatOn ? (
                      <>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {WEEKDAY_CHIPS.map((w) => (
                            <Chip
                              key={w.d}
                              active={repeatDays.includes(w.d)}
                              onClick={() =>
                                setRepeatDays((cur) =>
                                  cur.includes(w.d)
                                    ? cur.filter((x) => x !== w.d)
                                    : [...cur, w.d],
                                )
                              }
                            >
                              {w.label}
                            </Chip>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {REPEAT_WEEKS.map((w) => (
                            <Chip
                              key={w}
                              active={repeatWeeks === w}
                              onClick={() => setRepeatWeeks(w)}
                            >
                              {w} tuần
                            </Chip>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                      Nhắc trước
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {REMIND_CHIPS.map((m) => (
                        <Chip
                          key={m}
                          active={form.remindOffsets[0] === m}
                          onClick={() => patch({ remindOffsets: [m] })}
                        >
                          {m === 0 ? "Đúng giờ" : `${m} phút`}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  {clashes.length ? (
                    <p className="rounded-2xl bg-cat-deadline px-3 py-2 text-sm text-cat-deadline-ink">
                      Trùng {clashes[0]?.title}. Vẫn có thể lưu.
                    </p>
                  ) : null}
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-semibold tracking-wide text-muted uppercase">
                      Địa điểm
                    </span>
                    <input
                      value={form.location}
                      onChange={(e) => patch({ location: e.target.value })}
                      placeholder="Tuỳ chọn"
                      className="w-full rounded-2xl bg-canvas-2 px-4 py-3 outline-none"
                    />
                  </label>
                  <ChecklistEditor
                    items={form.checklist}
                    onChange={(checklist) => patch({ checklist })}
                  />
                  {form.category === "study" || form.category === "focus" ? (
                    <button
                      type="button"
                      className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-done-soft text-sm font-semibold text-done"
                      onClick={() => {
                        const title = form.title.trim() || "Tự học";
                        upsert({ ...form, title });
                        close();
                        startPomo({ ...form, title });
                      }}
                    >
                      <Timer className="size-4" />
                      Pomodoro {pomoWork}/{pomoBreak}
                      {form.pomoDone ? ` · đã ${form.pomoDone}` : ""}
                    </button>
                  ) : null}
                  {exists && form.seriesId ? (
                    <button
                      type="button"
                      className="py-1 text-sm text-muted"
                      onClick={() => {
                        removeSeries(form.seriesId);
                        close();
                      }}
                    >
                      Xóa cả chuỗi lặp
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 gap-2 border-t border-line bg-canvas px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {exists ? (
                  <button
                    type="button"
                    className="flex size-12 items-center justify-center rounded-2xl bg-cat-deadline text-cat-deadline-ink"
                    onClick={() => {
                      remove(form.id);
                      close();
                    }}
                    aria-label="Xóa"
                  >
                    <Trash2 className="size-5" />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="h-12 flex-1 rounded-2xl bg-canvas-2 font-semibold"
                  onClick={close}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="h-12 flex-1 rounded-2xl bg-accent font-semibold text-white"
                  onClick={save}
                >
                  Lưu
                </button>
              </div>
            </>
          ) : null}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl px-3 py-2 text-sm font-medium transition duration-200",
        className ?? (active ? "bg-accent text-white" : "bg-canvas-2 text-ink"),
      )}
    >
      {children}
    </button>
  );
}

function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
        Checklist
      </p>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={it.done}
              onChange={() =>
                onChange(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))
              }
              className="size-4 accent-done"
            />
            <span className={cn("flex-1 text-sm", it.done && "text-muted line-through")}>
              {it.text}
            </span>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onChange([...items, { id: nid(), text: text.trim(), done: false }]);
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Thêm việc con"
          className="flex-1 rounded-2xl bg-canvas-2 px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          className="flex size-10 items-center justify-center rounded-2xl bg-canvas-2"
          aria-label="Thêm việc con"
        >
          <Plus className="size-4" />
        </button>
      </form>
    </div>
  );
}
