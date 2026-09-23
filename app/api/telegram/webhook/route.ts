import { NextResponse } from "next/server";
import { and, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, inventory, tasks, telegramPending } from "@/lib/schema";
import { logAction } from "@/lib/audit";
import { tgSend, tgEdit, tgDelete, tgAnswerCallback, esc, type InlineButton } from "@/lib/telegram";
import { parseCommand, buildTitle } from "@/lib/tgCommand";
import { createTaskCore } from "@/lib/createTask";
import { TASK_TYPE_LABELS, type TaskType } from "@/types";
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
  "",
  "<b>Tipuri:</b> spălat, detailing, service, devamare, livrare, vizionare, ASP, aducere.",
  "<b>Termen:</b> azi, mâine, poimâine, luni…duminică, 25.12, ora 14 sau 14:30.",
  "Dacă nu scrii responsabilul, te întreb eu cine se ocupă.",
].join("\n");

// Datele comenzii păstrate între apăsările de butoane.
interface Payload {
  [key: string]: unknown;
  raw: string;
  type: TaskType;
  dueDate: string | null;
  car: { id: string; label: string; color: string | null } | null;
  assignee: { id: string; name: string } | null;
  // Variantele oferite la pasul curent.
  cars?: { id: string; label: string; color: string | null }[];
  users?: { id: string; name: string }[];
}

// ——— Punctul de intrare ————————————————————————————————————————————

