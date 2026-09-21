import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventory, users } from "@/lib/schema";
import { TASK_TYPE_LABELS, type TaskType } from "@/types";

// Fusul orar al parcării: comenzile „mâine la 10" trebuie interpretate în ora
// locală, nu în ora serverului (pe Vercel serverul rulează în UTC).
const TZ = process.env.APP_TIMEZONE || "Europe/Chisinau";

/** Scoate diacriticele și normalizează, ca „spălat" să fie egal cu „spalat". */
export function norm(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function tokenize(s: string): string[] {
  return norm(s).split(/[^a-z0-9]+/).filter(Boolean);
}

// ——— Tipul sarcinii ————————————————————————————————————————————————

const TYPE_WORDS: [TaskType, string[]][] = [
  ["detailing", ["detailing", "polish", "polisat", "polisare", "lustruit", "lustruire"]],
  ["wash", ["spalat", "spalare", "spalatorie", "spala", "spalam", "spalata"]],
  ["service", ["service", "reparatie", "reparatii", "reparat", "mecanic", "revizie", "diagnoza", "diagnostic"]],
  ["customs", ["devamare", "devamat", "devama", "vama", "vamuire", "vamuit"]],
  ["delivery", ["livrare", "livrat", "livram", "predare", "predat", "predam"]],
  ["test_drive", ["vizionare", "vizionat", "vizioneaza", "testdrive", "proba"]],
  ["to_asp", ["asp"]],
  ["bring_car", ["aducere", "adus", "aduca", "aduce", "aducem", "evaluare"]],
];

function detectType(tokens: string[], text: string): { type: TaskType; used: Set<string> } {
  const used = new Set<string>();
  if (text.includes("test drive")) return { type: "test_drive", used };
  for (const [type, words] of TYPE_WORDS) {
    for (const w of words) {
      if (tokens.includes(w)) { used.add(w); return { type, used }; }
    }
  }
  return { type: "general", used };
}

// ——— Culori ————————————————————————————————————————————————————————

const COLOR_VARIANTS: Record<string, string> = {
  alb: "alb", alba: "alb", albe: "alb", albi: "alb",
  negru: "negru", neagra: "negru", negre: "negru", negri: "negru",
  gri: "gri", gris: "gri",
  argintiu: "argintiu", argintie: "argintiu",
  rosu: "rosu", rosie: "rosu", rosii: "rosu",
  albastru: "albastru", albastra: "albastru", albastre: "albastru",
  verde: "verde", verzi: "verde",
  galben: "galben", galbena: "galben",
  maro: "maro", bej: "bej", crem: "crem", mov: "mov",
  portocaliu: "portocaliu", portocalie: "portocaliu",
  visiniu: "visiniu", visinie: "visiniu",
  auriu: "auriu", aurie: "auriu",
};

function canonColor(s: unknown): string | null {
  const n = norm(s);
  if (!n) return null;
  if (COLOR_VARIANTS[n]) return COLOR_VARIANTS[n];
  // Culoarea din baza de date poate fi scrisă liber („alb perlat").
  for (const [variant, canon] of Object.entries(COLOR_VARIANTS)) {
    if (n.startsWith(variant)) return canon;
  }
  return null;
}

// ——— Data / ora ————————————————————————————————————————————————————

function tzOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return (asUTC - date.getTime()) / 60000;
}

/** Construiește un moment din componente exprimate în ora locală a parcării. */
function zonedDate(y: number, mo: number, d: number, hh: number, mi: number): Date {
  let ts = Date.UTC(y, mo, d, hh, mi);
  for (let i = 0; i < 2; i++) {
    const off = tzOffsetMinutes(new Date(ts), TZ);
    ts = Date.UTC(y, mo, d, hh, mi) - off * 60000;
  }
  return new Date(ts);
}

/** Data de azi, în ora locală a parcării. */
function todayParts(): { y: number; mo: number; d: number; dow: number } {
  const now = new Date();
  const off = tzOffsetMinutes(now, TZ);
  const local = new Date(now.getTime() + off * 60000);
  return { y: local.getUTCFullYear(), mo: local.getUTCMonth(), d: local.getUTCDate(), dow: local.getUTCDay() };
}

const WEEKDAYS: Record<string, number> = {
  duminica: 0, luni: 1, marti: 2, miercuri: 3, joi: 4, vineri: 5, sambata: 6,
};

