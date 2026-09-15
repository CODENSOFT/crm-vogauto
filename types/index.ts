// Tipuri pentru client (formele serializate JSON din API).

export type PaymentMethod = "cash" | "transfer" | "rate";

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  transfer: "Transfer",
  rate: "Rate",
};

export interface Permissions {
  canViewPrices: boolean;
  canEditCars: boolean;
  canAddCars: boolean;
  canDownload: boolean;
  canViewStatistics: boolean;
}

export const PERMISSION_LABELS: Record<keyof Permissions, string> = {
  canViewPrices: "Poate vedea prețurile",
  canEditCars: "Poate edita mașini",
  canAddCars: "Poate adăuga mașini",
  canDownload: "Poate descărca",
  canViewStatistics: "Poate vedea statistici",
};

export const DEFAULT_PERMISSIONS: Permissions = {
  canViewPrices: false,
  canEditCars: false,
  canAddCars: true,
  canDownload: false,
  canViewStatistics: false,
};

export type CarStatus = "available" | "sold" | "reserved";

export const STATUS_LABELS: Record<CarStatus, string> = {
  available: "Disponibilă",
  sold: "Vândută",
  reserved: "Rezervată",
};

export interface CarDTO {
  _id: string;
  clientName: string;
  clientPhone: string; // mascat în listă
  brand: string;
  model: string;
  year: number;
  vin: string;
  color?: string;
  priceBuy: number;
  priceSell: number;
  paymentMethod: PaymentMethod;
  status: CarStatus;
  saleDate: string;
  soldBy: string;
  soldByName?: string;
  notes?: string;
  primaryPhoto?: string | null;
  photoCount?: number;
}

export interface UserDTO {
  _id: string;
  username: string;
  email?: string;
  fullName: string;
  role: "admin" | "worker";
  permissions: Permissions;
  fixedFee: number;
  bonus: number;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export type StockStatus = "available" | "sold";

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  available: "Disponibilă",
  sold: "Vândută",
};

// Mașină în stoc / la realizare.
export interface InventoryDTO {
  _id: string;
  brand: string;
  model: string;
  year: number;
  vin?: string;
  color?: string;
  ownerName: string;
  ownerPhone: string;
  clientWantPrice: number; // prețul cerut de proprietar
  sellPrice: number; // prețul de vânzare al parcării
  markup: number; // adaosul parcării = sellPrice - clientWantPrice
  status: StockStatus;
  notes?: string;
  published?: boolean;
  listingTitle?: string | null;
  listingDescription?: string | null;
  addedByName?: string;
  createdAt: string;
  primaryPhoto?: string | null;
  photoCount?: number;
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: "Autentificare reușită",
  LOGIN_FAILED: "Autentificare eșuată",
  LOGOUT: "Deconectare",
  CREATE_SALE: "Adăugare vânzare",
  EDIT_SALE: "Editare vânzare",
  DELETE_SALE: "Ștergere vânzare",
  CREATE_USER: "Creare utilizator",
  EDIT_USER_PERMISSIONS: "Editare utilizator",
  DELETE_USER: "Ștergere utilizator",
  DOWNLOAD_EXCEL: "Descărcare Excel",
  VIEW_STATISTICS: "Vizualizare statistici",
  REVEAL_PHONE: "Dezvăluire telefon",
  CREATE_STOCK: "Adăugare mașină în stoc",
  EDIT_STOCK: "Editare mașină stoc",
  DELETE_STOCK: "Ștergere mașină stoc",
  CREATE_TASK: "Adăugare sarcină",
  EDIT_TASK: "Editare sarcină",
  DELETE_TASK: "Ștergere sarcină",
  CREATE_WORK_ORDER: "Adăugare lucrare",
  EDIT_WORK_ORDER: "Editare lucrare",
  DELETE_WORK_ORDER: "Ștergere lucrare",
  CREATE_IMPORT: "Adăugare import",
  EDIT_IMPORT: "Editare import",
  DELETE_IMPORT: "Ștergere import",
  PUBLISH_INSTAGRAM: "Publicare pe Instagram",
};

export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABELS);

export interface AuditDTO {
  _id: string;
  userName: string;
  action: string;
  details: Record<string, unknown>;
  ipAddress: string;
  locationCity: string;
  locationCountry: string;
  locationRegion?: string;
  locationZip?: string;
  locationLat?: number;
  locationLon?: number;
  locationIsp?: string;
  device: string;
  browser: string;
  userAgent?: string;
  createdAt: string;
}

// ---- Sarcini (task management) ----

export type TaskType =
  | "general" | "test_drive" | "bring_car" | "to_asp"
  | "service" | "wash" | "detailing" | "customs" | "delivery";

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  general: "General",
  test_drive: "Vizionare client",
  bring_car: "Aducere mașină (evaluare)",
  to_asp: "Ducere la ASP (vânzare)",
  service: "Service",
  wash: "Spălătorie",
  detailing: "Detailing",
  customs: "Devamare / import",
  delivery: "Livrare / predare",
};

export type TaskStatus = "todo" | "in_progress" | "done";

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "De făcut",
  in_progress: "În lucru",
  done: "Finalizat",
};

export type TaskPriority = "low" | "normal" | "high";

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Scăzută",
  normal: "Normală",
  high: "Urgentă",
};

export interface TaskDTO {
  _id: string;
  title: string;
  description?: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string | null;
  assignedToName?: string | null;
  createdByName?: string | null;
  carId?: string | null;
  inventoryId?: string | null;
  carLabel?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

// ---- Fotografii mașini ----
export interface PhotoDTO {
  _id: string;
  carId?: string | null;
  inventoryId?: string | null;
  url: string;
  path: string;
  sortOrder: number;
  createdAt: string;
}

// ---- Lucrări: service / spălătorie / detailing ----
export type WorkType = "service" | "wash" | "detailing" | "other";
export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  service: "Service",
  wash: "Spălătorie",
  detailing: "Detailing",
  other: "Altă lucrare",
};
export type WorkStatus = "pending" | "in_progress" | "done";
export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  pending: "În așteptare",
  in_progress: "În lucru",
  done: "Finalizat",
};
export interface WorkOrderDTO {
  _id: string;
  type: WorkType;
  carId?: string | null;
  inventoryId?: string | null;
  carLabel?: string | null;
  responsibleId?: string | null;
  responsibleName?: string | null;
  status: WorkStatus;
  cost: number;
  dateIn?: string | null;
  dateOut?: string | null;
  notes?: string | null;
  createdByName?: string | null;
  createdAt: string;
}

// ---- Import & devamare ----
export type ImportStage = "purchased" | "in_transit" | "arrived" | "customs" | "ready" | "done";
export const IMPORT_STAGE_LABELS: Record<ImportStage, string> = {
  purchased: "Cumpărată",
  in_transit: "În transport",
  arrived: "Sosită",
  customs: "Devamare",
  ready: "Gata de vânzare",
  done: "Finalizat",
};
export interface ImportDTO {
  _id: string;
  brand: string;
  model: string;
  year?: number | null;
  vin?: string | null;
  source?: string | null;
  supplierName?: string | null;
  stage: ImportStage;
  purchasePrice: number;
  customsCost: number;
  otherCosts: number;
  totalCost: number;
  responsibleId?: string | null;
  responsibleName?: string | null;
  expectedDate?: string | null;
  arrivedDate?: string | null;
  notes?: string | null;
  createdByName?: string | null;
  createdAt: string;
}
