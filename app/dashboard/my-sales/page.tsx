import { MySalesSummary } from "@/components/sales/MySalesSummary";

export const metadata = { title: "Vânzările mele" };
export const dynamic = "force-dynamic";

export default function MySalesPage() {
  return <MySalesSummary />;
}
