import { InventoryDetail } from "@/components/inventory/InventoryDetail";

export const metadata = { title: "Detalii mașină" };
export const dynamic = "force-dynamic";

export default function InventoryDetailPage({ params }: { params: { id: string } }) {
  return <InventoryDetail id={params.id} />;
}
