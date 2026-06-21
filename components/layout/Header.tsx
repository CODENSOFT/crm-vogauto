"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { IconMenu, IconLogout } from "@/components/ui/Icons";

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

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md lg:px-6">
      <button
        className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
        onClick={onMenu}
        aria-label="Meniu"
      >
        <IconMenu />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden text-right sm:block">
          <div className="text-sm font-semibold text-slate-800">{name}</div>
          <div className="text-xs text-slate-500">{session?.user?.email}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-sm ring-2 ring-white">
          {initials}
        </div>
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
        <Button
          variant="secondary"
          loading={loading}
          onClick={() => {
            setLoading(true);
            signOut({ callbackUrl: "/login" });
          }}
        >
          <IconLogout className="h-4 w-4" />
          <span className="hidden sm:inline">Deconectare</span>
        </Button>
      </div>
    </header>
  );
}
