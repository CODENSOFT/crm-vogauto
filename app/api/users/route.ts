import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { userToDTO } from "@/lib/serialize";

// GET /api/users — ADMIN ONLY. Fără parole.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  return NextResponse.json({ users: rows.map(userToDTO) });
}

// POST /api/users — ADMIN ONLY. Creează utilizator (login pe username).
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { username, password, fullName, role, permissions, fixedFee, bonus } = await request.json();
  if (!username || !password || !fullName) {
    return NextResponse.json({ error: "Nume, utilizator și parolă sunt obligatorii." }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "Parola trebuie să aibă minim 8 caractere." }, { status: 400 });
  }
  const login = String(username).toLowerCase().trim();
  if (!/^[a-z0-9._-]{3,}$/.test(login)) {
    return NextResponse.json(
      { error: "Utilizatorul: minim 3 caractere, doar litere mici, cifre, . _ -" },
      { status: 400 }
    );
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, login)).limit(1);
  if (existing) {
    return NextResponse.json({ error: "Acest nume de utilizator există deja." }, { status: 400 });
  }

  const [created] = await db
    .insert(users)
    .values({
      username: login,
      email: `${login}@vogauto.local`,
      password: await bcrypt.hash(password, 10),
      fullName,
      role: role === "admin" ? "admin" : "worker",
      permissions: permissions || {},
      fixedFee: fixedFee !== undefined && fixedFee !== "" ? Number(fixedFee) : 50,
      bonus: Number(bonus) || 0,
      isActive: true,
    })
    .returning();

  await logAction({
    userId: user.id, userName: user.fullName, action: "CREATE_USER",
    details: { newUserId: created.id, username: login, fullName, role: created.role },
    request,
    coords: coordsOf(user),
  });

  return NextResponse.json({ user: userToDTO(created) }, { status: 201 });
}
