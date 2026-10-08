"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { IconMenu, IconLogout } from "@/components/ui/Icons";
import { NotificationBell } from "@/components/layout/NotificationBell";

export function Header({ onMenu }: { onMenu: () => void }) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const name = session?.user?.fullName ?? "";
  const initials = name
    .split(" ")
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Antetul nu mai e o bandă cu linie dedesubt: stă pe aceeași foaie albă ca
  // restul, iar comenzile sunt butoane rotunde, ca în machetă.
  return (
    <header className="sticky top-0 z-10 flex h-20 shrink-0 items-center justify-between bg-white px-4 lg:px-7">
      <button
        className="icon-circle lg:hidden"
        onClick={onMenu}
        aria-label="Meniu"
      >
        <IconMenu className="h-5 w-5" />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-2.5">
        <NotificationBell />
        <div className="hidden text-right sm:block">
          <div className="text-sm font-semibold text-ink">{name}</div>
          <div className="text-xs text-slate-400">{session?.user?.email}</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-semibold text-white">
          {initials}
        </div>
        <button
          className="icon-circle disabled:opacity-60"
          disabled={loading}
          aria-label="Deconectare"
          title="Deconectare"
          onClick={() => {
            setLoading(true);
            signOut({ callbackUrl: "/login" });
          }}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          ) : (
            <IconLogout className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
    </header>
  );
}
