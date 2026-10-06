import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { inventoryToDTO } from "@/lib/serialize";
import { wordpressConfigured, unpublishListing } from "@/lib/wordpress";
import { syncListingToSite } from "@/lib/syncListing";

// POST /api/publish/wordpress/[id] — publică (sau actualizează) anunțul mașinii
// pe site-ul WordPress. [id] = inventoryId. ADMIN ONLY.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!wordpressConfigured()) {
    return NextResponse.json({ error: "Conexiunea cu WordPress nu este configurată." }, { status: 400 });
  }
  if (!isUuid(params.id)) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });

  const [item] = await db
    .select()
    .from(inventory)
    .where(and(eq(inventory.id, params.id), eq(inventory.isDeleted, false)))
    .limit(1);
  if (!item) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  if (item.status === "sold") {
    return NextResponse.json({ error: "Mașina este vândută — nu poate fi publicată." }, { status: 400 });
  }

  try {
    const result = await syncListingToSite(item);

    const [saved] = await db
      .update(inventory)
      .set({
        wpPostId: result.postId,
        wpUrl: result.url,
        wpMediaId: result.mediaId,
        publishedSite: true,
      })
      .where(eq(inventory.id, params.id))
      .returning();

    await logAction({
      userId: user.id, userName: user.fullName, action: "PUBLISH_SITE",
      details: { stockId: params.id, wpPostId: result.postId, url: result.url, photos: result.photoCount },
      request, coords: coordsOf(user),
    });

    return NextResponse.json({ item: inventoryToDTO(saved), url: result.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Eroare la publicare.";
    return NextResponse.json({ error: `WordPress: ${msg}` }, { status: 502 });
  }
}

// DELETE /api/publish/wordpress/[id] — scoate anunțul de pe site (rămâne ciornă).
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!isUuid(params.id)) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });
  const [item] = await db.select().from(inventory).where(eq(inventory.id, params.id)).limit(1);
  if (!item) return NextResponse.json({ error: "Mașina nu a fost găsită." }, { status: 404 });

  try {
    if (item.wpPostId && wordpressConfigured()) await unpublishListing(item.wpPostId);
  } catch (e) {
    console.error("[wordpress:unpublish]", e);
  }

  const [saved] = await db
    .update(inventory)
    .set({ publishedSite: false })
    .where(eq(inventory.id, params.id))
    .returning();

  await logAction({
    userId: user.id, userName: user.fullName, action: "UNPUBLISH_SITE",
    details: { stockId: params.id, wpPostId: item.wpPostId },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({ item: inventoryToDTO(saved) });
}
