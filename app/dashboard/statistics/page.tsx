import { StatsView } from "@/components/statistics/StatsView";

export const metadata = { title: "Statistici" };
export const dynamic = "force-dynamic";

export default function StatisticsPage() {
  return <StatsView />;
}
