import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { checkConnection } from "@/lib/wordpress";

// GET /api/publish/wordpress/status — verifică datele de conectare la WordPress.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json(await checkConnection());
}
