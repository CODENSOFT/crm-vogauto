import { maskPhone } from "@/lib/utils";
import type {
  CarRow, InventoryRow, UserRow, AuditLogRow, TaskRow, CarPhotoRow,
  LeadRow, NotificationRow,
} from "@/lib/schema";

// Convertesc rândurile din Postgres în forma serializată așteptată de client
// (`_id` în loc de `id`, telefon mascat unde e cazul, adaos calculat etc.).

export function carToDTO(row: CarRow, mask = true) {
  const { id, ...rest } = row;
  return {
    ...rest,
    _id: id,
    soldBy: row.soldBy ?? "",
    clientPhone: mask ? maskPhone(row.clientPhone) : row.clientPhone,
  };
}

export function inventoryToDTO(row: InventoryRow) {
  const { id, ...rest } = row;
  // Pentru mașinile parcării costul e prețul de cumpărare; pentru cele
  // primite de la clienți, prețul cerut de client.
  const isParcare = String(row.ownerName ?? "").trim().toLowerCase() === "parcarea";
  const purchaseCost = isParcare ? Number(row.purchasePrice) : Number(row.clientWantPrice);
  return {
    ...rest,
    _id: id,
    purchaseCost,
    markup: Number(row.sellPrice) - purchaseCost,
    expensesTotal: 0, // completate de rutele de citire
    netMargin: Number(row.sellPrice) - purchaseCost,
  };
}

export function userToDTO(row: UserRow) {
  const { id, password: _password, ...rest } = row;
  void _password;
  return { ...rest, _id: id };
}

export function auditToDTO(row: AuditLogRow) {
  const { id, ...rest } = row;
  return { ...rest, _id: id, userId: row.userId ?? null };
}

export function taskToDTO(row: TaskRow) {
  const { id, isDeleted: _isDeleted, ...rest } = row;
  void _isDeleted;
  return { ...rest, _id: id };
}

export function photoToDTO(row: CarPhotoRow) {
  const { id, ...rest } = row;
  return { ...rest, _id: id };
}

export function leadToDTO(row: LeadRow) {
  const { id, isDeleted: _d, ...rest } = row;
  void _d;
  return { ...rest, _id: id };
}

export function notificationToDTO(row: NotificationRow) {
  const { id, ...rest } = row;
  return { ...rest, _id: id };
}

