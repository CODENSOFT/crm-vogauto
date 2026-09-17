import { NextResponse } from "next/server";
import { getPublishedListings } from "@/lib/listings";

export const dynamic = "force-dynamic";

// GET /api/public/listings — feed PUBLIC (JSON) cu mașinile publicate & disponibile.
// De consumat de site-ul propriu. Nu necesită autentificare, nu expune date sensibile.
export async function GET() {
  const listings = await getPublishedListings("site");
  return NextResponse.json(
    { count: listings.length, listings },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
}
