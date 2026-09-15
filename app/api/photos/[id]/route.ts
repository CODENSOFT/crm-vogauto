import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carPhotos } from "@/lib/schema";
import { requireSession } from "@/lib/guard";
import { isUuid } from "@/lib/utils";
import { deleteFromBucket } from "@/lib/storage";

// DELETE /api/photos/[id] — șterge poza (adminul sau cel care a încărcat-o).
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireSession();
  if (error) return error;

  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Poza nu a fost găsită." }, { status: 404 });
  }

  const [photo] = await db.select().from(carPhotos).where(eq(carPhotos.id, params.id)).limit(1);
  if (!photo) {
    return NextResponse.json({ error: "Poza nu a fost găsită." }, { status: 404 });
  }
  if (user.role !== "admin" && photo.uploadedBy !== user.id) {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }

  await deleteFromBucket(photo.path).catch(() => {});
  await db.delete(carPhotos).where(eq(carPhotos.id, params.id));

  return NextResponse.json({ ok: true });
}
