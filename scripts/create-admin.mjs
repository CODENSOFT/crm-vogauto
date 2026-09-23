/**
 * Creează un cont de administrator suplimentar (Postgres / Supabase).
 * Nu atinge adminul existent.
 * Rulează cu:
 *   node -r dotenv/config scripts/create-admin.mjs dotenv_config_path=.env.local
 */
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// Parola vine din mediu; dacă lipsește, generăm una și o afișăm o singură dată.
const USERNAME = process.env.ADMIN_USERNAME || "admin2";
const PASSWORD = process.env.ADMIN_PASSWORD || randomBytes(9).toString("base64url");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Lipsește DATABASE_URL din .env.local");
  process.exit(1);
}

const PERMS = {
  canViewPrices: true,
  canEditCars: true,
  canAddCars: true,
  canDownload: true,
  canViewStatistics: true,
};

const sql = postgres(url, { prepare: false });

async function main() {
  const [existing] = await sql`select id from users where username = ${USERNAME} limit 1`;
  if (existing) {
    console.log(`✗ Există deja un cont cu username "${USERNAME}". Nu am creat nimic.`);
    await sql.end({ timeout: 5 });
    return;
  }

  const password = await bcrypt.hash(PASSWORD, 10);
  await sql`
    insert into users (username, email, password, full_name, role, permissions, fixed_fee, bonus, is_active)
    values (${USERNAME}, ${USERNAME + "@parcare.com"}, ${password}, 'Administrator 2', 'admin', ${sql.json(PERMS)}, 50, 0, true)
  `;
  console.log(`✓ Admin creat — login: ${USERNAME} / parolă: ${PASSWORD}`);
  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  try { await sql.end({ timeout: 2 }); } catch { /* conexiunea e deja închisă */ }
  process.exit(1);
});
