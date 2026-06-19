"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  IconDashboard,
  IconCar,
  IconChart,
  IconShield,
  IconUsers,
  IconForm,
  IconTrend,
} from "@/components/ui/Icons";

interface NavItem {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => JSX.Element;
}

const WORKER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Înregistrare vânzare", Icon: IconForm },
  { href: "/dashboard/my-sales", label: "Vânzările mele", Icon: IconChart },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Prezentare generală", Icon: IconDashboard },
  { href: "/dashboard/cars", label: "Vânzări", Icon: IconCar },
  { href: "/dashboard/statistics", label: "Statistici", Icon: IconChart },
  { href: "/dashboard/managers", label: "Manageri", Icon: IconTrend },
  { href: "/dashboard/audit", label: "Jurnal audit", Icon: IconShield },
  { href: "/dashboard/users", label: "Utilizatori", Icon: IconUsers },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const nav = isAdmin ? ADMIN_NAV : WORKER_NAV;

  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-slate-900/50 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col bg-sidebar text-slate-200 transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-sm font-bold tracking-tight text-white">
            VA
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-white">VOGAUTO</div>
            <div className="text-[11px] text-sidebar-muted">Management auto</div>
          </div>
        </div>

        <div className="px-4 pb-2 pt-5">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">Meniu</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {nav.map(({ href, label, Icon }) => {
            const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-sidebar-active text-white" : "text-slate-300 hover:bg-sidebar-hover hover:text-white"
                }`}
              >
                {active && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-brand-light" />}
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-5 py-4">
          <div className="text-xs font-medium text-slate-300">{session?.user?.fullName}</div>
          <div className="text-[11px] text-sidebar-muted">{isAdmin ? "Administrator" : "Angajat"}</div>
        </div>
      </aside>
    </>
  );
}
