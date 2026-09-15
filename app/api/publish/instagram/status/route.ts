import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { instagramConfigured } from "@/lib/instagram";

// GET /api/publish/instagram/status — spune dacă Instagram e configurat (token setat).
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json({ configured: instagramConfigured() });
}
