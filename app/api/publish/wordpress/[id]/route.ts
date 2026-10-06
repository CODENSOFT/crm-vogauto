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

// Site-ul lor stă pe găzduire partajată: salvarea anunțului și procesarea
// fiecărei poze pot dura zeci de secunde, iar pozele se urcă una după alta.
export const maxDuration = 300;

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

  // Două cereri pornite în aceeași clipă pentru aceeași mașină ar crea două
  // anunțuri. Prima o „revendică" aici, printr-o singură operație atomică în
  // baza de date: trece published_site din false în true. A doua nu mai
  // găsește nimic de schimbat și se oprește. Apărarea din browser poate fi
  // ocolită (două taburi, o reîncercare), aceasta nu.
  if (!item.wpPostId) {
    const claimed = await db
      .update(inventory)
      .set({ publishedSite: true })
      .where(and(eq(inventory.id, params.id), eq(inventory.publishedSite, false)))
      .returning({ id: inventory.id });

    if (claimed.length === 0) {
      const [again] = await db.select().from(inventory).where(eq(inventory.id, params.id)).limit(1);
      if (!again?.wpPostId) {
        return NextResponse.json(
          { error: "Publicarea acestei mașini e deja în curs. Așteaptă câteva secunde." },
          { status: 409 },
        );
      }
      item.wpPostId = again.wpPostId;
    }
  }

  try {
    // Salvăm id-ul anunțului de îndată ce e creat, înainte de urcarea pozelor.
    // Fără asta, o expirare la poze lăsa CRM-ul fără id, iar fiecare apăsare
    // nouă crea încă un anunț pe site — s-au adunat 31 de duplicate publice.
    const result = await syncListingToSite(item, async (postId, url) => {
      await db.update(inventory)
        .set({ wpPostId: postId, wpUrl: url, publishedSite: true })
        .where(eq(inventory.id, params.id));
    });

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
    // Revendicarea de mai sus a pus bifa; dacă nu s-a creat nimic pe site, o
    // dăm înapoi, ca mașina să nu pară publicată fără să fie.
    const [after] = await db.select().from(inventory).where(eq(inventory.id, params.id)).limit(1);
    if (after && !after.wpPostId) {
      await db.update(inventory).set({ publishedSite: false }).where(eq(inventory.id, params.id));
    }
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
