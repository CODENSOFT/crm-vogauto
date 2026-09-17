import { NextResponse } from "next/server";
import { and, eq, desc, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";
import { requireSession } from "@/lib/guard";
import { isUuid } from "@/lib/utils";
import { notificationToDTO } from "@/lib/serialize";

// GET /api/notifications — notificările utilizatorului curent (recente + nr. necitite).
export async function GET() {
  const { user, error } = await requireSession();
  if (error) return error;

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  const [{ unread }] = await db
    .select({ unread: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));

  return NextResponse.json({ notifications: rows.map(notificationToDTO), unread });
}

// POST /api/notifications — marchează ca citite ({all:true} sau {ids:[...]}).
export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  if (body.all) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, user.id));
  } else if (Array.isArray(body.ids) && body.ids.length) {
    const ids = body.ids.filter(isUuid);
    if (ids.length) {
      await db.update(notifications).set({ isRead: true })
        .where(and(eq(notifications.userId, user.id), inArray(notifications.id, ids)));
    }
  }
  return NextResponse.json({ ok: true });
}
