import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { requireAdmin, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";

// PUT /api/users/[id] — ADMIN ONLY. Editare cont / permisiuni / comision.
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  await connectDB();
  const target = await User.findById(params.id);
  if (!target) {
    return NextResponse.json({ error: "Utilizator inexistent." }, { status: 404 });
  }

  if (params.id === user.id && body.isActive === false) {
    return NextResponse.json({ error: "Nu vă puteți dezactiva propriul cont." }, { status: 400 });
  }

  const changed: Record<string, unknown> = {};
  if (body.fullName !== undefined) { target.fullName = body.fullName; changed.fullName = body.fullName; }

  if (body.username !== undefined) {
    const login = String(body.username).toLowerCase().trim();
    if (!/^[a-z0-9._-]{3,}$/.test(login)) {
      return NextResponse.json({ error: "Utilizator invalid (min. 3, litere mici/cifre/. _ -)." }, { status: 400 });
    }
    if (login !== target.username) {
      const dup = await User.findOne({ username: login, _id: { $ne: params.id } });
      if (dup) return NextResponse.json({ error: "Acest nume de utilizator există deja." }, { status: 400 });
      target.username = login;
      changed.username = login;
    }
  }

  if (body.role !== undefined && params.id !== user.id) {
    target.role = body.role === "admin" ? "admin" : "worker";
    changed.role = target.role;
  }
  if (body.isActive !== undefined) { target.isActive = Boolean(body.isActive); changed.isActive = target.isActive; }
  if (body.permissions !== undefined) {
    target.permissions = { ...target.permissions, ...body.permissions };
    changed.permissions = target.permissions;
  }
  if (body.fixedFee !== undefined) {
    const fee = Number(body.fixedFee);
    if (isNaN(fee) || fee < 0) {
      return NextResponse.json({ error: "Taxa fixă trebuie să fie un număr ≥ 0." }, { status: 400 });
    }
    target.fixedFee = fee;
    changed.fixedFee = fee;
  }
  if (body.bonus !== undefined) {
    const bonus = Number(body.bonus);
    if (isNaN(bonus) || bonus < 0) {
      return NextResponse.json({ error: "Bonusul trebuie să fie un număr ≥ 0." }, { status: 400 });
    }
    target.bonus = bonus;
    changed.bonus = bonus;
  }
  if (body.password) {
    if (String(body.password).length < 6) {
      return NextResponse.json({ error: "Parola trebuie să aibă minim 6 caractere." }, { status: 400 });
    }
    target.password = await bcrypt.hash(body.password, 10);
    changed.password = "(schimbată)";
  }

  await target.save();

  await logAction({
    userId: user.id, userName: user.fullName, action: "EDIT_USER_PERMISSIONS",
    details: { targetUserId: params.id, targetUser: target.fullName, changed },
    request,
    coords: coordsOf(user),
  });

  const obj = target.toObject() as unknown as Record<string, unknown>;
  delete obj.password;
  return NextResponse.json({ user: { ...obj, _id: String(target._id) } });
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

  await connectDB();
  const target = await User.findById(params.id);
  if (!target) {
    return NextResponse.json({ error: "Utilizator inexistent." }, { status: 404 });
  }
  await target.deleteOne();

  await logAction({
    userId: user.id, userName: user.fullName, action: "DELETE_USER",
    details: { targetUserId: params.id, targetUser: target.fullName, username: target.username },
    request,
    coords: coordsOf(user),
  });

  return NextResponse.json({ ok: true });
}
