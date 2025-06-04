import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // admin, hod, bookkeeper
  department: text("department"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  vendorName: text("vendor_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  invoiceDate: timestamp("invoice_date").notNull(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected, paid
  source: text("source").notNull(), // manual, rpa
  fileName: text("file_name"),
  filePath: text("file_path"),
  ocrData: jsonb("ocr_data"), // extracted OCR data
  matchingResults: jsonb("matching_results"), // AI matching results
  flags: jsonb("flags"), // flagged issues
  comments: text("comments"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  vendorName: text("vendor_name").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  poDate: timestamp("po_date").notNull(),
  status: text("status").notNull().default("active"), // active, completed, cancelled
  items: jsonb("items"), // array of items ordered
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliveries = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  deliveryNumber: text("delivery_number").notNull().unique(),
  poId: integer("po_id").references(() => purchaseOrders.id),
  vendorName: text("vendor_name").notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  items: jsonb("items"), // array of delivered items
  status: text("status").notNull().default("received"), // received, partial, pending
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // upload, approve, reject, match, etc.
  entityType: text("entity_type").notNull(), // invoice, user, etc.
  entityId: integer("entity_id").notNull(),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
}).extend({
  role: z.enum(["admin", "hod", "bookkeeper"]),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  status: z.enum(["pending", "approved", "rejected", "paid"]).default("pending"),
  source: z.enum(["manual", "rpa"]),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({
  id: true,
  createdAt: true,
});

export const insertDeliverySchema = createInsertSchema(deliveries).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type Delivery = typeof deliveries.$inferSelect;
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
