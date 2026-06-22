import connectDB from "@/lib/mongodb";
import AuditLog from "@/models/AuditLog";

// Tip flexibil pentru sursa anteturilor: un Request standard sau un obiect
// cu anteturi (cazul NextAuth `authorize`, unde req.headers e un Record).
type HeaderSource =
  | Request
  | { headers: Headers }
  | { headers: Record<string, string | string[] | undefined> };

function getHeader(src: HeaderSource, name: string): string {
  const h = src.headers as unknown;
  if (h instanceof Headers) return h.get(name) || "";
  const rec = h as Record<string, string | string[] | undefined>;
  const v = rec[name] ?? rec[name.toLowerCase()];
  if (Array.isArray(v)) return v[0] || "";
  return v || "";
}

// Cache pentru reverse-geocoding (coordonate GPS → oraș), ca să nu lovim
// repetat serviciul pentru aceeași poziție.
const revCache = new Map<string, { city: string; country: string; zip?: string; region?: string }>();

async function reverseGeocode(lat: number, lon: number) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (revCache.has(key)) return revCache.get(key)!;
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`,
    { headers: { "User-Agent": "VOGAUTO/1.0" }, signal: AbortSignal.timeout(4000) }
  ).then((r) => r.json());
  const a = res.address || {};
  const out = {
    city: a.city || a.town || a.village || a.municipality || a.county || "necunoscut",
    country: a.country || "necunoscut",
    zip: a.postcode || undefined,
    region: a.state || a.region || undefined,
  };
  revCache.set(key, out);
  return out;
}

export async function logAction({
  userId,
  userName,
  action,
  details,
  request,
  coords,
}: {
  userId?: string | null;
  userName: string;
  action: string;
  details: object;
  request: HeaderSource;
  coords?: { lat: number; lon: number } | null;
}) {
  try {
    let ip =
      getHeader(request, "x-forwarded-for").split(",")[0].trim() ||
      getHeader(request, "x-real-ip") ||
      "unknown";

    // IP local/privat (dezvoltare) → nu poate fi geolocalizat direct.
    const isLocal =
      !ip ||
      ip === "unknown" ||
      ip.startsWith("127.") ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.");

    let city = "unknown";
    let country = "unknown";
    let region: string | undefined;
    let zip: string | undefined;
    let lat: number | undefined;
    let lon: number | undefined;
    let isp: string | undefined;

    if (coords && typeof coords.lat === "number" && typeof coords.lon === "number") {
      // Locație PRECISĂ din GPS-ul browserului. Reverse-geocoding pentru oraș.
      lat = coords.lat;
      lon = coords.lon;
      try {
        const r = await reverseGeocode(coords.lat, coords.lon);
        city = r.city;
        country = r.country;
        zip = r.zip;
        region = r.region;
      } catch {
        // dacă reverse-geocoding eșuează, păstrăm doar coordonatele
      }
    } else {
      try {
        // Fallback IP: pentru IP local interogăm fără IP → locația IP-ului public.
        const fields = "status,country,regionName,city,zip,lat,lon,isp,query";
        const url = isLocal
          ? `http://ip-api.com/json/?fields=${fields}`
          : `http://ip-api.com/json/${ip}?fields=${fields}`;
        const geo = await fetch(url, { signal: AbortSignal.timeout(3500) }).then((r) => r.json());
        if (geo && geo.status === "success") {
          city = geo.city || "unknown";
          country = geo.country || "unknown";
          region = geo.regionName || undefined;
          zip = geo.zip || undefined;
          lat = typeof geo.lat === "number" ? geo.lat : undefined;
          lon = typeof geo.lon === "number" ? geo.lon : undefined;
          isp = geo.isp || undefined;
          if (isLocal && geo.query) ip = geo.query;
        }
      } catch {
        // fără rețea / timeout
      }
    }

    const ua = getHeader(request, "user-agent");
    const browser = /edg/i.test(ua)
      ? "Edge"
      : /opr\/|opera/i.test(ua)
      ? "Opera"
      : /chrome/i.test(ua)
      ? "Chrome"
      : /firefox/i.test(ua)
      ? "Firefox"
      : /safari/i.test(ua)
      ? "Safari"
      : "Necunoscut";

    const os = /windows/i.test(ua)
      ? "Windows"
      : /mac os|macintosh/i.test(ua)
      ? "macOS"
      : /android/i.test(ua)
      ? "Android"
      : /iphone|ipad|ipod/i.test(ua)
      ? "iOS"
      : /linux/i.test(ua)
      ? "Linux"
      : "";
    const deviceType = /mobile/i.test(ua) ? "Mobile" : "Desktop";
    const device = os ? `${deviceType} · ${os}` : deviceType;

    await connectDB();
    await AuditLog.create({
      userId: userId || undefined,
      userName,
      action,
      details,
      ipAddress: ip,
      locationCity: city,
      locationCountry: country,
      locationRegion: region,
      locationZip: zip,
      locationLat: lat,
      locationLon: lon,
      locationIsp: isp,
      browser,
      device,
      userAgent: ua || undefined,
    });
  } catch (err) {
    // Logarea nu trebuie să blocheze niciodată acțiunea principală.
    console.error("[logAction]", err);
  }
}

// Etichete în română pentru acțiunile din jurnal.
export const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Autentificare reușită",
  LOGIN_FAILED: "Autentificare eșuată",
  LOGOUT: "Deconectare",
  CREATE_SALE: "Adăugare vânzare",
  EDIT_SALE: "Editare vânzare",
  DELETE_SALE: "Ștergere vânzare",
  CREATE_USER: "Creare utilizator",
  EDIT_USER_PERMISSIONS: "Editare utilizator",
  DELETE_USER: "Ștergere utilizator",
  DOWNLOAD_EXCEL: "Descărcare Excel",
  VIEW_STATISTICS: "Vizualizare statistici",
  REVEAL_PHONE: "Dezvăluire telefon",
  CREATE_STOCK: "Adăugare mașină în stoc",
  EDIT_STOCK: "Editare mașină stoc",
  DELETE_STOCK: "Ștergere mașină stoc",
};
