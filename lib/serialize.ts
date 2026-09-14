import { maskPhone } from "@/lib/utils";
import type { CarRow, InventoryRow, UserRow, AuditLogRow } from "@/lib/schema";

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
  return {
    ...rest,
    _id: id,
    markup: Number(row.sellPrice) - Number(row.clientWantPrice),
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
