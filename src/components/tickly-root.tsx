import { useEffect, type ReactNode } from "react";
import { useTickly } from "@/lib/tickly/store";
import { dueReminders, showReminder } from "@/lib/tickly/remind";
import { AppShell } from "@/components/app-shell";
import { EventSheet } from "@/components/event-sheet";
import { SheetProvider } from "@/components/sheet-context";
import { FocusProvider } from "@/components/pomodoro";

export function TicklyRoot({ children }: { children: ReactNode }) {
  const settings = useTickly((s) => s.settings);
  const events = useTickly((s) => s.events);
  const notified = useTickly((s) => s.notified);
  const markNotified = useTickly((s) => s.markNotified);

  useEffect(() => {
    const apply = () => {
      const dark =
        settings.theme === "dark" ||
        (settings.theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);

  useEffect(() => {
    const tick = () => {
      const hits = dueReminders(events, settings, notified);
      for (const h of hits) {
        const when = h.offset === 0 ? "Đúng giờ" : `Còn ${h.offset} phút`;
        showReminder("Tickly", `${when} — ${h.event.title}`);
        markNotified(h.key);
      }
    };
    tick();
    const id = window.setInterval(tick, 20000);
    return () => window.clearInterval(id);
  }, [events, settings, notified, markNotified]);

  return (
    <SheetProvider>
      <FocusProvider>
        <AppShell>{children}</AppShell>
        <EventSheet />
      </FocusProvider>
    </SheetProvider>
  );
}
