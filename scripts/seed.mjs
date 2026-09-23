/**
 * Creează / actualizează primul cont de administrator (Postgres / Supabase).
 * Rulează cu:
 *   npm run seed
 *
 * Admin: login "admin" / parolă "Admin1234!"
 */
import postgres from "postgres";
import bcrypt from "bcryptjs";

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
  const [admin] = await sql`
    select id, password from users
    where username = 'admin' or email = 'admin@parcare.com'
    limit 1
  `;

  const password = await bcrypt.hash("Admin1234!", 10);

  if (admin) {
    await sql`
      update users set
        username = 'admin',
        role = 'admin',
        permissions = ${sql.json(PERMS)},
        is_active = true,
        password = ${admin.password ? admin.password : password}
      where id = ${admin.id}
    `;
    console.log("✓ Admin actualizat — login: admin / parolă existentă (sau Admin1234! dacă era gol)");
  } else {
    await sql`
      insert into users (username, email, password, full_name, role, permissions, fixed_fee, bonus, is_active)
      values ('admin', 'admin@parcare.com', ${password}, 'Administrator', 'admin', ${sql.json(PERMS)}, 50, 0, true)
    `;
    console.log("✓ Admin creat — login: admin / parolă: Admin1234!");
  }

  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  try { await sql.end({ timeout: 2 }); } catch { /* conexiunea e deja închisă */ }
  process.exit(1);
});
