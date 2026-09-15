import { CarDetail } from "@/components/cars/CarDetail";

export const metadata = { title: "Detalii vânzare" };
export const dynamic = "force-dynamic";

export default function CarDetailPage({ params }: { params: { id: string } }) {
  return <CarDetail id={params.id} />;
}
