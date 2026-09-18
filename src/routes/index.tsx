import { createFileRoute } from "@tanstack/react-router";
import { TodayPanel } from "@/components/today-panel";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <TodayPanel />;
}
