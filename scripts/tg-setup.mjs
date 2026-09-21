/**
 * Instalează webhook-ul botului de Telegram.
 *
 * Telegram trimite mesajele primite către o adresă HTTPS publică — deci
 * aplicația trebuie să fie deja publicată (pe localhost NU funcționează).
 *
 * Rulare:
 *   node --env-file=.env.local scripts/tg-setup.mjs https://crm-vogauto.vercel.app
 *   node --env-file=.env.local scripts/tg-setup.mjs --info      (doar starea)
 *   node --env-file=.env.local scripts/tg-setup.mjs --delete    (oprește botul)
 */
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!TOKEN) {
  console.error("Lipsește TELEGRAM_BOT_TOKEN din .env.local");
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;

async function call(method, payload) {
  const res = await fetch(`${API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data.result;
}

async function main() {
  const arg = process.argv[2];

  const me = await call("getMe");
  console.log(`Bot: @${me.username} (${me.first_name})`);

  if (arg === "--info") {
    console.log(JSON.stringify(await call("getWebhookInfo"), null, 2));
    return;
  }

  if (arg === "--delete") {
    await call("deleteWebhook", { drop_pending_updates: true });
    console.log("✓ Webhook șters — botul nu mai primește mesaje.");
    return;
  }

  const base = (arg || process.env.NEXTAUTH_URL || "").replace(/\/+$/, "");
  if (!base.startsWith("https://")) {
    console.error("Dă adresa publică HTTPS, ex.: node --env-file=.env.local scripts/tg-setup.mjs https://crm-vogauto.vercel.app");
    process.exit(1);
  }
  if (!SECRET) {
    console.error("Lipsește TELEGRAM_WEBHOOK_SECRET din .env.local");
    process.exit(1);
  }

  const url = `${base}/api/telegram/webhook`;
  await call("setWebhook", {
    url,
    secret_token: SECRET,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
  console.log(`✓ Webhook setat: ${url}`);

  const info = await call("getWebhookInfo");
  console.log(`  pending: ${info.pending_update_count}`);
  if (info.last_error_message) console.log(`  ultima eroare: ${info.last_error_message}`);
  console.log(`\nDeschide https://t.me/${me.username}, apasă Start și trimite codul din CRM → Utilizatori.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
