// Utilitare comune (formatare, parsare user-agent etc.)

const TIMEZONE = "Europe/Chisinau";

export function formatDate(date: string | Date | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDateShort(date: string | Date | null): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

// Maschează un număr de telefon: păstrează primele 3 și ultimele 3 cifre.
// ex: 079123456 → 079***456
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (trimmed.length <= 6) return "***";
  const start = trimmed.slice(0, 3);
  const end = trimmed.slice(-3);
  return `${start}***${end}`;
}

// Parsează User-Agent pentru numele browserului și tipul de dispozitiv.
export function parseUserAgent(ua: string): {
  browser: string;
  device: string;
} {
  const lower = ua.toLowerCase();

  let browser = "Necunoscut";
  if (lower.includes("edg/")) browser = "Edge";
  else if (lower.includes("opr/") || lower.includes("opera")) browser = "Opera";
  else if (lower.includes("chrome/") && !lower.includes("edg/"))
    browser = "Chrome";
  else if (lower.includes("firefox/")) browser = "Firefox";
  else if (lower.includes("safari/") && !lower.includes("chrome"))
    browser = "Safari";

  const isMobile =
    /mobile|android|iphone|ipad|ipod|windows phone/.test(lower);
  const device = isMobile ? "mobile" : "desktop";

  return { browser, device };
}

// Extrage IP-ul real din header-ele cererii.
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}

// Escape pentru caractere speciale de regex — previne injecția de regex și
// atacurile ReDoS atunci când inputul utilizatorului ajunge într-un $regex.
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
