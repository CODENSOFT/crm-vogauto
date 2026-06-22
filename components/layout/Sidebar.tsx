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
  IconCube,
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
  { href: "/dashboard/inventory", label: "Stoc mașini", Icon: IconCube },
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

  const name = session?.user?.fullName ?? "";
  const initials = name
    .split(" ")
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col bg-sidebar-gradient text-slate-200 shadow-elevated transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold tracking-tight text-white shadow-glow ring-1 ring-white/10">
            VA
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide text-white">VOGAUTO</div>
            <div className="text-[11px] font-medium text-sidebar-muted">Management auto</div>
          </div>
        </div>

        <div className="px-5 pb-2 pt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sidebar-muted/80">
            Meniu principal
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map(({ href, label, Icon }) => {
            const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-sidebar-active text-white shadow-inner-top ring-1 ring-white/5"
                    : "text-slate-400 hover:bg-sidebar-hover hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-light shadow-glow" />
                )}
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active ? "text-brand-lighter" : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 flex items-center gap-3 rounded-xl border border-sidebar-border bg-white/[0.03] px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white ring-1 ring-white/10">
            {initials}
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-xs font-semibold text-slate-200">{name}</div>
            <div className="text-[11px] text-sidebar-muted">
              {isAdmin ? "Administrator" : "Angajat"}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
