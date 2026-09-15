import { NextResponse } from "next/server";
import { and, or, eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { carPhotos } from "@/lib/schema";
import { requireSession } from "@/lib/guard";
import { isUuid } from "@/lib/utils";
import { uploadToBucket } from "@/lib/storage";
import { photoToDTO } from "@/lib/serialize";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "image/avif": "avif", "image/gif": "gif",
};
const MAX_BYTES = 15 * 1024 * 1024;

// GET /api/photos?carId=... | ?inventoryId=... — listă poze pentru o mașină.
export async function GET(request: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const carId = searchParams.get("carId")?.trim();
  const inventoryId = searchParams.get("inventoryId")?.trim();

  const conds = [];
  if (carId && isUuid(carId)) conds.push(eq(carPhotos.carId, carId));
  if (inventoryId && isUuid(inventoryId)) conds.push(eq(carPhotos.inventoryId, inventoryId));
  if (conds.length === 0) return NextResponse.json({ photos: [] });

  const rows = await db
    .select()
    .from(carPhotos)
    .where(conds.length === 1 ? conds[0] : or(...conds))
    .orderBy(asc(carPhotos.sortOrder), asc(carPhotos.createdAt));

  return NextResponse.json({ photos: rows.map(photoToDTO) });
}

// POST /api/photos — încarcă o poză (multipart: file + carId | inventoryId).
export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });

  const file = formData.get("file");
  const carId = String(formData.get("carId") || "").trim();
  const inventoryId = String(formData.get("inventoryId") || "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Lipsește fișierul." }, { status: 400 });
  }
  const targetCar = isUuid(carId) ? carId : null;
  const targetInv = isUuid(inventoryId) ? inventoryId : null;
  if (!targetCar && !targetInv) {
    return NextResponse.json({ error: "Lipsește mașina asociată." }, { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Format acceptat: JPG, PNG, WEBP, AVIF, GIF." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Fișier prea mare (max 15 MB)." }, { status: 400 });
  }

  const owner = targetCar || targetInv;
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${owner}/${Date.now()}-${rand}.${ext}`;

  let url: string;
  try {
    const bytes = await file.arrayBuffer();
    url = await uploadToBucket(path, bytes, file.type);
  } catch (e) {
    console.error("[photos upload]", e);
    return NextResponse.json({ error: "Încărcarea a eșuat." }, { status: 500 });
  }

  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${carPhotos.sortOrder}), -1) + 1` })
    .from(carPhotos)
    .where(targetCar ? eq(carPhotos.carId, targetCar) : eq(carPhotos.inventoryId, targetInv!));

  const [photo] = await db
    .insert(carPhotos)
    .values({
      carId: targetCar,
      inventoryId: targetInv,
      url,
      path,
      sortOrder: next ?? 0,
      uploadedBy: user.id,
    })
    .returning();

  return NextResponse.json({ photo: photoToDTO(photo) }, { status: 201 });
}
