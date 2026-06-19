import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { SaleForm } from "@/components/sales/SaleForm";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const user = session!.user;

  if (user.role !== "admin") {
    return <SaleForm />;
  }
  return <AdminDashboard name={user.fullName} />;
}
