import { LeadsView } from "@/components/leads/LeadsView";

export const metadata = { title: "Clienți potențiali" };
export const dynamic = "force-dynamic";

export default function LeadsPage() {
  return <LeadsView />;
}
