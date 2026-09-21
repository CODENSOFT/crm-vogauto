import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { botConfigured } from "@/lib/telegram";

// GET /api/telegram/link — starea conectării contului curent la bot.
export async function GET() {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const [row] = await db
    .select({ telegramId: users.telegramId })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  return NextResponse.json({
    connected: Boolean(row?.telegramId),
    configured: botConfigured(),
    botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
  });
}

// POST /api/telegram/link — generează un cod de 6 cifre, valabil 10 minute.
// Adminul îl trimite botului în chat privat, iar botul leagă cele două conturi.
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (!botConfigured()) {
    return NextResponse.json({ error: "Botul de Telegram nu este configurat." }, { status: 400 });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await db
    .update(users)
    .set({ telegramLinkCode: code, telegramLinkExpires: expires })
    .where(eq(users.id, user.id));

  await logAction({
    userId: user.id, userName: user.fullName, action: "TELEGRAM_LINK_CODE",
    details: {}, request, coords: coordsOf(user),
  });

  return NextResponse.json({
    code,
    expiresAt: expires.toISOString(),
    botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
  });
}

// DELETE /api/telegram/link — deconectează contul de Telegram.
export async function DELETE(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  await db
    .update(users)
    .set({ telegramId: null, telegramLinkCode: null, telegramLinkExpires: null })
    .where(eq(users.id, user.id));

  await logAction({
    userId: user.id, userName: user.fullName, action: "TELEGRAM_UNLINK",
    details: {}, request, coords: coordsOf(user),
  });

  return NextResponse.json({ ok: true });
}
