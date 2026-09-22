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
  // Coloane de publicare (adăugate ulterior — idempotent).
  await sql`alter table inventory add column if not exists published boolean not null default false`;
  await sql`alter table inventory add column if not exists published_site boolean not null default false`;
  await sql`alter table inventory add column if not exists published_999 boolean not null default false`;
  await sql`alter table inventory add column if not exists listing_title text`;
  await sql`alter table inventory add column if not exists listing_description text`;

  await sql`
    create table if not exists car_photos (
      id uuid primary key default gen_random_uuid(),
      car_id uuid,
      inventory_id uuid,
      url text not null,
      path text not null,
      sort_order integer not null default 0,
      uploaded_by uuid,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists car_photos_car_idx on car_photos (car_id)`;
  await sql`create index if not exists car_photos_inv_idx on car_photos (inventory_id)`;

  await sql`
    create table if not exists tasks (
      id uuid primary key default gen_random_uuid(),
      title text not null,
      description text,
      type text not null default 'general',
      status text not null default 'todo',
      priority text not null default 'normal',
      assigned_to uuid,
      assigned_to_name text,
      created_by uuid,
      created_by_name text,
      car_id uuid,
      inventory_id uuid,
      car_label text,
      due_date timestamptz,
      completed_at timestamptz,
      is_deleted boolean not null default false,
      created_at timestamptz not null default now()
    )
  `;
  await sql`alter table tasks add column if not exists lead_id uuid`;
  await sql`alter table tasks add column if not exists reminded boolean not null default false`;
  await sql`create index if not exists tasks_due_idx on tasks (is_deleted, due_date)`;
  await sql`create index if not exists tasks_assigned_idx on tasks (assigned_to, status)`;


  await sql`
    create table if not exists imports (
      id uuid primary key default gen_random_uuid(),
      brand text not null,
      model text not null,
      year integer,
      vin text,
      source text,
      supplier_name text,
      stage text not null default 'purchased',
      purchase_price double precision not null default 0,
      customs_cost double precision not null default 0,
      other_costs double precision not null default 0,
      responsible_id uuid,
      responsible_name text,
      expected_date timestamptz,
      arrived_date timestamptz,
      notes text,
      created_by uuid,
      created_by_name text,
      is_deleted boolean not null default false,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists imports_idx on imports (is_deleted, stage, created_at desc)`;
  await sql`alter table imports add column if not exists inventory_id uuid`;

  await sql`
    create table if not exists leads (
      id uuid primary key default gen_random_uuid(),
      client_name text not null,
      client_phone text,
      source text not null default 'call',
      interest_brand text,
      interest_model text,
      budget double precision,
      inventory_id uuid,
      status text not null default 'new',
      assigned_to uuid,
      assigned_to_name text,
      notes text,
      last_contact_at timestamptz,
      created_by uuid,
      created_by_name text,
      is_deleted boolean not null default false,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists leads_idx on leads (is_deleted, status, created_at desc)`;

  await sql`
    create table if not exists notifications (
      id uuid primary key default gen_random_uuid(),
      user_id uuid,
      type text not null default 'info',
      title text not null,
      body text,
      link text,
      is_read boolean not null default false,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists notifications_idx on notifications (user_id, is_read, created_at desc)`;

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

  // Responsabili multipli (liste) — coloane adăugate ulterior.
  await sql`alter table tasks add column if not exists assigned_to_ids uuid[]`;
  await sql`alter table tasks add column if not exists assigned_to_names text[]`;
  await sql`alter table imports add column if not exists responsible_ids uuid[]`;
  await sql`alter table imports add column if not exists responsible_names text[]`;
  await sql`alter table leads add column if not exists assigned_to_ids uuid[]`;
  await sql`alter table leads add column if not exists assigned_to_names text[]`;
  // Migrează responsabilul unic existent în listă (o singură dată).
  await sql`update tasks set assigned_to_ids = array[assigned_to], assigned_to_names = array[coalesce(assigned_to_name,'')] where assigned_to is not null and assigned_to_ids is null`;
  await sql`update imports set responsible_ids = array[responsible_id], responsible_names = array[coalesce(responsible_name,'')] where responsible_id is not null and responsible_ids is null`;
  await sql`update leads set assigned_to_ids = array[assigned_to], assigned_to_names = array[coalesce(assigned_to_name,'')] where assigned_to is not null and assigned_to_ids is null`;

  // Culoare + capacitate motor (adăugate ulterior).
  await sql`alter table cars add column if not exists engine text`;
  await sql`alter table inventory add column if not exists engine text`;
  await sql`alter table imports add column if not exists color text`;
  await sql`alter table imports add column if not exists engine text`;

  await sql`alter table inventory add column if not exists purchase_price double precision not null default 0`;

  // Cheltuieli per mașină (cât e în pregătire).
  await sql`
    create table if not exists inventory_expenses (
      id uuid primary key default gen_random_uuid(),
      inventory_id uuid not null,
      label text not null,
      amount double precision not null default 0,
      note text,
      created_by uuid,
      created_by_name text,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists inventory_expenses_car_idx on inventory_expenses (inventory_id)`;

  // Telegram: legătura cont + starea comenzilor în așteptare.
  await sql`alter table users add column if not exists telegram_id text`;
  await sql`alter table users add column if not exists telegram_link_code text`;
  await sql`alter table users add column if not exists telegram_link_expires timestamptz`;
  await sql`create unique index if not exists users_telegram_id_idx on users (telegram_id) where telegram_id is not null`;
  await sql`
    create table if not exists telegram_pending (
      id text primary key,
      chat_id text not null,
      user_id uuid,
      payload jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now()
    )
  `;
  await sql`create index if not exists telegram_pending_created_idx on telegram_pending (created_at desc)`;

  console.log("✓ Tabele + responsabili multipli: users, cars, inventory, tasks, car_photos, imports, leads, notifications, audit_logs");
  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  try { await sql.end({ timeout: 2 }); } catch {}
  process.exit(1);
});
