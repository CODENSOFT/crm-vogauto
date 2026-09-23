import { NextResponse } from "next/server";
import { and, eq, ne, gte, lt, desc, asc, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { requireSession, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { taskToDTO } from "@/lib/serialize";
import { resolveResponsibles } from "@/lib/resolveUsers";
import { createTaskCore } from "@/lib/createTask";

const TYPES = ["general", "test_drive", "bring_car", "to_asp", "service", "wash", "detailing", "customs", "delivery"];
const STATUSES = ["todo", "in_progress", "done"];

// GET /api/tasks — listă sarcini. Workerii văd doar sarcinile lor.
export async function GET(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const isAdmin = user.role === "admin";
  const status = searchParams.get("status")?.trim();
  const type = searchParams.get("type")?.trim();
  const assignedTo = searchParams.get("assignedTo")?.trim();
  const leadId = searchParams.get("leadId")?.trim();
  const date = searchParams.get("date")?.trim(); // YYYY-MM-DD
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const conds: SQL[] = [eq(tasks.isDeleted, false)];

  // Workerii văd exclusiv sarcinile proprii (oriunde apar ca responsabil);
  // adminul poate filtra pe oricine.
  if (!isAdmin) conds.push(sql`(${user.id} = ANY(${tasks.assignedToIds}) OR ${tasks.assignedTo} = ${user.id})`);
  else if (assignedTo && isUuid(assignedTo)) conds.push(sql`(${assignedTo} = ANY(${tasks.assignedToIds}) OR ${tasks.assignedTo} = ${assignedTo})`);

  if (status && STATUSES.includes(status)) conds.push(eq(tasks.status, status));
  // Sarcinile finalizate au propria vizualizare, deci lipsesc din restul listelor.
  if (searchParams.get("hideDone") === "1") conds.push(ne(tasks.status, "done"));
  if (type && TYPES.includes(type)) conds.push(eq(tasks.type, type));
  if (leadId && isUuid(leadId)) conds.push(eq(tasks.leadId, leadId));

  if (date) {
    const start = new Date(date + "T00:00:00");
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    conds.push(gte(tasks.dueDate, start));
    conds.push(lt(tasks.dueDate, end));
  } else {
    if (dateFrom) conds.push(gte(tasks.dueDate, new Date(dateFrom)));
    if (dateTo) conds.push(lt(tasks.dueDate, new Date(dateTo + "T23:59:59")));
  }

  // Finalizatele au sens cronologic invers (ultimele terminate primele).
  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conds))
    .orderBy(
      ...(status === "done"
        ? [sql`${tasks.completedAt} desc nulls last`, desc(tasks.createdAt)]
        : [
            // Urgentele mereu primele, apoi normale, apoi cele scăzute.
            sql`case ${tasks.priority} when 'high' then 0 when 'normal' then 1 else 2 end`,
            sql`${tasks.dueDate} asc nulls last`,
            asc(tasks.status),
            desc(tasks.createdAt),
          ]),
    );

  return NextResponse.json({ tasks: rows.map(taskToDTO) });
}

// POST /api/tasks — creează sarcină. Adminul poate atribui oricui; workerul
// poate crea doar pentru sine.
export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const { title, description, type, priority, dueDate, carId, inventoryId, carLabel, leadId, assignedTo, assignedToIds } = body;

  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "Titlul sarcinii este obligatoriu." }, { status: 400 });
  }

  const isAdmin = user.role === "admin";

  // Responsabili: adminul poate atribui mai multora; workerul doar sieși.
  let ids: string[], names: string[];
  if (isAdmin) {
    const r = await resolveResponsibles(assignedToIds ?? assignedTo);
    if (r.ids.length) { ids = r.ids; names = r.names; }
    else { ids = [user.id]; names = [user.fullName]; } // implicit: creatorul
  } else {
    ids = [user.id]; names = [user.fullName];
  }

  const taskOut = await createTaskCore({
    title: String(title),
    description,
    type,
    priority,
    dueDate: dueDate ? new Date(dueDate) : null,
    carId: carId && isUuid(carId) ? carId : null,
    inventoryId: inventoryId && isUuid(inventoryId) ? inventoryId : null,
    carLabel,
    leadId: leadId && isUuid(leadId) ? leadId : null,
    responsibleIds: ids,
    responsibleNames: names,
    creator: { id: user.id, fullName: user.fullName },
  });

  await logAction({
    userId: user.id, userName: user.fullName, action: "CREATE_TASK",
    details: { taskId: taskOut.id, title: taskOut.title, assignedTo: names.join(", ") },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({ task: taskToDTO(taskOut) }, { status: 201 });
}
