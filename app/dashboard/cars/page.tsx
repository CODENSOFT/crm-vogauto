import { CarsTable } from "@/components/cars/CarsTable";

export const metadata = { title: "Vânzări" };
export const dynamic = "force-dynamic";

export default function CarsPage() {
  return <CarsTable />;
}
