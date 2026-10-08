"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  IconDashboard,
  IconUsers,
  IconForm,
  IconTasks,
  IconTarget,
  IconCarSide,
  IconReceipt,
  IconGlobe,
  IconBars,
  IconAward,
  IconHistory,
} from "@/components/ui/Icons";

interface NavItem {
  href: string;
  label: string;
  Icon: (p: { className?: string }) => JSX.Element;
}

interface NavGroup {
  /** Titlul secțiunii. Lipsă = fără titlu (lista angajatului, scurtă). */
  titlu?: string;
  items: NavItem[];
}

const WORKER_NAV: NavGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "Înregistrare vânzare", Icon: IconForm },
      { href: "/dashboard/tasks", label: "Sarcinile mele", Icon: IconTasks },
      { href: "/dashboard/leads", label: "Clienți potențiali", Icon: IconTarget },
      { href: "/dashboard/my-sales", label: "Vânzările mele", Icon: IconReceipt },
    ],
  },
];

// Zece intrări una sub alta se citesc ca o grămadă. Grupate pe ce faci cu ele,
// ochiul găsește pagina fără să parcurgă toată lista.
const ADMIN_NAV: NavGroup[] = [
  {
    titlu: "Zi de zi",
    items: [
      { href: "/dashboard", label: "Prezentare generală", Icon: IconDashboard },
      { href: "/dashboard/tasks", label: "Sarcini", Icon: IconTasks },
      { href: "/dashboard/leads", label: "Clienți potențiali", Icon: IconTarget },
    ],
  },
  {
    titlu: "Mașini",
    items: [
      { href: "/dashboard/inventory", label: "Stoc mașini", Icon: IconCarSide },
      { href: "/dashboard/cars", label: "Vânzări", Icon: IconReceipt },
      { href: "/dashboard/publishing", label: "Publicare", Icon: IconGlobe },
    ],
  },
  {
    titlu: "Analiză",
    items: [
      { href: "/dashboard/statistics", label: "Statistici", Icon: IconBars },
      { href: "/dashboard/managers", label: "Manageri", Icon: IconAward },
    ],
  },
  {
    titlu: "Administrare",
    items: [
      { href: "/dashboard/users", label: "Utilizatori", Icon: IconUsers },
      { href: "/dashboard/audit", label: "Jurnal audit", Icon: IconHistory },
    ],
  },
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
          role="presentation"
          className="fixed inset-0 z-20 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col bg-sidebar-gradient text-slate-200 shadow-elevated transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold tracking-tight text-white shadow-glow ring-1 ring-white/10">
            VA
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-sm font-bold tracking-[0.08em] text-white">VOGAUTO</div>
            <div className="text-[11px] font-medium text-sidebar-muted">Management auto</div>
          </div>
        </div>

        {/* Lista se poate derula singură: cu zece intrări plus cartonașul de
            jos, pe un ecran de laptop ultimele erau împinse afară. */}
        <nav aria-label="Meniu principal" className="flex-1 overflow-y-auto px-3 py-4">
          {nav.map((grup, gi) => (
            <div key={grup.titlu ?? gi} className={gi > 0 ? "mt-5" : ""}>
              {grup.titlu && (
                <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-muted/70">
                  {grup.titlu}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {grup.items.map(({ href, label, Icon }) => {
                  const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-[background-color,color] duration-150 ease-out ${
                          active
                            ? "bg-sidebar-active font-semibold text-white ring-1 ring-white/5"
                            : "font-medium text-slate-400 hover:bg-sidebar-hover hover:text-white"
                        }`}
                      >
                        {active && (
                          <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-brand-light" />
                        )}
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                            active ? "text-brand-lighter" : "text-slate-500 group-hover:text-slate-300"
                          }`}
                        />
                        <span className="truncate">{label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Lipit de marginea de jos, cu linie proprie: nu face parte din meniu,
            ci spune cine ești. */}
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-xs font-bold text-white ring-1 ring-white/10">
              {initials}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-semibold text-slate-100">{name}</div>
              <div className="text-[11px] text-sidebar-muted">
                {isAdmin ? "Administrator" : "Angajat"}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
