import type { CalEvent } from "./types";

export type LaidEvent = CalEvent & { col: number; cols: number };

export function packDay(events: CalEvent[]): LaidEvent[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end);
  const groups: CalEvent[][] = [];
  let cluster: CalEvent[] = [];
  let clusterEnd = 0;
  for (const e of sorted) {
    if (!cluster.length || e.start < clusterEnd) {
      cluster.push(e);
      clusterEnd = Math.max(clusterEnd, e.end);
    } else {
      groups.push(cluster);
      cluster = [e];
      clusterEnd = e.end;
    }
  }
  if (cluster.length) groups.push(cluster);

  const out: LaidEvent[] = [];
  for (const g of groups) {
    const cols: number[] = [];
    const colOf = new Map<string, number>();
    for (const e of g) {
      let col = 0;
      while (cols[col] && cols[col] > e.start) col += 1;
      cols[col] = e.end;
      colOf.set(e.id, col);
    }
    const n = cols.length;
    for (const e of g) {
      out.push({ ...e, col: colOf.get(e.id) ?? 0, cols: n });
    }
  }
  return out;
}
