import { NextResponse } from "next/server";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, telegramPending } from "@/lib/schema";
import { inventory } from "@/lib/schema";
import { logAction } from "@/lib/audit";
import { tgSend, tgEdit, tgAnswerCallback, esc, type InlineButton } from "@/lib/telegram";
import { parseCommand, buildTitle, type CarCandidate } from "@/lib/tgCommand";
import { createTaskCore } from "@/lib/createTask";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

const TZ = process.env.APP_TIMEZONE || "Europe/Chisinau";

function fmtDate(d: Date | null): string {
  if (!d) return "fără termen";
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
}

const HELP = [
  "<b>Cum creez o sarcină</b>",
  "Scrie într-un singur mesaj: <i>ce</i> + <i>ce mașină</i> + <i>cine</i> + <i>când</i>.",
  "",
  "Exemple:",
  "• <code>spalat Audi Q5 2025 alb Ion maine</code>",
  "• <code>du Audi A5 alb la spalat</code>",
  "• <code>service BMW X5 negru vineri la 9</code>",
  "• <code>devamare Audi A5 2026</code>",
  "",
  "<b>Tipuri recunoscute:</b> spălat, detailing, service, devamare, livrare, vizionare, ASP, aducere.",
  "<b>Termen:</b> azi, mâine, poimâine, luni…duminică, 25.12, ora 14 sau 14:30.",
  "Dacă nu scrii responsabilul, sarcina rămâne pe tine.",
].join("\n");

// ——— Punctul de intrare ————————————————————————————————————————————

export async function POST(request: Request) {
  // Telegram trimite secretul configurat la setWebhook; fără el, ignorăm.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: true });
  }

  let update: Record<string, any>;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.message) await handleMessage(update.message, request);
    else if (update.callback_query) await handleCallback(update.callback_query, request);
  } catch (e) {
    // Telegram reîncearcă la non-200, așa că nu propagăm eroarea.
    console.error("[telegram webhook]", e);
  }

  return NextResponse.json({ ok: true });
}

// ——— Mesaje ————————————————————————————————————————————————————————

async function handleMessage(msg: Record<string, any>, request: Request) {
  const chatId = msg.chat?.id;
  if (!chatId) return;
  // Botul răspunde doar în chat privat.
  if (msg.chat?.type !== "private") return;

  const fromId = String(msg.from?.id ?? "");
  const text = String(msg.text ?? "").trim();

  const [account] = fromId
    ? await db.select().from(users).where(eq(users.telegramId, fromId)).limit(1)
    : [];

  // 1) Cont neconectat — acceptăm doar codul de 6 cifre.
  if (!account) {
    const code = text.match(/\b(\d{6})\b/)?.[1];
    if (code) return void (await linkAccount(chatId, fromId, code, request));
    return void (await tgSend(chatId,
      ["<b>Cont neconectat.</b>",
       "Intră în CRM → <b>Utilizatori</b> → <b>Conectează Telegram</b>,",
       "apoi trimite-mi aici codul de 6 cifre."].join("\n")));
  }

  if (!account.isActive) {
    return void (await tgSend(chatId, "Contul tău este dezactivat în CRM."));
  }
  // Deocamdată comenzile sunt doar pentru administrator.
  if (account.role !== "admin") {
    return void (await tgSend(chatId, "Comenzile sunt disponibile doar administratorului."));
  }

  if (msg.voice || msg.audio) {
    return void (await tgSend(chatId, "Mesajele vocale nu sunt acceptate încă — scrie comanda ca text.\n\n" + HELP));
  }
  if (!text) return;

  const lower = text.toLowerCase();
  if (lower === "/start" || lower === "/help" || lower === "/ajutor") {
    return void (await tgSend(chatId, `Salut, ${esc(account.fullName)}! ✅ Cont conectat.\n\n${HELP}`));
  }
  if (/^\d{6}$/.test(text)) {
    return void (await tgSend(chatId, "Contul e deja conectat."));
  }

  await handleCommand(chatId, account, text, request);
}

// ——— Conectarea contului ————————————————————————————————————————————

async function linkAccount(chatId: number, fromId: string, code: string, request: Request) {
  const [candidate] = await db
    .select()
    .from(users)
    .where(and(eq(users.telegramLinkCode, code), gt(users.telegramLinkExpires, new Date())))
    .limit(1);

  if (!candidate) {
    return void (await tgSend(chatId, "Cod greșit sau expirat. Generează unul nou în CRM."));
  }
  if (candidate.role !== "admin") {
    return void (await tgSend(chatId, "Comenzile sunt disponibile doar administratorului."));
  }

  await db
    .update(users)
    .set({ telegramId: fromId, telegramLinkCode: null, telegramLinkExpires: null })
    .where(eq(users.id, candidate.id));

  await logAction({
    userId: candidate.id, userName: candidate.fullName, action: "TELEGRAM_LINKED",
    details: { telegramId: fromId }, request,
  });

  await tgSend(chatId, `✅ Cont conectat: <b>${esc(candidate.fullName)}</b>\n\n${HELP}`);
}

// ——— Comanda de creare sarcină ——————————————————————————————————————

type Account = typeof users.$inferSelect;

