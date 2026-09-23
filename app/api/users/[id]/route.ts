import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { sendTelegram } from "@/lib/notify";
import { isUuid } from "@/lib/utils";
import { userToDTO } from "@/lib/serialize";

// PUT /api/users/[id] — ADMIN ONLY. Editare cont / permisiuni / comision.
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Utilizator inexistent." }, { status: 404 });
  }

  const [target] = await db.select().from(users).where(eq(users.id, params.id)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "Utilizator inexistent." }, { status: 404 });
  }

  if (params.id === user.id && body.isActive === false) {
    return NextResponse.json({ error: "Nu vă puteți dezactiva propriul cont." }, { status: 400 });
  }

  const changed: Record<string, unknown> = {};
  const updates: Record<string, unknown> = {};

  if (body.fullName !== undefined) { updates.fullName = body.fullName; changed.fullName = body.fullName; }

  if (body.username !== undefined) {
    const login = String(body.username).toLowerCase().trim();
    if (!/^[a-z0-9._-]{3,}$/.test(login)) {
      return NextResponse.json({ error: "Utilizator invalid (min. 3, litere mici/cifre/. _ -)." }, { status: 400 });
    }
    if (login !== target.username) {
      const [dup] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, login), ne(users.id, params.id)))
        .limit(1);
      if (dup) return NextResponse.json({ error: "Acest nume de utilizator există deja." }, { status: 400 });
      updates.username = login;
      changed.username = login;
    }
  }

  if (body.role !== undefined && params.id !== user.id) {
    updates.role = body.role === "admin" ? "admin" : "worker";
    changed.role = updates.role;
  }
  if (body.isActive !== undefined) {
    updates.isActive = Boolean(body.isActive);
    changed.isActive = updates.isActive;
    // Un cont dezactivat nu mai primește notificări: rupem legătura cu botul.
    if (updates.isActive === false) {
      updates.telegramId = null;
      updates.telegramLinkCode = null;
      updates.telegramLinkExpires = null;
    }
  }
  if (body.permissions !== undefined) {
    updates.permissions = { ...target.permissions, ...body.permissions };
    changed.permissions = updates.permissions;
  }
  if (body.fixedFee !== undefined) {
    const fee = Number(body.fixedFee);
    if (isNaN(fee) || fee < 0) {
      return NextResponse.json({ error: "Taxa fixă trebuie să fie un număr ≥ 0." }, { status: 400 });
    }
    updates.fixedFee = fee;
    changed.fixedFee = fee;
  }
  if (body.bonus !== undefined) {
    const bonus = Number(body.bonus);
    if (isNaN(bonus) || bonus < 0) {
      return NextResponse.json({ error: "Bonusul trebuie să fie un număr ≥ 0." }, { status: 400 });
    }
    updates.bonus = bonus;
    changed.bonus = bonus;
  }
  if (body.password) {
    if (String(body.password).length < 8) {
      return NextResponse.json({ error: "Parola trebuie să aibă minim 8 caractere." }, { status: 400 });
    }
    updates.password = await bcrypt.hash(body.password, 10);
    changed.password = "(schimbată)";
  }

  const hadTelegram = target.telegramId;
  const [saved] = Object.keys(updates).length
    ? await db.update(users).set(updates).where(eq(users.id, params.id)).returning()
    : [target];

  // Îl anunțăm pe Telegram că nu mai primește notificări.
  if (updates.isActive === false && hadTelegram) {
    await sendTelegram("⛔ Contul tău a fost dezactivat în CRM. Nu mai primești notificări aici.", hadTelegram);
  }

  await logAction({
    userId: user.id, userName: user.fullName, action: "EDIT_USER_PERMISSIONS",
    details: { targetUserId: params.id, targetUser: saved.fullName, changed },
    request,
    coords: coordsOf(user),
  });

  return NextResponse.json({ user: userToDTO(saved) });
}

// DELETE /api/users/[id] — ADMIN ONLY.
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  if (params.id === user.id) {
    return NextResponse.json({ error: "Nu vă puteți șterge propriul cont." }, { status: 400 });
  }
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: "Utilizator inexistent." }, { status: 404 });
  }

  const [target] = await db.select().from(users).where(eq(users.id, params.id)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "Utilizator inexistent." }, { status: 404 });
  }
  // Legătura cu botul dispare odată cu contul; îl anunțăm înainte.
  if (target.telegramId) {
    await sendTelegram("⛔ Contul tău a fost șters din CRM. Nu mai primești notificări aici.", target.telegramId);
  }

  await db.delete(users).where(eq(users.id, params.id));

  await logAction({
    userId: user.id, userName: user.fullName, action: "DELETE_USER",
    details: { targetUserId: params.id, targetUser: target.fullName, username: target.username },
    request,
    coords: coordsOf(user),
  });

  return NextResponse.json({ ok: true });
}
