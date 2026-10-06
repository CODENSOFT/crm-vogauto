// Publicarea anunțurilor în WordPress, prin REST API (wp-json).
//
// Autentificarea se face cu „Application Password" (WordPress 5.6+), nu cu
// parola contului: se generează din Utilizatori → Profil și poate fi revocată
// oricând, fără să schimbi parola de administrator.

import { staticTerms, type TaxonomyInput } from "@/lib/wpTaxonomy";
import { CATEGORY, TYPE, SITE, authHeader, wpFetch, wordpressConfigured } from "@/lib/wpClient";

export { syncPhotos, uploadFeaturedImage } from "@/lib/wpMedia";
import type { UploadedPhoto } from "@/lib/wpMedia";
export type { UploadedPhoto };

export { wordpressConfigured };

export interface ListingContent {
  title: string;
  description: string;
}

/**
 * Textul anunțului. Doar descrierea — nimic altceva.
 *
 * Specificațiile și prețul sunt deja scrise în câmpurile temei, iar ea le
 * afișează în tabelul ei. Dacă le-am pune și aici, apăreau de două ori pe
 * aceeași pagină.
 */
export function buildPostContent(c: ListingContent): string {
  if (!c.description) return "";
  return esc(c.description)
    .split(/\n{2,}/)
    .map((par) => `<p>${par.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}


export interface PublishResult {
  postId: string;
  url: string;
  /** Termenii aplicați, ca să-i putem scrie și în câmpurile temei. */
  terms: Record<string, number[]>;
}

/** Termenii unei taxonomii, după nume. Ținuți în memorie: se schimbă rar. */
const termCache = new Map<string, Map<string, number>>();

async function termsOf(tax: string): Promise<Map<string, number>> {
  const cached = termCache.get(tax);
  if (cached) return cached;
  const map = new Map<string, number>();
  try {
    const res = await fetch(`${SITE}/wp-json/wp/v2/${tax}?per_page=100&_fields=id,name`, {
      headers: { Authorization: authHeader() },
      signal: AbortSignal.timeout(30000),
    });
    if (res.ok) {
      const list = (await res.json()) as { id: number; name: string }[];
      for (const t of list) map.set(t.name.trim().toLowerCase(), t.id);
    }
  } catch (e) {
    console.error(`[wordpress:terms:${tax}]`, e);
  }
  termCache.set(tax, map);
  return map;
}

/**
 * Marca și modelul, căutate printre termenii existenți. Dacă nu există, lăsăm
 * taxonomia goală — nu creăm termeni noi, ca structura site-ului să rămână
 * neatinsă.
 */
async function lookupTerms(c: TaxonomyInput): Promise<Record<string, number[]>> {
  const out: Record<string, number[]> = {};
  const find = async (tax: string, value?: string | null) => {
    if (!value) return;
    const id = (await termsOf(tax)).get(value.trim().toLowerCase());
    if (id !== undefined) out[tax] = [id];
  };
  await find("listing_make", c.brand);
  await find("listing_model", c.model);
  return out;
}

/**
 * Anunțul acestei mașini, căutat pe site după marca ei unică.
 *
 * Plasa de siguranță împotriva duplicatelor: dacă id-ul anunțului lipsește din
 * baza noastră (o expirare la mijlocul publicării, de pildă), îl găsim aici în
 * loc să creăm un al doilea anunț pentru aceeași mașină.
 */
async function findByCrmId(crmId: string, title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${SITE}/wp-json/wp/v2/listing?status=any&per_page=50&orderby=id&order=desc` +
      `&search=${encodeURIComponent(title)}&_fields=id`,
      { headers: { Authorization: authHeader() }, signal: AbortSignal.timeout(30000) },
    );
    if (!res.ok) return null;
    const list = (await res.json()) as { id: number }[];
    for (const row of list) {
      const f = await fetch(`${SITE}/wp-json/vogauto-crm/v1/listing/${row.id}/fields`, {
        headers: { Authorization: authHeader() }, signal: AbortSignal.timeout(20000),
      });
      if (!f.ok) continue;
      const data = (await f.json()) as { fields?: Record<string, string> };
      if (data.fields?._vogauto_crm_id === crmId) return String(row.id);
    }
  } catch (e) {
    console.error("[wordpress:findByCrmId]", e);
  }
  return null;
}

/** Creează sau actualizează anunțul mașinii. Întoarce id-ul și adresa publică. */
export async function publishListing(opts: {
  postId?: string | null;
  title: string;
  content: string;
  featuredMediaId?: string | null;
  /** Id-ul mașinii din CRM, pentru regăsirea anunțului ei. */
  crmId?: string;
  /** Specificațiile, pentru filtrele de pe site. */
  specs?: TaxonomyInput;
  /** Ciornă = invizibil pentru vizitatori (folosit la primul test). */
  draft?: boolean;
}): Promise<PublishResult> {
  const body: Record<string, unknown> = {
    title: opts.title,
    content: opts.content,
    status: opts.draft ? "draft" : "publish",
  };
  if (opts.featuredMediaId) body.featured_media = Number(opts.featuredMediaId);
  if (CATEGORY) body.listing_category = [Number(CATEGORY)];

  let terms: Record<string, number[]> = {};
  if (opts.specs) {
    terms = { ...staticTerms(opts.specs), ...(await lookupTerms(opts.specs)) };
    Object.assign(body, terms);
  }

  const send = (path: string) => wpFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  // Fără id în baza noastră, întrebăm site-ul dacă mașina are deja un anunț.
  let postId = opts.postId;
  if (!postId && opts.crmId) {
    postId = await findByCrmId(opts.crmId, opts.title);
  }

  let post: Record<string, unknown>;
  try {
    post = await send(postId ? `${TYPE}/${postId}` : TYPE);
  } catch (e) {
    // Anunțul a fost șters între timp din panoul WordPress: în loc să dăm
    // eroare la fiecare salvare, îl creăm din nou.
    const status = (e as { status?: number }).status;
    if (postId && (status === 404 || status === 410)) {
      post = await send(TYPE);
    } else {
      throw e;
    }
  }

  return { postId: String(post.id), url: String(post.link ?? ""), terms };
}

