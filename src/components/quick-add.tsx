import { useState } from "react";
import { Sparkles } from "lucide-react";
import { formatParseHint, parseQuickAdd } from "@/lib/tickly/parse";
import { useTickly } from "@/lib/tickly/store";
import { useSheet } from "@/components/sheet-context";
import { ensureNotifyPermission } from "@/lib/tickly/remind";
import { expandWeekly } from "@/lib/tickly/repeat";

export function QuickAdd() {
  const [value, setValue] = useState("");
  const [hint, setHint] = useState("");
  const upsert = useTickly((s) => s.upsert);
  const upsertMany = useTickly((s) => s.upsertMany);
  const defaultRemind = useTickly((s) => s.settings.defaultRemind);
  const { openNew } = useSheet();

  function preview(raw: string) {
    setValue(raw);
    const p = parseQuickAdd(raw);
    if (!p || !raw.trim()) {
      setHint("");
      return;
    }
    setHint(formatParseHint(p));
  }

  async function submit() {
    const p = parseQuickAdd(value);
    if (!p) {
      openNew();
      return;
    }
    const event = { ...p.event, remindOffsets: [defaultRemind] };
    if (p.repeatDays?.length && p.weeks) {
      upsertMany(expandWeekly(event, p.repeatDays, p.weeks));
    } else {
      upsert(event);
    }
    setValue("");
    setHint("Đã thêm");
    await ensureNotifyPermission();
    window.setTimeout(() => setHint(""), 1600);
  }

  return (
    <form
      className="rounded-3xl bg-canvas-2 p-2 shadow-soft"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="ml-2 size-4 shrink-0 text-accent" />
        <input
          value={value}
          onChange={(e) => preview(e.target.value)}
          placeholder='Thêm nhanh: "mỗi thứ 6 21h gym 45 phút"'
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          className="h-11 rounded-2xl bg-accent px-4 text-sm font-semibold text-white"
        >
          Thêm
        </button>
      </div>
      {hint ? <p className="px-3 pb-1 text-xs text-muted">{hint}</p> : null}
    </form>
  );
}
