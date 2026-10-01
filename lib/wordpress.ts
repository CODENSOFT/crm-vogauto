// Publicarea anunțurilor în WordPress, prin REST API (wp-json).
//
// Autentificarea se face cu „Application Password" (WordPress 5.6+), nu cu
// parola contului: se generează din Utilizatori → Profil și poate fi revocată
// oricând, fără să schimbi parola de administrator.

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
    signal: AbortSignal.timeout(25000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { message?: string }).message || `WordPress a răspuns ${res.status}`;
    throw new Error(msg);
  }
  return data as Record<string, unknown>;
}

/** Urcă o poză în biblioteca media și întoarce id-ul ei (pentru imaginea reprezentativă). */
export async function uploadFeaturedImage(imageUrl: string, name: string): Promise<string | null> {
  try {
    const img = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
    if (!img.ok) return null;
    const buf = Buffer.from(await img.arrayBuffer());
    const type = img.headers.get("content-type") || "image/jpeg";
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";

    const media = await wpFetch("/media", {
      method: "POST",
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${name}.${ext}"`,
      },
      body: new Uint8Array(buf),
    });
    return media.id ? String(media.id) : null;
  } catch (e) {
    console.error("[wordpress:media]", e);
    return null;
  }
}

export interface ListingContent {
  title: string;
  description: string;
  brand: string;
  model: string;
  year: number;
  color?: string | null;
  engine?: string | null;
  vin?: string | null;
  price: number;
  photos: string[];
}

/**
 * Corpul articolului, scris cu blocurile standard WordPress și FĂRĂ stiluri
 * proprii: culorile, fonturile și spațierea vin din tema site-ului, deci
 * anunțurile arată exact ca restul conținutului lor.
 */
export function buildPostContent(c: ListingContent): string {
  const rows: [string, string][] = [
    ["Marcă", c.brand],
    ["Model", c.model],
    ["An", String(c.year)],
  ];
  if (c.color) rows.push(["Culoare", c.color]);
  if (c.engine) rows.push(["Motor", c.engine]);
  if (c.vin) rows.push(["VIN", c.vin]);

  const specs = rows
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join("");

  const gallery = c.photos.length
    ? `<figure class="wp-block-gallery columns-3 is-cropped">\n` +
      c.photos
        .map((u) => `<figure class="wp-block-image size-large"><img src="${esc(u)}" alt="${esc(c.title)}" loading="lazy" /></figure>`)
        .join("\n") +
      `\n</figure>`
    : "";

  return [
    `<p class="has-text-align-left"><strong>Preț: ${formatPrice(c.price)}</strong></p>`,
    c.description ? esc(c.description).split(/\n{2,}/).map((par) => `<p>${par.replace(/\n/g, "<br />")}</p>`).join("\n") : "",
    `<figure class="wp-block-table"><table><tbody>${specs}</tbody></table></figure>`,
    gallery,
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
}

/** Creează sau actualizează articolul mașinii. Întoarce id-ul și adresa publică. */
export async function publishListing(opts: {
  postId?: string | null;
  title: string;
  content: string;
  featuredMediaId?: string | null;
}): Promise<PublishResult> {
  const body: Record<string, unknown> = {
    title: opts.title,
    content: opts.content,
    status: "publish",
  };
  if (opts.featuredMediaId) body.featured_media = Number(opts.featuredMediaId);
  if (CATEGORY) body.categories = [Number(CATEGORY)];

  const path = opts.postId ? `/posts/${opts.postId}` : "/posts";
  const post = await wpFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return { postId: String(post.id), url: String(post.link ?? "") };
}

/** Scoate anunțul de pe site, fără să-l șteargă (rămâne ciornă, reversibil). */
export async function unpublishListing(postId: string): Promise<void> {
  await wpFetch(`/posts/${postId}`, {
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
