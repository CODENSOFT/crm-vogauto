/**
 * Ajutor pentru configurarea Instagram (Graph API).
 * Pornind de la un token scurt din Graph API Explorer, obține:
 *   - un token de LUNGĂ DURATĂ (~60 zile)  → IG_ACCESS_TOKEN
 *   - ID-ul contului Instagram Business     → IG_USER_ID
 *
 * Pași:
 *  1. Creează o aplicație Meta (developers.facebook.com) și adaugă produsul
 *     „Instagram Graph API". Leagă pagina Facebook de contul IG Business.
 *  2. În Graph API Explorer generează un User Token cu permisiunile:
 *     pages_show_list, instagram_basic, instagram_content_publish,
 *     business_management, pages_read_engagement.
 *  3. Pune în .env.local: IG_APP_ID, IG_APP_SECRET, IG_SHORT_TOKEN.
 *  4. Rulează:
 *     node -r dotenv/config scripts/ig-setup.mjs dotenv_config_path=.env.local
 */
const APP_ID = process.env.IG_APP_ID;
const APP_SECRET = process.env.IG_APP_SECRET;
const SHORT = process.env.IG_SHORT_TOKEN;
const V = "v21.0";

if (!APP_ID || !APP_SECRET || !SHORT) {
  console.error("Lipsesc IG_APP_ID / IG_APP_SECRET / IG_SHORT_TOKEN din .env.local");
  process.exit(1);
}

async function j(url) {
  const r = await fetch(url);
  const d = await r.json();
  if (!r.ok || d.error) throw new Error(JSON.stringify(d.error || d));
  return d;
}

async function main() {
  // 1. Token de lungă durată.
  const ex = await j(
    `https://graph.facebook.com/${V}/oauth/access_token?grant_type=fb_exchange_token` +
    `&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${encodeURIComponent(SHORT)}`
  );
  const longToken = ex.access_token;
  const days = ex.expires_in ? Math.round(ex.expires_in / 86400) : "~60";
  console.log(`\n✓ Token de lungă durată (valabil ${days} zile):\n`);
  console.log(`IG_ACCESS_TOKEN=${longToken}\n`);

  // 2. Paginile Facebook și contul IG Business asociat.
  const pages = await j(`https://graph.facebook.com/${V}/me/accounts?access_token=${longToken}`);
  if (!pages.data || pages.data.length === 0) {
    console.log("Nu am găsit pagini Facebook pe acest cont.");
    return;
  }
  let found = false;
  for (const p of pages.data) {
    const info = await j(
      `https://graph.facebook.com/${V}/${p.id}?fields=name,instagram_business_account{id,username}&access_token=${longToken}`
    );
    if (info.instagram_business_account) {
      found = true;
      console.log(`✓ Pagina „${info.name}" → Instagram @${info.instagram_business_account.username}`);
      console.log(`IG_USER_ID=${info.instagram_business_account.id}\n`);
    } else {
      console.log(`• Pagina „${info.name}" nu are cont Instagram Business legat.`);
    }
  }
  if (!found) {
    console.log("\nNiciun cont Instagram Business găsit. Leagă contul IG (Business) de o pagină Facebook în setările paginii.");
  } else {
    console.log("Pune IG_ACCESS_TOKEN și IG_USER_ID în .env.local ȘI în Vercel (Production). Gata — postarea automată se activează.");
  }
}

main().catch((e) => { console.error("Eroare:", e.message); process.exit(1); });