async function handleCommand(chatId: number, account: Account, text: string, request: Request) {
  const parsed = await parseCommand(text);

  // Nicio mașină recunoscută.
  if (parsed.cars.length === 0) {
    if (parsed.type === "general") {
      // Sarcină generală, fără mașină — folosim textul ca titlu.
      return void (await createAndReply(chatId, account, parsed, null, request));
    }
    const stock = await db
      .select({ brand: inventory.brand, model: inventory.model, year: inventory.year, color: inventory.color })
      .from(inventory)
      .where(and(eq(inventory.isDeleted, false), eq(inventory.status, "available")))
      .limit(10);
    const list = stock.length
      ? stock.map((s) => `• ${esc(s.brand)} ${esc(s.model)} ${s.year}${s.color ? ` ${esc(s.color)}` : ""}`).join("\n")
      : "(stocul e gol)";
    return void (await tgSend(chatId,
      `Nu am găsit mașina din mesaj.\n\n<b>În stoc acum:</b>\n${list}\n\nScrie marca și modelul exact.`));
  }

  // Mai multe mașini la fel de potrivite — cerem o alegere.
  const top = parsed.cars[0];
  const tied = parsed.cars.filter((c) => c.score === top.score);
  if (tied.length > 1) {
    const id = randomBytes(4).toString("hex");
    await db.insert(telegramPending).values({
      id,
      chatId: String(chatId),
      userId: account.id,
      payload: {
        raw: parsed.raw,
        type: parsed.type,
        dueDate: parsed.dueDate ? parsed.dueDate.toISOString() : null,
        assignee: parsed.assignee,
        cars: tied.slice(0, 6).map((c) => ({ id: c.id, label: c.label, color: c.color, status: c.status })),
      },
    });
    const buttons: InlineButton[] = tied.slice(0, 6).map((c, i) => ({
      text: `${c.label}${c.color ? ` · ${c.color}` : ""}`,
      data: `c:${id}:${i}`,
    }));
    return void (await tgSend(chatId,
      `Am găsit ${tied.length} mașini potrivite. <b>Care?</b>`, buttons));
  }

  await createAndReply(chatId, account, parsed, top, request);
}

async function createAndReply(
  chatId: number,
  account: Account,
  parsed: Awaited<ReturnType<typeof parseCommand>>,
  car: CarCandidate | null,
  request: Request,
) {
  const assignee = parsed.assignee ?? { id: account.id, name: account.fullName };
  const title = buildTitle(parsed.type, car?.label ?? null, parsed.raw);

  const task = await createTaskCore({
    title,
    description: `Creat din Telegram: „${parsed.raw}"`,
    type: parsed.type,
    priority: "normal",
    dueDate: parsed.dueDate,
    inventoryId: car?.id ?? null,
    carLabel: car?.label ?? null,
    responsibleIds: [assignee.id],
    responsibleNames: [assignee.name],
    creator: { id: account.id, fullName: account.fullName },
  });

  await logAction({
    userId: account.id, userName: account.fullName, action: "CREATE_TASK",
    details: { taskId: task.id, title: task.title, via: "telegram", assignedTo: assignee.name },
    request,
  });

  const lines = [
    "✅ <b>Sarcină creată</b>",
    `<b>Tip:</b> ${esc(parsed.typeLabel)}`,
    car ? `<b>Mașina:</b> ${esc(car.label)}${car.color ? ` · ${esc(car.color)}` : ""}` : null,
    `<b>Responsabil:</b> ${esc(assignee.name)}`,
    `<b>Termen:</b> ${esc(fmtDate(parsed.dueDate))}`,
  ].filter(Boolean);

  await tgSend(chatId, lines.join("\n"));
}

// ——— Butoanele de alegere ————————————————————————————————————————————

async function handleCallback(cb: Record<string, any>, request: Request) {
  const data = String(cb.data ?? "");
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  await tgAnswerCallback(cb.id);
  if (!chatId || !data.startsWith("c:")) return;

  const [, pendingId, idxRaw] = data.split(":");
  const [pending] = await db.select().from(telegramPending).where(eq(telegramPending.id, pendingId)).limit(1);
  if (!pending || pending.chatId !== String(chatId)) {
    return void (await tgSend(chatId, "Alegerea a expirat. Trimite comanda din nou."));
  }

  const [account] = await db.select().from(users).where(eq(users.id, pending.userId!)).limit(1);
  if (!account || account.role !== "admin") return;

  const payload = pending.payload as {
    raw: string; type: string; dueDate: string | null;
    assignee: { id: string; name: string } | null;
    cars: { id: string; label: string; color: string | null; status: string }[];
  };
  const chosen = payload.cars[Number(idxRaw)];
  if (!chosen) return;

  await db.delete(telegramPending).where(eq(telegramPending.id, pendingId));
  // Curățăm alegerile vechi rămase neapăsate.
  await db.delete(telegramPending).where(lt(telegramPending.createdAt, new Date(Date.now() - 24 * 3600 * 1000)));

  const assignee = payload.assignee ?? { id: account.id, name: account.fullName };
  const dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  const parsedLike = await parseCommand(payload.raw);
  const title = buildTitle(parsedLike.type, chosen.label, payload.raw);

  const task = await createTaskCore({
    title,
    description: `Creat din Telegram: „${payload.raw}"`,
    type: payload.type,
    priority: "normal",
    dueDate,
    inventoryId: chosen.id,
    carLabel: chosen.label,
    responsibleIds: [assignee.id],
    responsibleNames: [assignee.name],
    creator: { id: account.id, fullName: account.fullName },
  });

  await logAction({
    userId: account.id, userName: account.fullName, action: "CREATE_TASK",
    details: { taskId: task.id, title: task.title, via: "telegram", assignedTo: assignee.name },
    request,
  });

  const lines = [
    "✅ <b>Sarcină creată</b>",
    `<b>Tip:</b> ${esc(parsedLike.typeLabel)}`,
    `<b>Mașina:</b> ${esc(chosen.label)}${chosen.color ? ` · ${esc(chosen.color)}` : ""}`,
    `<b>Responsabil:</b> ${esc(assignee.name)}`,
    `<b>Termen:</b> ${esc(fmtDate(dueDate))}`,
  ];
  if (messageId) await tgEdit(chatId, messageId, lines.join("\n"));
  else await tgSend(chatId, lines.join("\n"));
}
