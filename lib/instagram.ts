import { formatMoney } from "@/lib/utils";
import type { PublicListing } from "@/lib/listings";

// Construiește descrierea (caption) pentru un anunț Instagram.
export function buildCaption(l: {
  brand: string; model: string; year: number; price: number; description?: string; color?: string | null;
}): string {
  const tagBrand = l.brand.toLowerCase().replace(/[^a-z0-9]/g, "");
  const lines = [
    `🚗 ${l.brand} ${l.model} ${l.year}`,
    l.color ? `🎨 ${l.color}` : "",
    `💶 ${formatMoney(l.price)}`,
    l.description ? `\n${l.description}` : "",
    `\n📍 VOGAUTO`,
    `#vogauto #auto #masini #masinidevanzare #${tagBrand}`,
  ];
  return lines.filter(Boolean).join("\n");
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
  const base = "https://graph.facebook.com/v21.0";
  const urls = imageUrls.filter(Boolean).slice(0, 10); // Instagram: max 10 în carusel
  if (urls.length === 0) throw new Error("Nicio poză de postat.");

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

export function instagramConfigured(): boolean {
  return Boolean(process.env.IG_ACCESS_TOKEN && process.env.IG_USER_ID);
}

export type { PublicListing };