export async function POST(request: Request) {
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

type Account = typeof users.$inferSelect;

async function handleMessage(msg: Record<string, any>, request: Request) {
  const chatId = msg.chat?.id;
  if (!chatId || msg.chat?.type !== "private") return;

  const fromId = String(msg.from?.id ?? "");
  const text = String(msg.text ?? "").trim();

  const [account] = fromId
    ? await db.select().from(users).where(eq(users.telegramId, fromId)).limit(1)
    : [];

  if (!account) {
    const code = text.match(/\b(\d{6})\b/)?.[1];
    if (code) return void (await linkAccount(chatId, fromId, code, request));
    return void (await tgSend(chatId,
      ["<b>Cont neconectat.</b>",
       "Intră în CRM, apasă <b>Conectează Telegram</b>",
       "(administratorii la <b>Utilizatori</b>, angajații la <b>Sarcini</b>),",
       "apoi trimite-mi aici codul de 6 cifre."].join("\n")));
  }

  if (!account.isActive) return void (await tgSend(chatId, "Contul tău este dezactivat în CRM."));
  if (account.role !== "admin") {
    return void (await tgSend(chatId,
      "Aici primești notificări despre sarcinile atribuite ție.\nCrearea sarcinilor prin bot e disponibilă doar administratorului."));
  }

  if (msg.voice || msg.audio) {
    return void (await tgSend(chatId, "Mesajele vocale nu sunt acceptate încă — scrie comanda ca text.\n\n" + HELP));
  }
  if (!text) return;

  const lower = text.toLowerCase();
  if (lower === "/start" || lower === "/help" || lower === "/ajutor") {
    return void (await tgSend(chatId, `Salut, ${esc(account.fullName)}! ✅ Cont conectat.\n\n${HELP}`));
  }
  if (/^\d{6}$/.test(text)) return void (await tgSend(chatId, "Contul e deja conectat."));

  await handleCommand(chatId, account, text, request);
}

// ——— Conectarea contului ————————————————————————————————————————————

async function linkAccount(chatId: number, fromId: string, code: string, request: Request) {
  const [candidate] = await db
    .select()
    .from(users)
    .where(eq(users.telegramLinkCode, code))
    .limit(1);

  const valid = candidate?.telegramLinkExpires && candidate.telegramLinkExpires > new Date();
  if (!candidate || !valid) {
    return void (await tgSend(chatId, "Cod greșit sau expirat. Generează unul nou în CRM."));
  }
  await db
    .update(users)
    .set({ telegramId: fromId, telegramLinkCode: null, telegramLinkExpires: null })
    .where(eq(users.id, candidate.id));

  await logAction({
    userId: candidate.id, userName: candidate.fullName, action: "TELEGRAM_LINKED",
    details: { telegramId: fromId }, request,
  });

  await tgSend(chatId, candidate.role === "admin"
    ? `✅ Cont conectat: <b>${esc(candidate.fullName)}</b>\n\n${HELP}`
    : `✅ Cont conectat: <b>${esc(candidate.fullName)}</b>\n\nDe acum primești aici notificări când ți se atribuie o sarcină nouă.`);
}

// ——— Comanda ————————————————————————————————————————————————————————

async function handleCommand(chatId: number, account: Account, text: string, request: Request) {
  const parsed = await parseCommand(text);

  const base: Payload = {
    raw: parsed.raw,
    type: parsed.type,
    dueDate: parsed.dueDate ? parsed.dueDate.toISOString() : null,
    car: null,
    assignee: parsed.assignee,
  };

  // Nicio mașină recunoscută.
  if (parsed.cars.length === 0) {
    if (parsed.type === "general") return void (await proceed(chatId, account, base, request));

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

  // Mai multe mașini la fel de potrivite — întrebăm care.
  const top = parsed.cars[0];
  const tied = parsed.cars.filter((c) => c.score === top.score);
  if (tied.length > 1) {
    const cars = tied.slice(0, 6).map((c) => ({ id: c.id, label: c.label, color: c.color }));
    const id = await savePending(chatId, account.id, { ...base, cars });
    const buttons: InlineButton[] = cars.map((c, i) => ({
      text: `${c.label}${c.color ? ` · ${c.color}` : ""}`,
      data: `c:${id}:${i}`,
    }));
    return void (await tgSend(chatId, `Am găsit ${tied.length} mașini potrivite. <b>Care?</b>`, buttons));
  }

  base.car = { id: top.id, label: top.label, color: top.color };
  await proceed(chatId, account, base, request);
}

/** Dacă lipsește responsabilul, întreabă; altfel creează sarcina. */
async function proceed(chatId: number, account: Account, payload: Payload, request: Request, editId?: number) {
  if (payload.assignee) return void (await finalize(chatId, account, payload, request, editId));
  await askAssignee(chatId, account, payload);
}

async function askAssignee(chatId: number, account: Account, payload: Payload) {
  const rows = await db
    .select({ id: users.id, fullName: users.fullName })
    .from(users)
    .where(eq(users.isActive, true))
    .limit(12);

  if (rows.length === 0) {
    // Niciun angajat activ — rămâne pe creator.
    payload.assignee = { id: account.id, name: account.fullName };
    return void (await finalize(chatId, account, payload));
  }

  // Creatorul primul în listă, ca să fie la îndemână.
  const list = rows
    .map((r) => ({ id: r.id, name: r.fullName }))
    .sort((a, b) => (a.id === account.id ? -1 : b.id === account.id ? 1 : 0));

  const id = await savePending(chatId, account.id, { ...payload, users: list });
  const buttons: InlineButton[] = list.map((u, i) => ({
    text: u.id === account.id ? `${u.name} (eu)` : u.name,
    data: `u:${id}:${i}`,
  }));

  const ctx = [
    `<b>Tip:</b> ${esc(TASK_TYPE_LABELS[payload.type])}`,
    payload.car ? `<b>Mașina:</b> ${esc(payload.car.label)}` : null,
    `<b>Termen:</b> ${esc(fmtDate(payload.dueDate ? new Date(payload.dueDate) : null))}`,
  ].filter(Boolean).join("\n");

  await tgSend(chatId, `${ctx}\n\n<b>Cine se ocupă?</b>`, buttons);
}

async function finalize(chatId: number, account: Account, payload: Payload, request?: Request, editId?: number) {
  const assignee = payload.assignee ?? { id: account.id, name: account.fullName };
  const dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
  const title = buildTitle(payload.type, payload.car?.label ?? null, payload.raw);

  const task = await createTaskCore({
    title,
    description: `Creat din Telegram: „${payload.raw}"`,
    type: payload.type,
    priority: "normal",
    dueDate,
    inventoryId: payload.car?.id ?? null,
    carLabel: payload.car?.label ?? null,
    responsibleIds: [assignee.id],
    responsibleNames: [assignee.name],
    creator: { id: account.id, fullName: account.fullName },
  });

  if (request) {
    await logAction({
      userId: account.id, userName: account.fullName, action: "CREATE_TASK",
      details: { taskId: task.id, title: task.title, via: "telegram", assignedTo: assignee.name },
      request,
    });
  }

  const lines = [
    "✅ <b>Sarcină creată</b>",
    `<b>Tip:</b> ${esc(TASK_TYPE_LABELS[payload.type])}`,
    payload.car ? `<b>Mașina:</b> ${esc(payload.car.label)}${payload.car.color ? ` · ${esc(payload.car.color)}` : ""}` : null,
    `<b>Responsabil:</b> ${esc(assignee.name)}`,
    `<b>Termen:</b> ${esc(fmtDate(dueDate))}`,
  ].filter(Boolean).join("\n");

  if (editId) await tgEdit(chatId, editId, lines);
  else await tgSend(chatId, lines);
}

// ——— Butoane ————————————————————————————————————————————————————————

async function savePending(chatId: number, userId: string, payload: Payload): Promise<string> {
  const id = randomBytes(4).toString("hex");
  await db.insert(telegramPending).values({
    id, chatId: String(chatId), userId, payload,
  });
  return id;
}

/** Marchează sarcina drept finalizată, la apăsarea butonului din notificare. */
async function markTaskDone(
  cb: Record<string, any>,
  chatId: number,
  messageId: number | undefined,
  taskId: string,
  request: Request,
) {
  const fromId = String(cb.from?.id ?? "");
  const [account] = fromId
    ? await db.select().from(users).where(eq(users.telegramId, fromId)).limit(1)
    : [];
  if (!account || !account.isActive) {
    return void (await tgSend(chatId, "Contul tău nu mai este activ în CRM."));
  }

  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task || task.isDeleted) {
    return void (await tgSend(chatId, "Sarcina nu mai există."));
  }

  // Doar responsabilii sarcinii (sau adminul) o pot finaliza.
  const mine = (task.assignedToIds ?? []).includes(account.id) || task.assignedTo === account.id;
  if (!mine && account.role !== "admin") {
    return void (await tgSend(chatId, "Această sarcină nu îți este atribuită."));
  }

  if (task.status === "done") {
    // Deja închisă din CRM — curățăm mesajul din chat.
    if (messageId) await tgDelete(chatId, messageId);
    return;
  }

  await db.update(tasks).set({ status: "done", completedAt: new Date() }).where(eq(tasks.id, taskId));

  await logAction({
    userId: account.id, userName: account.fullName, action: "EDIT_TASK",
    details: { taskId, title: task.title, changes: ["status"], status: "done", via: "telegram" },
    request,
  });

  // Sarcina rămâne în CRM la „Finalizate", dar dispare din chat.
  if (messageId) {
    const removed = await tgDelete(chatId, messageId);
    // Mesajele mai vechi de 48h nu pot fi șterse de bot — le marcăm în schimb.
    if (!removed) await tgEdit(chatId, messageId, `✅ <b>Finalizată</b> · ${esc(task.title)}`);
  }
}

async function handleCallback(cb: Record<string, any>, request: Request) {
  const data = String(cb.data ?? "");
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  await tgAnswerCallback(cb.id);

  const [kind, pendingId, idxRaw] = data.split(":");
  if (!chatId) return;

  // „Am făcut-o" pe o sarcină primită prin notificare.
  if (kind === "done") return void (await markTaskDone(cb, chatId, messageId, pendingId, request));

  if (kind !== "c" && kind !== "u") return;

  const [pending] = await db.select().from(telegramPending).where(eq(telegramPending.id, pendingId)).limit(1);
  if (!pending || pending.chatId !== String(chatId)) {
    return void (await tgSend(chatId, "Alegerea a expirat. Trimite comanda din nou."));
  }

  const [account] = await db.select().from(users).where(eq(users.id, pending.userId!)).limit(1);
  if (!account || account.role !== "admin") return;

  const payload = pending.payload as Payload;
  const idx = Number(idxRaw);

  await db.delete(telegramPending).where(eq(telegramPending.id, pendingId));
  // Curățăm alegerile vechi rămase neapăsate.
  await db.delete(telegramPending).where(lt(telegramPending.createdAt, new Date(Date.now() - 24 * 3600 * 1000)));

  if (kind === "c") {
    const chosen = payload.cars?.[idx];
    if (!chosen) return;
    const next: Payload = { ...payload, car: chosen, cars: undefined };
    if (next.assignee) return void (await finalize(chatId, account, next, request, messageId));
    // Confirmăm mașina aleasă, apoi întrebăm responsabilul.
    if (messageId) await tgEdit(chatId, messageId, `<b>Mașina:</b> ${esc(chosen.label)}`);
    return void (await askAssignee(chatId, account, next));
  }

  const chosenUser = payload.users?.[idx];
  if (!chosenUser) return;
  const next: Payload = { ...payload, assignee: chosenUser, users: undefined };
  await finalize(chatId, account, next, request, messageId);
}
