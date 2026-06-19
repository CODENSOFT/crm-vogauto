import { AuditView } from "@/components/audit/AuditView";

export const metadata = { title: "Jurnal audit" };
export const dynamic = "force-dynamic";

export default function AuditPage() {
  return <AuditView />;
}
