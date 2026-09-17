import { NextResponse } from "next/server";
import { and, eq, gte, lt, desc, asc, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, users, workOrders } from "@/lib/schema";
import { requireSession, coordsOf } from "@/lib/guard";
import { logAction } from "@/lib/audit";
import { isUuid } from "@/lib/utils";
import { taskToDTO } from "@/lib/serialize";
import { notify } from "@/lib/notify";

const TYPES = ["general", "test_drive", "bring_car", "to_asp", "service", "wash", "detailing", "customs", "delivery"];
const STATUSES = ["todo", "in_progress", "done"];
const PRIORITIES = ["low", "normal", "high"];

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

  // Workerii văd exclusiv sarcinile proprii; adminul poate filtra pe oricine.
  if (!isAdmin) conds.push(eq(tasks.assignedTo, user.id));
  else if (assignedTo && isUuid(assignedTo)) conds.push(eq(tasks.assignedTo, assignedTo));

  if (status && STATUSES.includes(status)) conds.push(eq(tasks.status, status));
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

  const rows = await db
    .select()
    .from(tasks)
    .where(and(...conds))
    .orderBy(sql`${tasks.dueDate} asc nulls last`, asc(tasks.status), desc(tasks.createdAt));

  return NextResponse.json({ tasks: rows.map(taskToDTO) });
}

// POST /api/tasks — creează sarcină. Adminul poate atribui oricui; workerul
// poate crea doar pentru sine.
export async function POST(request: Request) {
  const { user, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const { title, description, type, priority, dueDate, carId, inventoryId, carLabel, leadId } = body;
  let { assignedTo } = body;

  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "Titlul sarcinii este obligatoriu." }, { status: 400 });
  }

  const isAdmin = user.role === "admin";

  // Rezolvă persoana atribuită.
  let assignedToId = user.id;
  let assignedToName = user.fullName;
  if (isAdmin && assignedTo && isUuid(assignedTo)) {
    const [u] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, assignedTo)).limit(1);
    if (u) { assignedToId = u.id; assignedToName = u.fullName; }
  } else if (!isAdmin) {
    assignedTo = user.id; // workerii nu pot atribui altcuiva
  }

  const [task] = await db
    .insert(tasks)
    .values({
      title: String(title).trim(),
      description: description ? String(description) : null,
      type: TYPES.includes(type) ? type : "general",
      status: "todo",
      priority: PRIORITIES.includes(priority) ? priority : "normal",
      assignedTo: assignedToId,
      assignedToName,
      createdBy: user.id,
      createdByName: user.fullName,
      carId: carId && isUuid(carId) ? carId : null,
      inventoryId: inventoryId && isUuid(inventoryId) ? inventoryId : null,
      carLabel: carLabel ? String(carLabel) : null,
      leadId: leadId && isUuid(leadId) ? leadId : null,
      dueDate: dueDate ? new Date(dueDate) : null,
    })
    .returning();

  // Sarcinile de tip service/spălătorie/detailing generează automat o lucrare
  // în pagina Lucrări (legată de sarcină, cu status sincronizat).
  const WORK_TYPES = ["service", "wash", "detailing"];
  let taskOut = task;
  if (WORK_TYPES.includes(task.type)) {
    const [wo] = await db
      .insert(workOrders)
      .values({
        type: task.type,
        carId: task.carId,
        inventoryId: task.inventoryId,
        carLabel: task.carLabel,
        responsibleId: task.assignedTo,
        responsibleName: task.assignedToName,
        status: "pending",
        dateIn: task.dueDate,
        notes: task.description || task.title,
        createdBy: user.id,
        createdByName: user.fullName,
      })
      .returning();
    [taskOut] = await db.update(tasks).set({ workOrderId: wo.id }).where(eq(tasks.id, task.id)).returning();
  }

  // Notifică angajatul dacă i s-a atribuit o sarcină (de altcineva).
  if (assignedToId !== user.id) {
    await notify({
      userId: assignedToId,
      type: "task",
      title: "Sarcină nouă",
      body: `${task.title}${task.dueDate ? ` — termen ${new Date(task.dueDate).toLocaleString("ro-RO")}` : ""}`,
      link: "/dashboard/tasks",
    });
  }

  await logAction({
    userId: user.id, userName: user.fullName, action: "CREATE_TASK",
    details: { taskId: task.id, title: task.title, assignedTo: assignedToName },
    request, coords: coordsOf(user),
  });

  return NextResponse.json({ task: taskToDTO(taskOut) }, { status: 201 });
}
