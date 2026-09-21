import { NextResponse } from "next/server";
import { and, eq, ne, gte, lt, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { notify } from "@/lib/notify";
import { TASK_TYPE_LABELS, type TaskType } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/cron/reminders — rulat des (ex. la 15 min) de Vercel Cron.
// Trimite reminder cu ~30 min înainte pentru sarcinile programate.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });
  }

  const now = new Date();
  const soon = new Date(now.getTime() + 35 * 60 * 1000); // fereastra: următoarele 35 min

  const due = await db
    .select()
    .from(tasks)
    .where(and(
      eq(tasks.isDeleted, false),
      eq(tasks.reminded, false),
      ne(tasks.status, "done"),
      isNotNull(tasks.assignedTo),
      isNotNull(tasks.dueDate),
      gte(tasks.dueDate, now),
      lt(tasks.dueDate, soon),
    ));

  for (const t of due) {
    const time = t.dueDate ? new Date(t.dueDate).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }) : "";
    const typeLabel = TASK_TYPE_LABELS[t.type as TaskType] ?? t.type;
    const recipients = (t.assignedToIds && t.assignedToIds.length) ? t.assignedToIds : (t.assignedTo ? [t.assignedTo] : []);
    for (const uid of recipients) {
      await notify({
        userId: uid,
        type: "reminder",
        title: `⏰ În curând: ${t.title}`,
        body: `${typeLabel} la ${time}${t.carLabel ? ` · ${t.carLabel}` : ""}`,
        link: "/dashboard/tasks",
      });
    }
    await db.update(tasks).set({ reminded: true }).where(eq(tasks.id, t.id));
  }

  return NextResponse.json({ reminded: due.length });
}
