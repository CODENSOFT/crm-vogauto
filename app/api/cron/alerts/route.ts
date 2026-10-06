import { NextResponse } from "next/server";
import { and, eq, ne, gte, lt, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { computeAlerts } from "@/lib/alerts";
import { reconcileSoldListings } from "@/lib/syncListing";
import { sendTelegram, telegramConfigured, notify } from "@/lib/notify";

export const dynamic = "force-dynamic";
// Verificarea anunturilor de pe site cere cateva apeluri catre ei.
export const maxDuration = 300;

// GET /api/cron/alerts — rulat zilnic de Vercel Cron. Trimite un rezumat al
// alertelor pe Telegram. Protejat cu CRON_SECRET (setat automat de Vercel Cron).
export async function GET(request: Request) {
  // Fail closed: în producție, fără secret configurat ruta rămâne închisă.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
    }
  } else if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const alerts = await computeAlerts();
  if (alerts.length && telegramConfigured()) {
    const lines = alerts.map((a) => `• ${a.title}`).join("\n");
    await sendTelegram(`<b>VOGAUTO — de rezolvat azi</b>\n${lines}`);
  }

  // Agenda zilei: fiecare angajat primește sarcinile lui de azi.
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const todays = await db
    .select()
    .from(tasks)
    .where(and(
      eq(tasks.isDeleted, false), ne(tasks.status, "done"),
      isNotNull(tasks.assignedTo), isNotNull(tasks.dueDate),
      gte(tasks.dueDate, start), lt(tasks.dueDate, end),
    ));
  const byUser = new Map<string, { items: string[] }>();
  for (const t of todays) {
    const recipients = (t.assignedToIds && t.assignedToIds.length) ? t.assignedToIds : (t.assignedTo ? [t.assignedTo] : []);
    const time = t.dueDate ? new Date(t.dueDate).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "";
    for (const uid of recipients) {
      const g = byUser.get(uid) ?? { items: [] };
      g.items.push(`${time} — ${t.title}${t.carLabel ? ` (${t.carLabel})` : ""}`);
      byUser.set(uid, g);
    }
  }
  for (const [userId, g] of byUser) {
    await notify({
      userId, type: "agenda", telegram: false,
      title: `Agenda de azi — ${g.items.length} ${g.items.length === 1 ? "sarcină" : "sarcini"}`,
      body: g.items.join("\n"), link: "/dashboard/tasks",
    });
  }

  // Plasă de siguranță: nicio mașină vândută nu trebuie să rămână pe site.
  // S-a întâmplat o dată și nimeni n-a observat decât întâmplător.
  const site = await reconcileSoldListings();
  if (site.retracted.length && telegramConfigured()) {
    await sendTelegram(
      `<b>VOGAUTO — curățenie pe site</b>\nAm retras ${site.retracted.length} ` +
      `${site.retracted.length === 1 ? "anunț" : "anunțuri"} de mașini vândute:\n` +
      site.retracted.map((s) => `• ${s}`).join("\n"),
    );
  }

  return NextResponse.json({
    count: alerts.length, agendas: byUser.size, telegram: telegramConfigured(),
    site,
  });
}
