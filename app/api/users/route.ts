import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";

// GET /api/users — ADMIN ONLY. Fără parole.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  await connectDB();
  const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ users: users.map((u) => ({ ...u, _id: String(u._id) })) });
}

// POST /api/users — ADMIN ONLY. Creează utilizator (login pe username).
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const { username, password, fullName, role, permissions, fixedFee, bonus } = await request.json();
  if (!username || !password || !fullName) {
    return NextResponse.json({ error: "Nume, utilizator și parolă sunt obligatorii." }, { status: 400 });
  }
  if (String(password).length < 6) {
    return NextResponse.json({ error: "Parola trebuie să aibă minim 6 caractere." }, { status: 400 });
  }
  const login = String(username).toLowerCase().trim();
  if (!/^[a-z0-9._-]{3,}$/.test(login)) {
    return NextResponse.json(
      { error: "Utilizatorul: minim 3 caractere, doar litere mici, cifre, . _ -" },
      { status: 400 }
    );
  }

  await connectDB();
  if (await User.findOne({ username: login })) {
    return NextResponse.json({ error: "Acest nume de utilizator există deja." }, { status: 400 });
  }

  const created = await User.create({
    username: login,
    email: `${login}@vogauto.local`,
    password: await bcrypt.hash(password, 10),
    fullName,
    role: role === "admin" ? "admin" : "worker",
    permissions: permissions || {},
    fixedFee: fixedFee !== undefined && fixedFee !== "" ? Number(fixedFee) : 50,
    bonus: Number(bonus) || 0,
    isActive: true,
  });

  await logAction({
    userId: user.id, userName: user.fullName, action: "CREATE_USER",
    details: { newUserId: String(created._id), username: login, fullName, role: created.role },
    request,
    coords: coordsOf(user),
  });

  const obj = created.toObject() as unknown as Record<string, unknown>;
  delete obj.password;
  return NextResponse.json({ user: { ...obj, _id: String(created._id) } }, { status: 201 });
}
