import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

// Notă: referințele între tabele (soldBy, addedBy, deletedBy, saleId, userId)
// sunt coloane uuid FĂRĂ constrângeri de cheie străină, ca să păstrăm exact
// comportamentul „relaxat" de dinainte (un utilizator poate fi șters, iar
// vânzările lui rămân cu id-ul vechi — codul gestionează cazul lipsă).

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email"),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("worker"),
  permissions: jsonb("permissions")
    .$type<Record<string, boolean>>()
    .notNull()
    .default({}),
  fixedFee: doublePrecision("fixed_fee").notNull().default(50),
  bonus: doublePrecision("bonus").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  lastLogin: timestamp("last_login", { withTimezone: true, mode: "date" }),
});

export const cars = pgTable("cars", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  vin: text("vin").notNull().unique(),
  color: text("color"),
  priceBuy: doublePrecision("price_buy").notNull().default(0),
  priceSell: doublePrecision("price_sell").notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  status: text("status").notNull().default("sold"),
  saleDate: timestamp("sale_date", { withTimezone: true, mode: "date" }).notNull(),
  soldBy: uuid("sold_by"),
  soldByName: text("sold_by_name"),
  notes: text("notes"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  deletedBy: uuid("deleted_by"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  vin: text("vin"),
  color: text("color"),
  ownerName: text("owner_name").notNull(),
  ownerPhone: text("owner_phone").notNull(),
  clientWantPrice: doublePrecision("client_want_price").notNull().default(0),
  sellPrice: doublePrecision("sell_price").notNull(),
  status: text("status").notNull().default("available"),
  notes: text("notes"),
  // Publicare externă (site / 999.md / Instagram).
  published: boolean("published").notNull().default(false),
  listingTitle: text("listing_title"),
  listingDescription: text("listing_description"),
  addedBy: uuid("added_by"),
  addedByName: text("added_by_name"),
  soldBy: uuid("sold_by"),
  soldByName: text("sold_by_name"),
  saleId: uuid("sale_id"),
  saleDate: timestamp("sale_date", { withTimezone: true, mode: "date" }),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
  deletedBy: uuid("deleted_by"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const carPhotos = pgTable("car_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  carId: uuid("car_id"),
  inventoryId: uuid("inventory_id"),
  url: text("url").notNull(),
  path: text("path").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  uploadedBy: uuid("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  // general | test_drive | bring_car | to_asp | service | wash | detailing | customs | delivery
  type: text("type").notNull().default("general"),
  // todo | in_progress | done
  status: text("status").notNull().default("todo"),
  // low | normal | high
  priority: text("priority").notNull().default("normal"),
  assignedTo: uuid("assigned_to"),
  assignedToName: text("assigned_to_name"),
  createdBy: uuid("created_by"),
  createdByName: text("created_by_name"),
  carId: uuid("car_id"),
  inventoryId: uuid("inventory_id"),
  carLabel: text("car_label"),
  dueDate: timestamp("due_date", { withTimezone: true, mode: "date" }),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const workOrders = pgTable("work_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  // service | wash | detailing | other
  type: text("type").notNull().default("service"),
  carId: uuid("car_id"),
  inventoryId: uuid("inventory_id"),
  carLabel: text("car_label"),
  responsibleId: uuid("responsible_id"),
  responsibleName: text("responsible_name"),
  // pending | in_progress | done
  status: text("status").notNull().default("pending"),
  cost: doublePrecision("cost").notNull().default(0),
  dateIn: timestamp("date_in", { withTimezone: true, mode: "date" }),
  dateOut: timestamp("date_out", { withTimezone: true, mode: "date" }),
  notes: text("notes"),
  createdBy: uuid("created_by"),
  createdByName: text("created_by_name"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const imports = pgTable("imports", {
  id: uuid("id").primaryKey().defaultRandom(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  year: integer("year"),
  vin: text("vin"),
  source: text("source"), // țara/piața de proveniență
  supplierName: text("supplier_name"),
  // purchased | in_transit | arrived | customs | ready | done
  stage: text("stage").notNull().default("purchased"),
  purchasePrice: doublePrecision("purchase_price").notNull().default(0),
  customsCost: doublePrecision("customs_cost").notNull().default(0),
  otherCosts: doublePrecision("other_costs").notNull().default(0),
  responsibleId: uuid("responsible_id"),
  responsibleName: text("responsible_name"),
  expectedDate: timestamp("expected_date", { withTimezone: true, mode: "date" }),
  arrivedDate: timestamp("arrived_date", { withTimezone: true, mode: "date" }),
  notes: text("notes"),
  createdBy: uuid("created_by"),
  createdByName: text("created_by_name"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  userName: text("user_name"),
  action: text("action").notNull(),
  details: jsonb("details")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  ipAddress: text("ip_address"),
  locationCity: text("location_city"),
  locationCountry: text("location_country"),
  locationRegion: text("location_region"),
  locationZip: text("location_zip"),
  locationLat: doublePrecision("location_lat"),
  locationLon: doublePrecision("location_lon"),
  locationIsp: text("location_isp"),
  device: text("device"),
  browser: text("browser"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type CarRow = typeof cars.$inferSelect;
export type InventoryRow = typeof inventory.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type TaskRow = typeof tasks.$inferSelect;
export type CarPhotoRow = typeof carPhotos.$inferSelect;
export type WorkOrderRow = typeof workOrders.$inferSelect;
export type ImportRow = typeof imports.$inferSelect;
