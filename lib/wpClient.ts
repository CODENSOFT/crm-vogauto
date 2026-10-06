// Legătura de bază cu site-ul WordPress: datele de acces și apelul brut.
//
// Autentificarea se face cu „Application Password" (WordPress 5.6+), nu cu
// parola contului: se generează din Utilizatori → Profil și poate fi revocată
// oricând, fără să schimbi parola de administrator.

export const SITE = (process.env.WP_URL || "").replace(/\/+$/, "");
const USER = process.env.WP_USER || "";
const PASSWORD = process.env.WP_APP_PASSWORD || "";

/** Categoria în care intră anunțurile (opțional). */
export const CATEGORY = process.env.WP_CATEGORY_ID || "";

/** Tipul de conținut al anunțurilor de pe site-ul lor. */
export const TYPE = "/listing";

export function wordpressConfigured(): boolean {
  return Boolean(SITE && USER && PASSWORD);
}

export function authHeader(): string {
  return "Basic " + Buffer.from(`${USER}:${PASSWORD}`).toString("base64");
}

/** Eroare de la WordPress, cu codul de stare păstrat (ca să deosebim 404). */
export type WpError = Error & { status?: number };

export async function wpFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${SITE}/wp-json/wp/v2${path}`, {
    ...init,
    headers: { Authorization: authHeader(), ...init.headers },
    signal: AbortSignal.timeout(60000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { message?: string }).message || `WordPress a răspuns ${res.status}`;
    const err = new Error(msg) as WpError;
    err.status = res.status;
    throw err;
  }
  return data as Record<string, unknown>;
}
