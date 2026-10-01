"use client";

import { Badge } from "@/components/ui/Table";

/** Antetul paginii Publicare, cu starea conexiunilor externe. */
export function PublishingHeader({
  wpStatus,
  igConfigured,
}: {
  wpStatus: { ok: boolean; user?: string; error?: string } | null;
  igConfigured: boolean | null;
}) {
  return (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Publicare</h1>
      <p className="mt-1 text-sm text-slate-500">Alege pe ce canale apare fiecare mașină. Vândută → dispare automat de peste tot.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      {wpStatus && (
        <span title={wpStatus.ok ? `Conectat ca ${wpStatus.user}` : wpStatus.error}>
          <Badge color={wpStatus.ok ? "green" : "gray"}>Site: {wpStatus.ok ? "conectat" : "neconectat"}</Badge>
        </span>
      )}
      {igConfigured !== null && (
        <span title={igConfigured ? "Postarea automată pe Instagram este activă" : "Instagram neconfigurat — postarea pregătește doar textul"}>
          <Badge color={igConfigured ? "green" : "gray"}>Instagram: {igConfigured ? "conectat" : "neconectat"}</Badge>
        </span>
      )}
    </div>
  </div>
  );
}
