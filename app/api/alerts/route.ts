import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { computeAlerts } from "@/lib/alerts";

// GET /api/alerts — alerte acționabile pentru dashboard (ADMIN ONLY).
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const alerts = await computeAlerts();
  return NextResponse.json({ alerts });
}
