import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Plus, SunMedium, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useSheet } from "@/components/sheet-context";
import { useTickly } from "@/lib/tickly/store";
import { newDraft } from "@/lib/tickly/draft";

const NAV = [
  { to: "/", label: "Hôm nay", icon: SunMedium },
  { to: "/calendar", label: "Lịch", icon: CalendarDays },
  { to: "/tasks", label: "Việc", icon: CheckCircle2 },
  { to: "/me", label: "Tôi", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { openNew } = useSheet();
  const defaultRemind = useTickly((s) => s.settings.defaultRemind);

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col bg-canvas">
      <header className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-accent uppercase">
            Tickly
          </p>
          <h1 className="text-balance text-xl font-semibold">Lịch của tôi</h1>
        </div>
      </header>
      <main className="flex-1 px-3 pb-28 sm:px-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-end justify-around px-2 pb-3 pt-1">
          {NAV.slice(0, 2).map((item) => (
            <NavItem key={item.to} {...item} active={pathname === item.to} />
          ))}
          <button
            type="button"
            aria-label="Thêm lịch"
            className="-mt-7 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-soft transition duration-200 ease-out hover:brightness-110 active:scale-95"
            onClick={() => {
              openNew(newDraft({}, defaultRemind));
            }}
          >
            <Plus className="size-7" strokeWidth={2.25} />
          </button>
          {NAV.slice(2).map((item) => (
            <NavItem key={item.to} {...item} active={pathname === item.to} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof SunMedium;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1 text-xs font-medium transition duration-200",
        active ? "text-accent" : "text-muted",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
      {label}
    </Link>
  );
}
