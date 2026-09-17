import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/schema";

// Trimite pe Telegram (dacă e configurat prin TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID).
export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
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
}): Promise<void> {
  const { userId = null, type = "info", title, body, link, telegram = true } = opts;
  try {
    await db.insert(notifications).values({ userId, type, title, body: body ?? null, link: link ?? null });
  } catch (e) {
    console.error("[notify]", e);
  }
  if (telegram) {
    const msg = `<b>${title}</b>${body ? `\n${body}` : ""}`;
    await sendTelegram(msg);
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
