"use client";

// Starea conexiunilor externe (site, Facebook, Instagram), interogata o data
// la deschiderea paginii. Scoasa din pagina, care trecuse de 170 de linii.

import { useState, useEffect } from "react";

export interface StareCanal { ok: boolean; error?: string }
export interface StareWp extends StareCanal { user?: string }
export interface StareFb extends StareCanal { page?: string }
export interface StareIg extends StareCanal { account?: string }

export function useConnectionStatus() 
{
  const [igConfigured, setIgConfigured] = useState<boolean | null>(null);
  // Motivul exact de la Meta, ca indicatorul să nu spună doar „neconectat".
  const [igStatus, setIgStatus] = useState<{ ok: boolean; account?: string; error?: string } | null>(null);
  const [fbStatus, setFbStatus] = useState<{ ok: boolean; page?: string; error?: string } | null>(null);
  const [wpStatus, setWpStatus] = useState<{ ok: boolean; user?: string; error?: string } | null>(null);

  useEffect(() => {
    fetch("/api/publish/instagram/status").then((r) => r.json())
      .then((d) => { setIgConfigured(!!d.configured); setIgStatus(d); })
      .catch(() => setIgConfigured(false));
    fetch("/api/publish/facebook/status")
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then(setFbStatus)
      .catch(() => setFbStatus({ ok: false }));
    fetch("/api/publish/wordpress/status")
      .then((r) => (r.ok ? r.json() : { ok: false }))
      .then(setWpStatus)
      .catch(() => setWpStatus({ ok: false }));
  }, []);
  return { igConfigured, igStatus, fbStatus, wpStatus };
}
