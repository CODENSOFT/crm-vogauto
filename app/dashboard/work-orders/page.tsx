import { WorkOrdersView } from "@/components/workorders/WorkOrdersView";

export const metadata = { title: "Lucrări" };
export const dynamic = "force-dynamic";

export default function WorkOrdersPage() {
  return <WorkOrdersView />;
}
