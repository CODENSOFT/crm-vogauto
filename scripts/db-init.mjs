/**
 * Creează tabelele în Postgres (Supabase) dacă nu există deja.
 * Rulează cu:
 *   node -r dotenv/config scripts/db-init.mjs dotenv_config_path=.env.local
 */
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Lipsește DATABASE_URL din .env.local");
  process.exit(1);
}

const sql = postgres(url, { prepare: false });

async function main() {
  await sql`create extension if not exists pgcrypto`;

  await sql`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      username text not null unique,
      email text,
      password text not null,
      full_name text not null,
      role text not null default 'worker',
      permissions jsonb not null default '{}'::jsonb,
      fixed_fee double precision not null default 50,
      bonus double precision not null default 0,
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      last_login timestamptz
    )
  `;

  await sql`
    create table if not exists cars (
      id uuid primary key default gen_random_uuid(),
      client_name text not null,
      client_phone text not null,
      brand text not null,
      model text not null,
      year integer not null,
      vin text not null unique,
      color text,
      price_buy double precision not null default 0,
      price_sell double precision not null,
      payment_method text not null default 'cash',
      status text not null default 'sold',
      sale_date timestamptz not null,
      sold_by uuid,
      sold_by_name text,
      notes text,
      is_deleted boolean not null default false,
      deleted_at timestamptz,
      deleted_by uuid,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists cars_deleted_saledate_idx on cars (is_deleted, sale_date desc)`;
  await sql`create index if not exists cars_soldby_idx on cars (sold_by)`;

  await sql`
    create table if not exists inventory (
      id uuid primary key default gen_random_uuid(),
      brand text not null,
      model text not null,
      year integer not null,
      vin text,
      color text,
      owner_name text not null,
      owner_phone text not null,
      client_want_price double precision not null default 0,
      sell_price double precision not null,
      status text not null default 'available',
      notes text,
      added_by uuid,
      added_by_name text,
      sold_by uuid,
      sold_by_name text,
      sale_id uuid,
      sale_date timestamptz,
      is_deleted boolean not null default false,
      deleted_at timestamptz,
      deleted_by uuid,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists inventory_deleted_status_created_idx on inventory (is_deleted, status, created_at desc)`;

  await sql`
    create table if not exists audit_logs (
      id uuid primary key default gen_random_uuid(),
      user_id uuid,
      user_name text,
      action text not null,
      details jsonb not null default '{}'::jsonb,
      ip_address text,
      location_city text,
      location_country text,
      location_region text,
      location_zip text,
      location_lat double precision,
      location_lon double precision,
      location_isp text,
      device text,
      browser text,
      user_agent text,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists audit_created_idx on audit_logs (created_at desc)`;
  await sql`create index if not exists audit_user_idx on audit_logs (user_id)`;
  await sql`create index if not exists audit_action_idx on audit_logs (action)`;

  console.log("✓ Tabele create/verificate: users, cars, inventory, audit_logs");
  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  try { await sql.end({ timeout: 2 }); } catch {}
  process.exit(1);
});
