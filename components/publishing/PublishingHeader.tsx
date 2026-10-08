"use client";

import { Badge } from "@/components/ui/Table";

/** Antetul paginii Publicare, cu starea conexiunilor externe. */
export function PublishingHeader({
  wpStatus,
  fbStatus,
  igConfigured,
  igStatus,
}: {
  wpStatus: { ok: boolean; user?: string; error?: string } | null;
  fbStatus: { ok: boolean; page?: string; error?: string } | null;
  igConfigured: boolean | null;
  /** Motivul de la Meta, când Instagram nu e conectat. */
  igStatus?: { ok: boolean; account?: string; error?: string } | null;
}) {
  return (
  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-[32px] font-bold leading-[1.12] tracking-[-0.02em] text-ink">Publicare</h1>
      <p className="mt-1 text-sm text-slate-500">Alege pe ce canale apare fiecare mașină. Vândută → dispare automat de peste tot.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      {wpStatus && (
        <span title={wpStatus.ok ? `Conectat ca ${wpStatus.user}` : wpStatus.error}>
          <Badge color={wpStatus.ok ? "green" : "gray"}>Site: {wpStatus.ok ? "conectat" : "neconectat"}</Badge>
        </span>
      )}
      {fbStatus && (
        <span title={fbStatus.ok ? `Pagina: ${fbStatus.page}` : fbStatus.error}>
          <Badge color={fbStatus.ok ? "green" : "gray"}>Facebook: {fbStatus.ok ? "conectat" : "neconectat"}</Badge>
        </span>
      )}
      {igConfigured !== null && (
        <span title={
          igStatus?.ok
            ? `Contul: ${igStatus.account}`
            : igStatus?.error
              ? `Instagram: ${igStatus.error}`
              : "Instagram neconfigurat — postarea pregătește doar textul"
        }>
          <Badge color={igConfigured ? "green" : "gray"}>Instagram: {igConfigured ? "conectat" : "neconectat"}</Badge>
        </span>
      )}
    </div>
  </div>
  );
}
