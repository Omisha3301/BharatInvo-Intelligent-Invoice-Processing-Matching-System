import { z } from 'zod';

// Existing schemas (unchanged)
export const insertUserSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['admin', 'hod', 'bookkeeper']),
  department: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const insertInvoiceSchema = z.object({
  id: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1),
  vendorId: z.object({
    name: z.string().min(1),
    email: z.string().email().nullable().default(null),
    phone: z.string().nullable().default(null),
    address: z.string().nullable().default(null),
    taxId: z.string().nullable().default(null),
  }),
  totalAmount: z.number().default(0),
  amount: z.string().default('0'),
  invoiceDate: z.date(),
  dueDate: z.date().optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'paid']).default('pending'),
  source: z.enum(['manual', 'rpa']),
  fileName: z.string().optional(),
  filePath: z.string().optional(),
  ocrData: z.any().optional(),
  matchingResults: z.any().optional(),
  flags: z.array(z.string()).optional(),
  comments: z.string().optional(),
  uploadedBy: z.string().optional(),
  reviewedBy: z.string().uuid().optional(),
  approvedBy: z.string().uuid().optional(),
  items: z.array(z.object({
    iname: z.string().min(1),
    amt: z.number().positive(),
    units: z.number().int().positive(),
    t_amt: z.number().positive(),
  })).optional(),
});

export const insertPurchaseOrderSchema = z.object({
  id: z.string().uuid().optional(),
  poNumber: z.string().min(1),
  vendorName: z.string().min(1),
  amount: z.string().min(1),
  poDate: z.date(),
  status: z.enum(['active', 'completed', 'cancelled']).default('active'),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })).optional(),
});

export const insertDeliverySchema = z.object({
  id: z.string().uuid().optional(),
  deliveryNumber: z.string().min(1),
  poId: z.string().uuid().optional(),
  vendorName: z.string().min(1),
  deliveryDate: z.date(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantityDelivered: z.number().int().nonnegative(),
    quantityOrdered: z.number().int().positive(),
  })).optional(),
  status: z.enum(['received', 'partial', 'pending']).default('received'),
});

export const insertAuditLogSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().uuid(),
  status: z.enum(['pending', 'completed', 'processing']).default('completed'),
  details: z.object({
    userName: z.string().min(1),
    invoiceNumber: z.string().optional(),
    message: z.string().min(1),
  }).optional(),
  timestamp: z.date().default(() => new Date()),
});

export const insertPaymentSchema = z.object({
  id: z.string().uuid().optional(),
  invoiceId: z.string().uuid(),
  vendorName: z.string().min(1),
  paymentDate: z.date().default(() => new Date()),
  amount: z.number().positive(),
});

export type User = z.infer<typeof insertUserSchema> & { lastLogin?: Date; createdAt: Date };
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Invoice = z.infer<typeof insertInvoiceSchema> & { createdAt: Date; updatedAt: Date };
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type PurchaseOrder = z.infer<typeof insertPurchaseOrderSchema> & { createdAt: Date };
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type Delivery = z.infer<typeof insertDeliverySchema> & { createdAt: Date };
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type AuditLog = z.infer<typeof insertAuditLogSchema> & { timestamp: Date };
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type Payment = z.infer<typeof insertPaymentSchema> & { createdAt: Date };
export type InsertPayment = z.infer<typeof insertPaymentSchema>;