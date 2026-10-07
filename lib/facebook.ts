import { META_BASE } from "@/lib/metaApi";
// Postarea anunțurilor pe pagina de Facebook, prin Graph API.
// Folosește un Page Access Token (același sistem ca Instagram, care oricum
// merge prin Facebook), cu permisiunile pages_manage_posts + pages_read_engagement.

const BASE = META_BASE;

export function facebookConfigured(): boolean {
  return Boolean(process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN);
}

/** Urcă o poză fără să o publice, ca să o putem atașa unei postări cu mai multe imagini. */
async function uploadUnpublished(pageId: string, token: string, url: string): Promise<string> {
  const res = await fetch(`${BASE}/${pageId}/photos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, published: false, access_token: token }),
    signal: AbortSignal.timeout(25000),
  });
  const d = await res.json();
  if (!res.ok || d.error) throw new Error(d.error?.message || "Nu am putut urca poza pe Facebook.");
  return String(d.id);
}

/**
 * Publică anunțul pe pagina de Facebook. Întoarce id-ul postării.
 * O singură poză → postare cu imagine; mai multe → o postare cu toate pozele.
 */
export async function postToFacebook(imageUrls: string[], message: string): Promise<string> {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) {
    throw new Error("Facebook neconfigurat (lipsesc FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN).");
  }

  const urls = imageUrls.filter(Boolean).slice(0, 10);
  if (urls.length === 0) throw new Error("Nicio poză de publicat.");

  // O singură poză: postare directă, cu textul ca descriere.
  if (urls.length === 1) {
    const res = await fetch(`${BASE}/${pageId}/photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: urls[0], caption: message, access_token: token }),
      signal: AbortSignal.timeout(25000),
    });
    const d = await res.json();
    if (!res.ok || d.error) throw new Error(d.error?.message || "Postarea pe Facebook a eșuat.");
    return String(d.post_id ?? d.id);
  }

  // Mai multe poze: le urcăm nepublicate, apoi le atașăm la o singură postare.
  const mediaIds: string[] = [];
  for (const url of urls) mediaIds.push(await uploadUnpublished(pageId, token, url));

  const res = await fetch(`${BASE}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      attached_media: mediaIds.map((id) => ({ media_fbid: id })),
      access_token: token,
    }),
    signal: AbortSignal.timeout(30000),
  });
  const d = await res.json();
  if (!res.ok || d.error) throw new Error(d.error?.message || "Postarea pe Facebook a eșuat.");
  return String(d.id);
}

/** Verifică tokenul și întoarce numele paginii (pentru indicatorul din CRM). */
export async function checkFacebook(): Promise<{ ok: boolean; page?: string; error?: string }> {
  const pageId = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) return { ok: false, error: "Lipsesc datele de conectare." };
  try {
    const res = await fetch(`${BASE}/${pageId}?fields=name&access_token=${encodeURIComponent(token)}`, {
      signal: AbortSignal.timeout(15000),
    });
    const d = await res.json();
    if (!res.ok || d.error) return { ok: false, error: d.error?.message || "Token invalid." };
    return { ok: true, page: String(d.name ?? pageId) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Eroare necunoscută" };
  }
}
