import { createFileRoute } from "@tanstack/react-router";
import { useTickly } from "@/lib/tickly/store";
import { formatTime } from "@/lib/tickly/time";
import { useSheet } from "@/components/sheet-context";
import { cn } from "@/lib/cn";
import { Check } from "lucide-react";

export const Route = createFileRoute("/tasks")({ component: TasksPage });

function TasksPage() {
  const events = useTickly((s) => s.events);
  const setStatus = useTickly((s) => s.setStatus);
  const setChecklist = useTickly((s) => s.setChecklist);
  const { openEdit } = useSheet();
  const open = [...events]
    .filter((e) => e.status === "open")
    .sort((a, b) => a.start - b.start);
  const done = [...events]
    .filter((e) => e.status === "done")
    .sort((a, b) => b.start - a.start)
    .slice(0, 12);

  return (
    <div className="flex flex-col gap-5">
      <QuickStats open={open.length} done={done.length} />
      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted">Chưa xong</h2>
        {open.length === 0 ? (
          <p className="rounded-3xl bg-canvas-2 px-4 py-8 text-center text-sm text-muted">
            Tất cả đã tích. Thêm việc mới khi sẵn sàng.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {open.map((e) => (
              <li key={e.id} className="rounded-3xl bg-canvas-2 p-3 shadow-soft">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="mt-0.5 flex size-7 items-center justify-center rounded-full border-2 border-muted"
                    onClick={() => setStatus(e.id, "done")}
                    aria-label="Xong"
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => openEdit(e)}
                  >
                    <p className="font-semibold">{e.title}</p>
                    <p className="text-xs text-muted tabular-nums">
                      {formatTime(e.start)}–{formatTime(e.end)}
                    </p>
                  </button>
                </div>
                {e.checklist.length ? (
                  <ul className="mt-2 ml-10 flex flex-col gap-1">
                    {e.checklist.map((c) => (
                      <li key={c.id}>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={c.done}
                            onChange={() =>
                              setChecklist(
                                e.id,
                                e.checklist.map((x) =>
                                  x.id === c.id ? { ...x, done: !x.done } : x,
                                ),
                              )
                            }
                            className="size-4 accent-done"
                          />
                          <span className={cn(c.done && "text-muted line-through")}>
                            {c.text}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      {done.length ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Đã xong</h2>
          <ul className="flex flex-col gap-1">
            {done.map((e) => (
              <li key={e.id} className="flex items-center gap-2 px-2 py-2 text-sm text-muted">
                <Check className="size-4 text-done" />
                <span className="line-through">{e.title}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function QuickStats({ open, done }: { open: number; done: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-3xl bg-accent-soft p-4">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">Còn lại</p>
        <p className="text-2xl font-semibold tabular-nums">{open}</p>
      </div>
      <div className="rounded-3xl bg-done-soft p-4">
        <p className="text-xs font-semibold tracking-wide text-done uppercase">Đã tích</p>
        <p className="text-2xl font-semibold tabular-nums">{done}</p>
      </div>
    </div>
  );
}
