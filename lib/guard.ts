import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/authOptions";

type SessionUser = {
  id: string;
  username: string;
  email?: string;
  fullName: string;
  role: string;
  commissionPercent: number;
  permissions: Record<string, boolean>;
  lat?: number;
  lon?: number;
};

// Coordonatele GPS salvate în sesiune (de la login), pentru audit.
export function coordsOf(u: { lat?: number; lon?: number }) {
  return u.lat != null && u.lon != null ? { lat: u.lat, lon: u.lon } : null;
}

export async function requireSession(): Promise<
  { user: SessionUser; error: null } | { user: null; error: NextResponse }
> {
  const session = await getServerSession(authOptions);
  // Cerem un id valid: un token invalidat (cont dezactivat/șters) ajunge aici
  // fără identitate și trebuie respins.
  if (!session?.user?.id) {
    return { user: null, error: NextResponse.json({ error: "Neautentificat" }, { status: 401 }) };
  }
  return { user: session.user as SessionUser, error: null };
}

export async function requireAdmin(): Promise<
  { user: SessionUser; error: null } | { user: null; error: NextResponse }
> {
  const res = await requireSession();
  if (res.error) return res;
  if (res.user.role !== "admin") {
    return { user: null, error: NextResponse.json({ error: "Acces interzis" }, { status: 403 }) };
  }
  return res;
}
