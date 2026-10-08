"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SessionGuard } from "./SessionGuard";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // Aplicația stă într-o carcasă albă rotunjită, care plutește peste fundalul
  // colorat. Pe telefon marginea dispare: acolo fiecare milimetru de lățime
  // contează mai mult decât efectul.
  return (
    <div className="h-screen overflow-hidden bg-app-gradient p-0 lg:p-5">
      <SessionGuard />
      <div className="flex h-full overflow-hidden bg-white lg:rounded-shell lg:shadow-shell">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header onMenu={() => setOpen(true)} />
          <main className="flex-1 overflow-y-auto px-4 pb-8 pt-1 lg:px-7">
            <div className="mx-auto min-w-0 max-w-7xl animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
