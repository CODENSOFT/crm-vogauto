// Publicarea anunțurilor în WordPress, prin REST API (wp-json).
//
// Autentificarea se face cu „Application Password" (WordPress 5.6+), nu cu
// parola contului: se generează din Utilizatori → Profil și poate fi revocată
// oricând, fără să schimbi parola de administrator.

import { staticTerms, type TaxonomyInput } from "@/lib/wpTaxonomy";

const SITE = (process.env.WP_URL || "").replace(/\/+$/, "");
const USER = process.env.WP_USER || "";
const PASSWORD = process.env.WP_APP_PASSWORD || "";
/** Categoria în care intră anunțurile (opțional). */
const CATEGORY = process.env.WP_CATEGORY_ID || "";

export function wordpressConfigured(): boolean {
  return Boolean(SITE && USER && PASSWORD);
}

function authHeader(): string {
  return "Basic " + Buffer.from(`${USER}:${PASSWORD}`).toString("base64");
}

async function wpFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${SITE}/wp-json/wp/v2${path}`, {
    ...init,
    headers: { Authorization: authHeader(), ...init.headers },
    signal: AbortSignal.timeout(60000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { message?: string }).message || `WordPress a răspuns ${res.status}`;
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as Record<string, unknown>;
}

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

export interface ListingContent {
  title: string;
  description: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  photos: string[];
  color?: string | null;
  engine?: string | null;
  vin?: string | null;
  bodyType?: string | null;
  mileage?: number | null;
  fuelType?: string | null;
  transmission?: string | null;
  driveType?: string | null;
  condition?: string | null;
  doors?: string | null;
}

/**
 * Corpul articolului, scris cu blocurile standard WordPress și FĂRĂ stiluri
 * proprii: culorile, fonturile și spațierea vin din tema site-ului, deci
 * anunțurile arată exact ca restul conținutului lor.
 */
export function buildPostContent(c: ListingContent): string {
  // Ordinea e cea din anunțurile lor; rândurile necompletate se omit.
  const rows: [string, string | null | undefined][] = [
    ["Marcă", c.brand],
    ["Model", c.model],
    ["Caroserie", c.bodyType],
    ["Parcurs", c.mileage != null ? `${new Intl.NumberFormat("ro-RO").format(c.mileage)} km` : null],
    ["Tip combustibil", c.fuelType],
    ["Anul producerii", String(c.year)],
    ["Transmisie", c.transmission],
    ["Tip tracțiune", c.driveType],
    ["Stare", c.condition],
    ["Capacitate motor", c.engine ? `${c.engine} cm³` : null],
    ["Uși", c.doors],
    ["Culoare", c.color],
    ["VIN", c.vin],
  ];

  const specs = rows
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join("");


  return [
    `<p class="has-text-align-left"><strong>Preț: ${formatPrice(c.price)}</strong></p>`,
    c.description ? esc(c.description).split(/\n{2,}/).map((par) => `<p>${par.replace(/\n/g, "<br />")}</p>`).join("\n") : "",
    `<figure class="wp-block-table"><table><tbody>${specs}</tbody></table></figure>`,
  ].filter(Boolean).join("\n\n");
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function formatPrice(n: number): string {
  try {
    return new Intl.NumberFormat("ro-RO").format(n) + " €";
  } catch {
    return `${n} €`;
  }
}

export interface PublishResult {
  postId: string;
  url: string;
  /** Termenii aplicați, ca să-i putem scrie și în câmpurile temei. */
  terms: Record<string, number[]>;
}

/**
 * Anunțurile lor nu sunt articole de blog, ci un tip de conținut propriu:
 * `listing`. Publicând aici, anunțul intră în catalogul de mașini și preia
 * automat designul temei, fără să atingem nimic din site.
 */
const TYPE = "/listing";

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
    _listing_price: f.price,
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
    return { ok: true, user: String(me.name ?? me.slug ?? USER) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Eroare necunoscută" };
  }
}
