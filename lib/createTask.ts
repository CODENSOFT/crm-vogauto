import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, workOrders, type TaskRow } from "@/lib/schema";
import { notify } from "@/lib/notify";

export const TASK_TYPES = [
  "general", "test_drive", "bring_car", "to_asp",
  "service", "wash", "detailing", "customs", "delivery",
];
export const TASK_PRIORITIES = ["low", "normal", "high"];

// Sarcinile de tip service/spălătorie/detailing generează automat o lucrare.
const WORK_TYPES = ["service", "wash", "detailing"];

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  type?: string | null;
  priority?: string | null;
  dueDate?: Date | null;
  carId?: string | null;
  inventoryId?: string | null;
  carLabel?: string | null;
  leadId?: string | null;
  responsibleIds: string[];
  responsibleNames: string[];
  creator: { id: string; fullName: string };
}

/**
 * Creează o sarcină + (dacă e cazul) lucrarea asociată și notifică responsabilii.
 * Folosit atât de API-ul din interfață, cât și de botul de Telegram, ca regulile
 * să rămână identice indiferent de unde vine comanda.
 */
export async function createTaskCore(input: CreateTaskInput): Promise<TaskRow> {
  const { responsibleIds: ids, responsibleNames: names, creator } = input;

  const [task] = await db
    .insert(tasks)
    .values({
      title: input.title.trim(),
      description: input.description ? String(input.description) : null,
      type: input.type && TASK_TYPES.includes(input.type) ? input.type : "general",
      status: "todo",
      priority: input.priority && TASK_PRIORITIES.includes(input.priority) ? input.priority : "normal",
      assignedTo: ids[0] ?? null,
      assignedToName: names[0] ?? null,
      assignedToIds: ids,
      assignedToNames: names,
      createdBy: creator.id,
      createdByName: creator.fullName,
      carId: input.carId ?? null,
      inventoryId: input.inventoryId ?? null,
      carLabel: input.carLabel ? String(input.carLabel) : null,
      leadId: input.leadId ?? null,
      dueDate: input.dueDate ?? null,
    })
    .returning();

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
        responsibleIds: task.assignedToIds,
        responsibleNames: task.assignedToNames,
        status: "pending",
        dateIn: task.dueDate,
        notes: task.description || task.title,
        createdBy: creator.id,
        createdByName: creator.fullName,
      })
      .returning();
    [taskOut] = await db.update(tasks).set({ workOrderId: wo.id }).where(eq(tasks.id, task.id)).returning();
  }

  // Notifică fiecare responsabil căruia i s-a atribuit sarcina (de altcineva).
  for (const aid of ids) {
    if (aid === creator.id) continue;
    await notify({
      userId: aid,
      type: "task",
      title: "Sarcină nouă",
      body: `${task.title}${task.dueDate ? ` — termen ${new Date(task.dueDate).toLocaleString("ro-RO")}` : ""}`,
      link: "/dashboard/tasks",
    });
  }

  return taskOut;
}
