"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// Gardă de sesiune pe client. Două roluri:
//  1) Butonul „Înapoi" după deconectare: când pagina e restaurată din cache-ul
//     de navigare (bfcache), forțăm reîncărcarea ca să treacă prin verificarea
//     de autentificare în loc să afișeze conținut vechi din cont.
//  2) Dacă sesiunea devine invalidă (cont dezactivat/șters/expirat), trimitem
//     imediat utilizatorul la /login.
export function SessionGuard() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      // Pagina vine din bfcache (ex: utilizatorul a apăsat „Înapoi").
      if (e.persisted) window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
