/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

// Împiedică memorarea în cache a paginilor autentificate și a răspunsurilor API
// (date sensibile + fix pentru butonul „Înapoi" după deconectare).
const noStore = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/dashboard/:path*", headers: noStore },
      { source: "/api/:path*", headers: noStore },
    ];
  },
};

module.exports = nextConfig;
