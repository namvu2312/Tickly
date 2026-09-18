import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CalEvent } from "@/lib/tickly/types";

type Draft = Partial<CalEvent> & { open: boolean };

type Ctx = {
  draft: Draft;
  openNew: (partial?: Partial<CalEvent>) => void;
  openEdit: (event: CalEvent) => void;
  close: () => void;
};

const SheetCtx = createContext<Ctx | null>(null);

export function SheetProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>({ open: false });
  const openNew = useCallback((partial?: Partial<CalEvent>) => {
    setDraft({ open: true, ...partial });
  }, []);
  const openEdit = useCallback((event: CalEvent) => {
    setDraft({ open: true, ...event });
  }, []);
  const close = useCallback(() => setDraft({ open: false }), []);
  const value = useMemo(
    () => ({ draft, openNew, openEdit, close }),
    [draft, openNew, openEdit, close],
  );
  return <SheetCtx.Provider value={value}>{children}</SheetCtx.Provider>;
}

export function useSheet() {
  const ctx = useContext(SheetCtx);
  if (!ctx) throw new Error("useSheet");
  return ctx;
}