function detectDue(tokens: string[], text: string): { date: Date | null; used: Set<string> } {
  const used = new Set<string>();
  const t = todayParts();
  let dayOffset: number | null = null;
  let explicit: { y: number; mo: number; d: number } | null = null;

  if (tokens.includes("azi") || tokens.includes("astazi")) { dayOffset = 0; used.add("azi"); used.add("astazi"); }
  else if (tokens.includes("maine")) { dayOffset = 1; used.add("maine"); }
  else if (tokens.includes("poimaine")) { dayOffset = 2; used.add("poimaine"); }
  else {
    for (const [name, dow] of Object.entries(WEEKDAYS)) {
      if (tokens.includes(name)) {
        // Ziua din săptămână: azi dacă se potrivește, altfel următoarea apariție.
        dayOffset = (dow - t.dow + 7) % 7;
        used.add(name);
        break;
      }
    }
  }

  // Dată explicită: 25.12 / 25/12 / 25.12.2026
  const dm = text.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/);
  if (dm) {
    const d = +dm[1], mo = +dm[2] - 1;
    let y = dm[3] ? +dm[3] : t.y;
    if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && mo >= 0 && mo <= 11) { explicit = { y, mo, d }; used.add(dm[0]); }
  }

  // Ora: 14:30, „la 14", „ora 9"
  let hh: number | null = null, mi = 0;
  const hm = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (hm) { hh = +hm[1]; mi = +hm[2]; used.add(hm[0]); }
  else {
    const h1 = text.match(/\b(?:la|ora)\s+(\d{1,2})\b/);
    if (h1 && +h1[1] <= 23) { hh = +h1[1]; used.add(h1[1]); }
  }

  if (dayOffset === null && !explicit && hh === null) return { date: null, used };

  let y = t.y, mo = t.mo, d = t.d;
  if (explicit) { y = explicit.y; mo = explicit.mo; d = explicit.d; }
  else if (dayOffset !== null) d = t.d + dayOffset;

  return { date: zonedDate(y, mo, d, hh ?? 10, mi), used };
}

// ——— Mașina din stoc ——————————————————————————————————————————————

export interface CarCandidate {
  id: string;
  label: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  status: string;
  score: number;
  matched: string[];
}

async function matchCars(tokens: string[], text: string): Promise<CarCandidate[]> {
  const rows = await db
    .select({
      id: inventory.id, brand: inventory.brand, model: inventory.model,
      year: inventory.year, color: inventory.color, status: inventory.status,
    })
    .from(inventory)
    .where(eq(inventory.isDeleted, false));

  const out: CarCandidate[] = [];
  for (const r of rows) {
    const brandN = norm(r.brand), modelN = norm(r.model);
    const matched: string[] = [];
    let score = 0;

    // Marca și modelul pot fi din mai multe cuvinte („Land Rover", „Golf 7").
    if (brandN && (tokens.includes(brandN) || text.includes(brandN))) { score += 3; matched.push(...brandN.split(" ")); }
    if (modelN && (tokens.includes(modelN) || text.includes(modelN))) { score += 3; matched.push(...modelN.split(" ")); }
    if (score === 0) continue; // fără marcă sau model nu e o potrivire

    if (r.year && tokens.includes(String(r.year))) { score += 2; matched.push(String(r.year)); }

    const carColor = canonColor(r.color);
    if (carColor) {
      for (const tk of tokens) {
        if (COLOR_VARIANTS[tk] === carColor) { score += 2; matched.push(tk); break; }
      }
    }
    if (r.status === "available") score += 1; // preferăm mașinile din stoc

    out.push({
      id: r.id, brand: r.brand, model: r.model, year: r.year, color: r.color,
      status: r.status, score, matched,
      label: `${r.brand} ${r.model} ${r.year}`,
    });
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}

// ——— Responsabilul ————————————————————————————————————————————————

async function matchUser(tokens: string[], consumed: Set<string>) {
  const rows = await db
    .select({ id: users.id, fullName: users.fullName, username: users.username })
    .from(users)
    .where(eq(users.isActive, true));

  const free = tokens.filter((t) => !consumed.has(t) && t.length >= 3);
  if (!free.length) return null;

  for (const u of rows) {
    const parts = norm(u.fullName).split(" ").filter((x) => x.length >= 3);
    parts.push(norm(u.username));
    for (const p of parts) {
      if (free.includes(p)) return { id: u.id, name: u.fullName };
    }
  }
  return null;
}

// ——— Rezultatul ————————————————————————————————————————————————————

export interface ParsedCommand {
  raw: string;
  type: TaskType;
  typeLabel: string;
  dueDate: Date | null;
  cars: CarCandidate[];
  assignee: { id: string; name: string } | null;
}

export async function parseCommand(raw: string): Promise<ParsedCommand> {
  const text = norm(raw);
  const tokens = tokenize(raw);

  const { type, used: typeUsed } = detectType(tokens, text);
  const { date, used: dateUsed } = detectDue(tokens, text);
  const cars = await matchCars(tokens, text);

  const consumed = new Set<string>([...typeUsed, ...dateUsed]);
  // Cuvintele folosite de cea mai bună potrivire de mașină nu pot fi un nume.
  for (const m of cars[0]?.matched ?? []) consumed.add(m);
  const assignee = await matchUser(tokens, consumed);

  return { raw, type, typeLabel: TASK_TYPE_LABELS[type], dueDate: date, cars, assignee };
}

/** Titlul sarcinii, format din tipul recunoscut + mașină. */
export function buildTitle(type: TaskType, carLabel: string | null, raw: string): string {
  const label = TASK_TYPE_LABELS[type];
  if (type === "general" && !carLabel) return raw.trim().slice(0, 120);
  return carLabel ? `${label} · ${carLabel}` : label;
}
