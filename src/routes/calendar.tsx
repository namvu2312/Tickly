import { createFileRoute } from "@tanstack/react-router";
import { CalendarGrid } from "@/components/calendar-grid";

export const Route = createFileRoute("/calendar")({ component: CalendarPage });

function CalendarPage() {
  return <CalendarGrid />;
}
