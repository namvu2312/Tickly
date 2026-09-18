import { createFileRoute } from "@tanstack/react-router";
import { useTickly } from "@/lib/tickly/store";
import { REMIND_CHIPS, type ThemePref } from "@/lib/tickly/types";
import { ensureNotifyPermission } from "@/lib/tickly/remind";
import { cn } from "@/lib/cn";
import { useState } from "react";
import { parseIcs, toIcs } from "@/lib/tickly/ics";

export const Route = createFileRoute("/me")({ component: MePage });

function MePage() {
  const settings = useTickly((s) => s.settings);
  const patch = useTickly((s) => s.patchSettings);
  const events = useTickly((s) => s.events);
  const importAll = useTickly((s) => s.importAll);
  const mergeEvents = useTickly((s) => s.mergeEvents);
  const resetDemo = useTickly((s) => s.resetDemo);
  const [msg, setMsg] = useState("");

  function exportJson() {
    const blob = new Blob([JSON.stringify({ events, settings }, null, 2)], {
      type: "application/json",
    });
    download(blob, "tickly.json");
  }

  function exportIcs() {
    download(new Blob([toIcs(events)], { type: "text/calendar" }), "tickly.ics");
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-4">
      <section className="rounded-3xl bg-canvas-2 p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-semibold">Giao diện</h2>
        <div className="flex gap-2">
          {(["system", "light", "dark"] as ThemePref[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => patch({ theme: t })}
              className={cn(
                "h-11 flex-1 rounded-2xl text-sm font-medium",
                settings.theme === t ? "bg-accent text-white" : "bg-canvas",
              )}
            >
              {t === "system" ? "Hệ thống" : t === "light" ? "Sáng" : "Tối"}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-3xl bg-canvas-2 p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-semibold">Mục tiêu học mỗi tuần</h2>
        <div className="flex flex-wrap gap-2">
          {[4, 6, 8, 10, 12].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => patch({ weekGoalHours: h })}
              className={cn(
                "rounded-2xl px-3 py-2 text-sm font-medium",
                settings.weekGoalHours === h ? "bg-accent text-white" : "bg-canvas",
              )}
            >
              {h} giờ
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-3xl bg-canvas-2 p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-semibold">Pomodoro</h2>
        <div className="flex gap-2">
          {[
            { w: 25, b: 5, label: "25 / 5" },
            { w: 50, b: 10, label: "50 / 10" },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => patch({ pomoWork: p.w, pomoBreak: p.b })}
              className={cn(
                "h-11 flex-1 rounded-2xl text-sm font-medium",
                settings.pomoWork === p.w ? "bg-accent text-white" : "bg-canvas",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Dùng trên block Học hoặc Tự học. Chuông nhẹ khi hết phiên.
        </p>
      </section>
      <section className="rounded-3xl bg-canvas-2 p-4 shadow-soft">
        <h2 className="mb-2 text-sm font-semibold">Dọn checklist</h2>
        <p className="text-sm text-muted">
          Mỗi ngày lúc 20:00, việc con đã tick bị xoá. Việc chưa tick giữ nguyên.
          Tickly cần đang mở (hoặc mở lại sau 20:00) để chạy.
        </p>
      </section>
      <section className="rounded-3xl bg-canvas-2 p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-semibold">Nhắc mặc định</h2>
        <div className="flex flex-wrap gap-2">
          {REMIND_CHIPS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => patch({ defaultRemind: m })}
              className={cn(
                "rounded-2xl px-3 py-2 text-sm font-medium",
                settings.defaultRemind === m ? "bg-accent text-white" : "bg-canvas",
              )}
            >
              {m === 0 ? "Đúng giờ" : `${m} phút`}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 h-11 w-full rounded-2xl bg-canvas text-sm font-semibold"
          onClick={async () => {
            const p = await ensureNotifyPermission();
            setMsg(
              p === "granted"
                ? "Đã bật thông báo trên trình duyệt này."
                : "Trình duyệt chưa cho phép thông báo.",
            );
          }}
        >
          Bật thông báo
        </button>
        {msg ? <p className="mt-2 text-xs text-muted">{msg}</p> : null}
        <p className="mt-2 text-xs text-muted">
          Nhắc khi Tickly đang mở. Trên điện thoại, cài ra màn hình chính để ổn định hơn.
        </p>
      </section>
      <section className="rounded-3xl bg-canvas-2 p-4 shadow-soft">
        <h2 className="mb-3 text-sm font-semibold">Dữ liệu</h2>
        <p className="mb-3 text-sm text-muted">Lịch lưu trên máy này. Xuất file để sao lưu.</p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="h-11 rounded-2xl bg-canvas font-semibold"
            onClick={exportJson}
          >
            Xuất JSON
          </button>
          <button
            type="button"
            className="h-11 rounded-2xl bg-canvas font-semibold"
            onClick={exportIcs}
          >
            Xuất .ics
          </button>
          <label className="flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-canvas font-semibold">
            Nhập JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const data = JSON.parse(await file.text()) as { events?: unknown };
                  if (Array.isArray(data.events)) {
                    importAll(data.events as typeof events);
                    setMsg("Đã nhập JSON.");
                  }
                } catch {
                  setMsg("File không hợp lệ.");
                }
              }}
            />
          </label>
          <label className="flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-canvas font-semibold">
            Nhập .ics
            <input
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const list = parseIcs(await file.text());
                mergeEvents(list);
                setMsg(list.length ? `Đã thêm ${list.length} sự kiện từ .ics.` : "Không thấy sự kiện.");
              }}
            />
          </label>
          <button
            type="button"
            className="h-11 rounded-2xl bg-canvas text-sm font-medium text-muted"
            onClick={resetDemo}
          >
            Khôi phục lịch mẫu
          </button>
        </div>
      </section>
      <p className="text-center text-xs text-muted">Tickly · lịch cá nhân · pha 2</p>
    </div>
  );
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
