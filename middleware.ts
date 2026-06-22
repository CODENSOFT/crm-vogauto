import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Antet care împiedică browserul să memoreze paginile autentificate. Astfel,
// după deconectare, butonul „Înapoi" nu mai poate afișa pagini din cont —
// browserul re-cere pagina, iar middleware-ul redirecționează la /login.
function noStore(res: NextResponse): NextResponse {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  return res;
}

// Protejează /dashboard/* și blochează workerii de la paginile de admin.
export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const path = req.nextUrl.pathname;

    const ADMIN_ONLY = [
      "/dashboard/cars",
      "/dashboard/inventory",
      "/dashboard/statistics",
      "/dashboard/managers",
      "/dashboard/audit",
      "/dashboard/users",
    ];

    if (token?.role !== "admin" && ADMIN_ONLY.some((p) => path.startsWith(p))) {
      return noStore(NextResponse.redirect(new URL("/dashboard", req.url)));
    }
    return noStore(NextResponse.next());
  },
  {
    callbacks: {
      // Un token invalidat (cont dezactivat/șters) ajunge fără `id` → respins.
      authorized: ({ token }) => !!token?.id,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
