/**
 * Creează bucket-ul public „car-photos" în Supabase Storage (dacă nu există).
 * Rulează cu:
 *   node -r dotenv/config scripts/storage-init.mjs dotenv_config_path=.env.local
 */
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Lipsește SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY din .env.local");
  process.exit(1);
}

const BUCKET = "car-photos";

async function main() {
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: 15728640, // 15 MB / fișier
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    console.log(`✓ Bucket „${BUCKET}" creat (public).`);
  } else if (data?.error === "Duplicate" || /already exists/i.test(data?.message || "")) {
    console.log(`✓ Bucket „${BUCKET}" există deja.`);
  } else {
    console.error("Eroare la crearea bucket-ului:", res.status, data);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
