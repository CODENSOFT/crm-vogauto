// Pozele mașinilor, duse în biblioteca media a site-ului lor.
//
// Galeria temei citește atașamentele anunțului, nu adrese externe, deci pozele
// trebuie să ajungă efectiv la ei, nu doar să fie legate din CRM.

import { SITE, authHeader, wpFetch } from "@/lib/wpClient";

export interface UploadedPhoto {
  id: number;
  url: string;
}

/** Numele fișierului din adresa noastră, fără extensie și fără caractere ciudate. */
function stemOf(url: string): string {
  const last = url.split("?")[0].split("/").pop() || "poza";
  return last.replace(/\.[a-z0-9]+$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "poza";
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Urcă o poză în biblioteca lor media. `postId` o leagă de anunț, ca galeria
 * temei să o găsească (tema citește atașamentele anunțului, nu adrese externe).
 */
async function uploadPhoto(imageUrl: string, name: string, postId?: string): Promise<UploadedPhoto | null> {
  try {
    const img = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
    if (!img.ok) return null;
    const buf = Buffer.from(await img.arrayBuffer());
    const type = img.headers.get("content-type") || "image/jpeg";
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";

    const media = await wpFetch(`/media${postId ? `?post=${postId}` : ""}`, {
      method: "POST",
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${name}.${ext}"`,
      },
      body: new Uint8Array(buf),
    });
    if (!media.id) return null;
    return { id: Number(media.id), url: String(media.source_url ?? "") };
  } catch (e) {
    console.error("[wordpress:media]", e);
    return null;
  }
}

/** Compatibilitate: doar imaginea reprezentativă. */
export async function uploadFeaturedImage(imageUrl: string, name: string): Promise<string | null> {
  const up = await uploadPhoto(imageUrl, name);
  return up ? String(up.id) : null;
}

/** Pozele deja urcate pentru acest anunț (ca să nu le încărcăm de două ori). */
async function existingPhotos(postId: string): Promise<UploadedPhoto[]> {
  try {
    const res = await fetch(
      `${SITE}/wp-json/wp/v2/media?parent=${postId}&per_page=100&_fields=id,source_url`,
      { headers: { Authorization: authHeader() }, signal: AbortSignal.timeout(30000) },
    );
    if (!res.ok) return [];
    const list = (await res.json()) as { id: number; source_url: string }[];
    return list.map((m) => ({ id: m.id, url: m.source_url }));
  } catch {
    return [];
  }
}

/**
 * Pune pozele mașinii în biblioteca lor, legate de anunț.
 *
 * Fiecare poză primește un nume previzibil (`marca-model-an-3.jpg`), așa că o
 * recunoaștem la următoarea trimitere și nu o mai urcăm. Fără asta, adăugarea
 * unei singure poze ar fi reîncărcat întreg setul, umplând biblioteca lor cu
 * duplicate la fiecare salvare.
 */
export async function syncPhotos(
  postId: string,
  urls: string[],
  baseName: string,
): Promise<UploadedPhoto[]> {
  if (urls.length === 0) return [];

  const already = await existingPhotos(postId);
  const out: UploadedPhoto[] = [];

  for (const url of urls) {
    // Numele vine din fișierul nostru, care e unic, nu din poziția în listă:
    // dacă se șterge o poză din mijloc, restul nu se încurcă între ele.
    const name = `${baseName}-${stemOf(url)}`;
    // WordPress adaugă un sufix dacă fișierul există deja („...-1.jpg"),
    // de aceea acceptăm și forma cu sufix.
    const found = already.find((m) => new RegExp(`/${escapeRe(name)}(-\\d+)?\\.[a-z0-9]+$`, "i").test(m.url));
    if (found) {
      out.push(found);
      continue;
    }
    const up = await uploadPhoto(url, name, postId);
    if (up) out.push(up);
  }
  return out;
}
