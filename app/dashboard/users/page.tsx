import { UsersView } from "@/components/users/UsersView";

export const metadata = { title: "Utilizatori" };
export const dynamic = "force-dynamic";

export default function UsersPage() {
  return <UsersView />;
}
