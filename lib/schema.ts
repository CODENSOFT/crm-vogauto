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
