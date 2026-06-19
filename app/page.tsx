import { redirect } from "next/navigation";

// Rădăcina redirecționează către dashboard (middleware-ul decide
// dacă utilizatorul ajunge la /login sau /dashboard).
export default function Home() {
  redirect("/dashboard");
}