/**
 * Tema lor (WP CarDealer) nu citește datele din taxonomii când afișează un
 * anunț, ci din câmpuri proprii, cu prefixul `_listing_`. Taxonomiile servesc
 * filtrele din catalog, câmpurile servesc pagina anunțului — deci le scriem pe
 * amândouă. Ruta e adăugată de modulul nostru de punte, instalat pe site.
 */
export interface ListingFields {
  /** Id-ul mașinii din CRM, folosit ca marcă unică pe anunț. */
  crmId: string;
  price: number;
  /** Preț înainte de reducere. Site-ul îl arată tăiat lângă cel curent. */
  oldPrice?: number | null;
  year: number;
  mileage?: number | null;
  /** Capacitatea motorului, în cm³. */
  engineSize?: number | null;
  title: string;
  description?: string | null;
  /** Pozele urcate în biblioteca lor, în ordinea din CRM. */
  photos?: UploadedPhoto[];
}

export async function writeListingFields(
  postId: string,
  f: ListingFields,
  terms: Record<string, number[]>,
): Promise<string[]> {
  // Câmpurile cu o singură valoare primesc id-ul simplu; cele pe care tema le
  // ține ca listă (culoare, tip ofertă) primesc listă.
  const AS_LIST = new Set(["listing_color", "listing_offer_type"]);
  const fields: Record<string, unknown> = {
    // Marca unică a mașinii din CRM. Dacă id-ul anunțului se pierde din baza
    // noastră, o regăsim după ea în loc să creăm un al doilea anunț.
    _vogauto_crm_id: f.crmId,
    _listing_price: Math.round(f.price),
    // Reducerea, exact ca la anunțurile lor: prețul vechi tăiat, cel nou
    // alături. Când nu există reducere, câmpul se golește — altfel ar rămâne
    // o reducere veche agățată de anunț.
    // Numere întregi, fără separatori: la un anunț al lor „20.900" a fost citit
    // ca 20,9 și afișat „21 €".
    _listing_old_price:
      f.oldPrice && f.oldPrice > f.price ? Math.round(f.oldPrice) : "",
    _listing_year: f.year,
    _listing_title: f.title,
    _listing_post_type: "listing",
  };
  if (f.mileage != null) fields._listing_mileage = f.mileage;
  if (f.engineSize != null) fields._listing_engine_size = f.engineSize;
  if (f.description) fields._listing_description = f.description;

  // Galeria temei: un tablou { id atașament: adresă }. Prima poză e și cea
  // reprezentativă. Fără asta, anunțul apare fără nicio fotografie.
  if (f.photos?.length) {
    const map: Record<number, string> = {};
    for (const p of f.photos) map[p.id] = p.url;
    fields._listing_gallery = map;
    fields._listing_gallery_img = map;
    fields._listing_featured_image = f.photos[0].url;
    fields._listing_featured_image_img = f.photos[0].url;
  }

  for (const [tax, ids] of Object.entries(terms)) {
    if (!ids.length) continue;
    fields[`_${tax}`] = AS_LIST.has(tax) ? ids : ids[0];
  }

  const res = await fetch(`${SITE}/wp-json/vogauto-crm/v1/listing/${postId}/fields`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
    signal: AbortSignal.timeout(60000),
  });
  const data = (await res.json().catch(() => ({}))) as { written?: string[]; message?: string };
  if (!res.ok) {
    throw new Error(data.message || `Modulul de punte a răspuns ${res.status}`);
  }
  return data.written ?? [];
}

/** Doar imaginea reprezentativă, fără să atingem restul anunțului. */
export async function setFeaturedImage(postId: string, mediaId: string): Promise<void> {
  await wpFetch(`${TYPE}/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ featured_media: Number(mediaId) }),
  });
}

/** Starea unui anunț pe site („publish", „draft"...), sau null dacă nu există. */
export async function listingStatus(postId: string): Promise<string | null> {
  try {
    const post = await wpFetch(`${TYPE}/${postId}?context=edit&_fields=status`);
    return typeof post.status === "string" ? post.status : null;
  } catch {
    return null;
  }
}

/** Modulul de punte e instalat și activ pe site? */
export async function bridgeInstalled(): Promise<boolean> {
  try {
    const res = await fetch(`${SITE}/wp-json/`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return false;
    const d = (await res.json()) as { namespaces?: string[] };
    return (d.namespaces ?? []).includes("vogauto-crm/v1");
  } catch {
    return false;
  }
}

/** Scoate anunțul de pe site, fără să-l șteargă (rămâne ciornă, reversibil). */
export async function unpublishListing(postId: string): Promise<void> {
  await wpFetch(`${TYPE}/${postId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "draft" }),
  });
}

/** Verifică dacă datele de acces sunt valide (folosit de indicatorul din CRM). */
export async function checkConnection(): Promise<{ ok: boolean; user?: string; error?: string }> {
  if (!wordpressConfigured()) return { ok: false, error: "Lipsesc datele de conectare." };
  try {
    const me = await wpFetch("/users/me?context=edit");
    return { ok: true, user: String(me.name ?? me.slug ?? "—") };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Eroare necunoscută" };
  }
}
