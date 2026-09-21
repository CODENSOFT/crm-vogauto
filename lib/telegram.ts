// Client minimal pentru Telegram Bot API (doar ce folosim: trimitere mesaje,
// butoane inline, răspuns la apăsarea butoanelor).
//
// Notificările simple continuă să meargă prin `sendTelegram()` din lib/notify.ts
// (canalul unic TELEGRAM_CHAT_ID). Aici e partea de *comenzi*: botul primește
// mesaje de la admin în chat privat și răspunde în același chat.

const API = "https://api.telegram.org";

export function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

export function botConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export interface InlineButton {
  text: string;
  data: string;
}

async function call(method: string, payload: Record<string, unknown>): Promise<unknown> {
  const token = botToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    if (!data.ok) console.error(`[telegram] ${method}:`, data.description);
    return data;
  } catch (e) {
    console.error(`[telegram] ${method}`, e);
    return null;
  }
}

// Telegram acceptă un subset de HTML; scăpăm textul introdus de utilizatori.
export function esc(s: unknown): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Butoanele se trimit unul pe rând (comenzile noastre au liste scurte).
function keyboard(buttons?: InlineButton[]) {
  if (!buttons?.length) return undefined;
  return { inline_keyboard: buttons.map((b) => [{ text: b.text, callback_data: b.data }]) };
}

export async function tgSend(chatId: string | number, text: string, buttons?: InlineButton[]) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: keyboard(buttons),
  });
}

// Înlocuiește textul unui mesaj deja trimis (folosit după apăsarea unui buton,
// ca să dispară opțiunile și să rămână doar rezultatul).
export async function tgEdit(chatId: string | number, messageId: number, text: string) {
  return call("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

// Oprește „ceasul" de pe buton în interfața Telegram.
export async function tgAnswerCallback(callbackId: string, text?: string) {
  return call("answerCallbackQuery", { callback_query_id: callbackId, text: text ?? "" });
}
