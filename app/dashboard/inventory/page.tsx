import { InventoryView } from "@/components/inventory/InventoryView";

export const metadata = { title: "Stoc mașini" };
export const dynamic = "force-dynamic";

export default function InventoryPage() {
  return <InventoryView />;
}
