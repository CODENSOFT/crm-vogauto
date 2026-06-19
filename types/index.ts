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
}

export interface UserDTO {
  _id: string;
  username: string;
  email?: string;
  fullName: string;
  role: "admin" | "worker";
  permissions: Permissions;
  commissionPercent: number;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
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
