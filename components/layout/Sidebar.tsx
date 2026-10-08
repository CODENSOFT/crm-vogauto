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
  IconChevronRight,
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
        className={`fixed inset-y-0 left-0 z-30 flex w-[264px] transform flex-col bg-white transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          open ? "translate-x-0 shadow-elevated" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 shrink-0 items-center gap-3 px-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-[13px] font-bold tracking-tight text-white">
            VA
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-[15px] font-bold tracking-tight text-ink">VOGAUTO</div>
            <div className="text-[11px] font-medium text-slate-400">Management auto</div>
          </div>
        </div>

        {/* Lista se poate derula singură: cu zece intrări plus cartonașul de
            jos, pe un ecran de laptop ultimele erau împinse afară. */}
        <nav aria-label="Meniu principal" className="mx-3 mb-3 flex-1 overflow-y-auto rounded-[22px] bg-slate-50/90 p-2.5">
          {nav.map((grup, gi) => (
            <div key={grup.titlu ?? gi} className={gi > 0 ? "mt-4" : ""}>
              {grup.titlu && (
                <p className="px-4 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
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
                        className={`group flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-[background-color,color,box-shadow] duration-150 ease-out ${
                          active
                            ? "bg-ink font-semibold text-white shadow-pill"
                            : "font-medium text-slate-500 hover:bg-white hover:text-ink"
                        }`}
                      >
                        <Icon
                          className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                            active ? "text-white" : "text-slate-400 group-hover:text-ink"
                          }`}
                        />
                        <span className="truncate">{label}</span>
                        {active && <IconChevronRight className="ml-auto h-4 w-4 shrink-0 text-white/70" />}
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
        <div className="shrink-0 px-3 pb-4">
          <div className="flex items-center gap-3 rounded-[18px] border border-slate-200/70 bg-white px-3 py-2.5 shadow-card">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-semibold text-ink">{name}</div>
              <div className="text-[11px] text-slate-400">
                {isAdmin ? "Administrator" : "Angajat"}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
