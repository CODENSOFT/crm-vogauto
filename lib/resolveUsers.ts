import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { isUuid } from "@/lib/utils";

// Rezolvă o listă de id-uri de utilizatori în {ids, names} valide (deduplicate,
// doar cele existente). Acceptă și un id unic (string) pentru compatibilitate.
export async function resolveResponsibles(raw: unknown): Promise<{ ids: string[]; names: string[] }> {
  const list = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  const uniq = Array.from(new Set(list.filter(isUuid)));
  if (uniq.length === 0) return { ids: [], names: [] };
  const rows = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(inArray(users.id, uniq));
  const map = new Map(rows.map((r) => [r.id, r.fullName]));
  const ids = uniq.filter((id) => map.has(id));
  return { ids, names: ids.map((id) => map.get(id)!) };
}
