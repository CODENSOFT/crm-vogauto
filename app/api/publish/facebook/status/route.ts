import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { checkFacebook } from "@/lib/facebook";

// GET /api/publish/facebook/status — verifică tokenul paginii de Facebook.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json(await checkFacebook());
}
