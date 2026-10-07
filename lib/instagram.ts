import { META_BASE } from "@/lib/metaApi";
import { masoaraImagine, potrivitaPentruInstagram } from "@/lib/imageInfo";
import { COMPANY, financeFor } from "@/lib/listingTemplate";
import type { PublicListing } from "@/lib/listings";

export interface CaptionInput {
  brand: string;
  model: string;
  year: number;
  price: number;
  engine?: string | null;      // cilindree, cm³
  fuelType?: string | null;
  bodyType?: string | null;
  power?: number | null;       // CP
  color?: string | null;
  transmission?: string | null;
  driveType?: string | null;
  seats?: string | null;
  mileage?: number | null;
  /** Adresa anunțului pe site, dacă e publicat; altfel linkul stocului. */
  url?: string | null;
}

function km(n: number): string {
  try {
    return new Intl.NumberFormat("ro-RO").format(n) + " km";
  } catch {
    return `${n} km`;
  }
}

/**
 * Textul anunțului pentru Facebook și Instagram, în formatul cerut de parcare:
 * preț și finanțare sus, apoi specificațiile una pe rând, apoi contactul.
 * Rândurile fără date se omit.
 */
export function buildCaption(l: CaptionInput): string {
  const f = financeFor(l.price);
  // „Tracțiune integrală (AWD/4x4)" → „Integrală"
  const driveShort = l.driveType?.replace(/^Tracțiune\s*/i, "").replace(/\s*\(.*\)$/, "").trim();
  const drive = driveShort ? driveShort.charAt(0).toUpperCase() + driveShort.slice(1) : "";

  const lines = [
    `🚗 ${l.brand} ${l.model} ${l.year}`,
    "",
    `✅ Preț: ${f.price}`,
    `❎ Prima rată: ${f.down}`,
    `➡️ Rata lunară: ${f.monthly}`,
    `📅 Fabricație > ${l.year}`,
    l.engine ? `🔧 Cilindree > ${l.engine} cm3` : "",
    l.fuelType ? `⛽ Combustibil > ${l.fuelType}` : "",
    l.bodyType ? `🚘 Caroserie > ${l.bodyType}` : "",
    l.power ? `🐎 Putere > ${l.power} CP` : "",
    l.color ? `🎨 Culoare > ${l.color}` : "",
    l.transmission ? `⚙️ Cutie > ${l.transmission}` : "",
    drive ? `🔄 Tracțiune > ${drive}` : "",
    l.seats ? `💺 Numărul de locuri > ${l.seats}` : "",
    l.mileage != null ? `🛣️ Parcurs > ${km(l.mileage)}` : "",
    COMPANY.phone ? `☎️ ${COMPANY.phone}${COMPANY.contact ? ` (${COMPANY.contact})` : ""}` : "",
    COMPANY.email ? `✉️ ${COMPANY.email}` : "",
    `💻 ${l.url || COMPANY.stockUrl}`,
  ];
  return lines.filter((x, i) => x !== "" || i === 1).join("\n");
}

// Postează pe Instagram prin Graph API (necesită cont Business + token Meta).
// Postează TOATE pozele: o singură imagine → post simplu; mai multe → carusel.
// Întoarce id-ul postării. Aruncă dacă lipsesc credențialele sau apar erori.
export async function postToInstagram(imageUrls: string[], caption: string): Promise<string> {
  const token = process.env.IG_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;
  if (!token || !igUserId) {
    throw new Error("Instagram neconfigurat (lipsesc IG_ACCESS_TOKEN / IG_USER_ID).");
  }
  const base = META_BASE;
  // Instagram refuză imaginile prea late, prea înalte sau prea mici, iar una
  // singură respinsă face să cadă toată postarea. Le măsurăm întâi și le lăsăm
  // deoparte pe cele nepotrivite, ca restul să ajungă totuși pe Instagram.
  const candidate = imageUrls.filter(Boolean);
  const bune: string[] = [];
  const lasate: string[] = [];
  for (const u of candidate) {
    if (potrivitaPentruInstagram(await masoaraImagine(u))) bune.push(u);
    else lasate.push(u);
  }
  if (lasate.length) {
    console.warn(`[instagram] ${lasate.length} poze lăsate deoparte (format nepotrivit):`, lasate);
  }

  const urls = bune.slice(0, 10); // Instagram: max 10 în carusel
  if (urls.length === 0) {
    throw new Error(
      candidate.length
        ? `Nicio poză nu are formatul cerut de Instagram (între 4:5 și 1.91:1, minimum 320px lățime). ${candidate.length} ${candidate.length === 1 ? "poză a fost lăsată deoparte" : "poze au fost lăsate deoparte"}.`
        : "Nicio poză de postat.",
    );
  }

  async function post(body: Record<string, unknown>, step: string): Promise<string> {
    const res = await fetch(`${base}/${igUserId}/media`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, access_token: token }),
    });
    const d = await res.json();
    if (!res.ok || !d.id) throw new Error(`Instagram (${step}): ${JSON.stringify(d)}`);
    return d.id as string;
  }

  let creationId: string;
  if (urls.length === 1) {
    // Post simplu cu o singură imagine.
    creationId = await post({ image_url: urls[0], caption }, "media");
  } else {
    // Carusel: câte un container per imagine, apoi containerul-carusel.
    const childIds: string[] = [];
    for (const url of urls) {
      childIds.push(await post({ image_url: url, is_carousel_item: true }, "carousel-item"));
    }
    creationId = await post({ media_type: "CAROUSEL", children: childIds.join(","), caption }, "carousel");
  }

  const pubRes = await fetch(`${base}/${igUserId}/media_publish`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  });
  const published = await pubRes.json();
  if (!pubRes.ok || !published.id) {
    throw new Error(`Instagram (publish): ${JSON.stringify(published)}`);
  }
  return published.id as string;
}

/**
 * Verifică dacă datele de Instagram funcționează cu adevărat, nu doar dacă
 * sunt setate. La configurare conteaza mesajul exact de la Meta: „token
 * expirat" si „contul nu e Business" cer lucruri complet diferite.
 */
export async function checkInstagram(): Promise<{ ok: boolean; account?: string; error?: string }> {
  const token = process.env.IG_ACCESS_TOKEN;
  const igUserId = process.env.IG_USER_ID;
  if (!token || !igUserId) return { ok: false, error: "Lipsesc datele de conectare." };
  const base = META_BASE;
  try {
    const res = await fetch(
      `${base}/${igUserId}?fields=username&access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(15000) },
    );
    const d = await res.json();
    if (!res.ok || d.error) return { ok: false, error: d.error?.message || "Token invalid." };
    return { ok: true, account: d.username ? `@${d.username}` : String(igUserId) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Eroare necunoscută" };
  }
}

export function instagramConfigured(): boolean {
  return Boolean(process.env.IG_ACCESS_TOKEN && process.env.IG_USER_ID);
}

export type { PublicListing };
