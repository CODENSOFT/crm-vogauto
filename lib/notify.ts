import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/schema";

// Trimite pe Telegram (dacă e configurat prin TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID).
export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegram(
  text: string,
  toChatId?: string | null,
  buttons?: { text: string; data: string }[],
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = toChatId || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true,
        reply_markup: buttons?.length ? { inline_keyboard: buttons.map((b) => [{ text: b.text, callback_data: b.data }]) } : undefined,
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error("[telegram]", e);
  }
}

// Creează o notificare in-app pentru un utilizator + o trimite pe Telegram.
export async function notify(opts: {
  userId?: string | null;
  type?: string;
  title: string;
  body?: string;
  link?: string;
  telegram?: boolean; // implicit true
  /** Butoane inline atașate mesajului de Telegram (doar în chatul personal). */
  telegramButtons?: { text: string; data: string }[];
}): Promise<void> {
  const { userId = null, type = "info", title, body, link, telegram = true, telegramButtons } = opts;
  try {
    await db.insert(notifications).values({ userId, type, title, body: body ?? null, link: link ?? null });
  } catch (e) {
    console.error("[notify]", e);
  }
  if (telegram) {
    const msg = `<b>${title}</b>${body ? `\n${body}` : ""}`;
    // Dacă destinatarul și-a legat contul de Telegram, îi scriem lui direct;
    // altfel mesajul merge pe canalul comun (dacă e configurat).
    let personal: string | null = null;
    if (userId) {
      try {
        const [u] = await db.select({ telegramId: users.telegramId }).from(users).where(eq(users.id, userId)).limit(1);
        personal = u?.telegramId ?? null;
      } catch (e) {
        console.error("[notify:telegram]", e);
      }
    }
    // Butoanele au sens doar în chatul personal al destinatarului.
    await sendTelegram(msg, personal, personal ? telegramButtons : undefined);
  }
}

// Notifică toți administratorii (notificare per admin + un singur mesaj Telegram).
export async function notifyAdmins(opts: { type?: string; title: string; body?: string; link?: string }): Promise<void> {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  for (const a of admins) {
    await notify({ ...opts, userId: a.id, telegram: false });
  }
  await sendTelegram(`<b>${opts.title}</b>${opts.body ? `\n${opts.body}` : ""}`);
}
