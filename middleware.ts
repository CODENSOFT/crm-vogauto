import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Protejează /dashboard/* și blochează workerii de la paginile de admin.
export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const path = req.nextUrl.pathname;

    const ADMIN_ONLY = [
      "/dashboard/cars",
      "/dashboard/statistics",
      "/dashboard/audit",
      "/dashboard/users",
    ];

    if (token?.role !== "admin" && ADMIN_ONLY.some((p) => path.startsWith(p))) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
