import { TasksView } from "@/components/tasks/TasksView";

export const metadata = { title: "Sarcini" };
export const dynamic = "force-dynamic";

export default function TasksPage() {
  return <TasksView />;
}
