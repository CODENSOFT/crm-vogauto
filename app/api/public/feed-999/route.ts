import { getPublishedListings, xmlEscape } from "@/lib/listings";

export const dynamic = "force-dynamic";

// GET /api/public/feed-999 — feed XML pentru importul automat 999.md (cont dealer).
// Structură generică; se mapează la schema exactă cerută de 999.md când o avem.
export async function GET() {
  const listings = await getPublishedListings("999");

  const items = listings
    .map((l) => {
      const photos = l.photos.map((u) => `      <image>${xmlEscape(u)}</image>`).join("\n");
      return `    <ad>
      <id>${xmlEscape(l.id)}</id>
      <title>${xmlEscape(l.title)}</title>
      <make>${xmlEscape(l.brand)}</make>
      <model>${xmlEscape(l.model)}</model>
      <year>${l.year}</year>
      <color>${xmlEscape(l.color ?? "")}</color>
      <vin>${xmlEscape(l.vin ?? "")}</vin>
      <price currency="EUR">${l.price}</price>
      <description>${xmlEscape(l.description)}</description>
      <images>
${photos}
      </images>
    </ad>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ads generated="${new Date().toISOString()}" count="${listings.length}">
${items}
</ads>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
