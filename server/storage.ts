import { 
  users, invoices, purchaseOrders, deliveries, auditLogs,
  type User, type InsertUser, 
  type Invoice, type InsertInvoice,
  type PurchaseOrder, type InsertPurchaseOrder,
  type Delivery, type InsertDelivery,
  type AuditLog, type InsertAuditLog
} from "@shared/schema";
import bcrypt from "bcrypt";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  validatePassword(email: string, password: string): Promise<User | null>;

  // Invoice operations
  getInvoice(id: number): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByStatus(status: string): Promise<Invoice[]>;
  getInvoicesByUser(userId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice | undefined>;
  
  // Purchase Order operations
  getAllPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  
  // Delivery operations
  getAllDeliveries(): Promise<Delivery[]>;
  getDeliveriesByPO(poId: number): Promise<Delivery[]>;
  createDelivery(delivery: InsertDelivery): Promise<Delivery>;
  
  // Audit operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(entityType?: string, entityId?: number): Promise<AuditLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private invoices: Map<number, Invoice> = new Map();
  private purchaseOrders: Map<number, PurchaseOrder> = new Map();
  private deliveries: Map<number, Delivery> = new Map();
  private auditLogs: Map<number, AuditLog> = new Map();
  private currentId = 1;

  constructor() {
    this.initializeDummyData();
  }

  private async initializeDummyData() {
    // Create dummy users
    const adminUser = await this.createUser({
      email: "admin@bharatinvo.com",
      password: await bcrypt.hash("admin123", 10),
      name: "Admin User",
      role: "admin",
      department: "Administration",
      isActive: true,
    });

    const hodUser = await this.createUser({
      email: "hod@bharatinvo.com", 
      password: await bcrypt.hash("hod123", 10),
      name: "Finance HOD",
      role: "hod",
      department: "Finance",
      isActive: true,
    });

    const bookkeeper = await this.createUser({
      email: "bookkeeper@bharatinvo.com",
      password: await bcrypt.hash("book123", 10), 
      name: "Bookkeeper User",
      role: "bookkeeper",
      department: "Accounts",
      isActive: true,
    });

    // Create dummy purchase orders
    await this.createPurchaseOrder({
      poNumber: "PO-2024-001",
      vendorName: "Acme Corporation",
      amount: "25000.00",
      poDate: new Date("2024-01-10"),
      status: "active",
      items: [
        { description: "Office Supplies", quantity: 100, unitPrice: 250 }
      ]
    });

    await this.createPurchaseOrder({
      poNumber: "PO-2024-002", 
      vendorName: "Tech Solutions Ltd",
      amount: "150000.00",
      poDate: new Date("2024-01-12"),
      status: "active",
      items: [
        { description: "Software License", quantity: 5, unitPrice: 30000 }
      ]
    });

    // Create dummy deliveries
    await this.createDelivery({
      deliveryNumber: "DEL-2024-001",
      poId: 1,
      vendorName: "Acme Corporation",
      deliveryDate: new Date("2024-01-14"),
      items: [
        { description: "Office Supplies", quantityDelivered: 100, quantityOrdered: 100 }
      ],
      status: "received"
    });

    // Create dummy invoices
    await this.createInvoice({
      invoiceNumber: "INV-2024-001",
      vendorName: "Acme Corporation", 
      amount: "25000.00",
      invoiceDate: new Date("2024-01-15"),
      dueDate: new Date("2024-02-15"),
      status: "pending",
      source: "manual",
      fileName: "invoice_001.pdf",
      ocrData: {
        invoiceNumber: "INV-2024-001",
        vendorName: "Acme Corporation",
        amount: 25000,
        date: "2024-01-15",
        confidence: 0.95
      },
      matchingResults: {
        poMatch: { matched: true, confidence: 0.98, poNumber: "PO-2024-001" },
        deliveryMatch: { matched: true, confidence: 0.96, deliveryNumber: "DEL-2024-001" },
        amountMatch: { matched: true, variance: 0 }
      },
      flags: [],
      uploadedBy: bookkeeper.id
    });

    await this.createInvoice({
      invoiceNumber: "INV-2024-002",
      vendorName: "Tech Solutions Ltd",
      amount: "151000.00", 
      invoiceDate: new Date("2024-01-16"),
      dueDate: new Date("2024-02-16"),
      status: "pending",
      source: "rpa",
      fileName: "invoice_002.pdf",
      ocrData: {
        invoiceNumber: "INV-2024-002", 
        vendorName: "Tech Solutions Ltd",
        amount: 151000,
        date: "2024-01-16",
        confidence: 0.92
      },
      matchingResults: {
        poMatch: { matched: true, confidence: 0.94, poNumber: "PO-2024-002" },
        deliveryMatch: { matched: false, confidence: 0.0 },
        amountMatch: { matched: false, variance: 1000 }
      },
      flags: ["Amount exceeds PO by ₹1,000", "No delivery record found"],
      uploadedBy: bookkeeper.id
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = {
      ...insertUser,
      id,
      lastLogin: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async validatePassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;
    
    // Update last login
    await this.updateUser(user.id, { lastLogin: new Date() });
    return user;
  }

  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values());
  }

  async getInvoicesByStatus(status: string): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.status === status);
  }

  async getInvoicesByUser(userId: number): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).filter(invoice => invoice.uploadedBy === userId);
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = this.currentId++;
    const invoice: Invoice = {
      ...insertInvoice,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = this.invoices.get(id);
    if (!invoice) return undefined;
    
    const updatedInvoice = { ...invoice, ...updates, updatedAt: new Date() };
    this.invoices.set(id, updatedInvoice);
    return updatedInvoice;
  }

  // Purchase Order operations
  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    return Array.from(this.purchaseOrders.values());
  }

  async getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrder | undefined> {
    return Array.from(this.purchaseOrders.values()).find(po => po.poNumber === poNumber);
  }

  async createPurchaseOrder(insertPO: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const id = this.currentId++;
    const po: PurchaseOrder = {
      ...insertPO,
      id,
      createdAt: new Date(),
    };
    this.purchaseOrders.set(id, po);
    return po;
  }

  // Delivery operations
  async getAllDeliveries(): Promise<Delivery[]> {
    return Array.from(this.deliveries.values());
  }

  async getDeliveriesByPO(poId: number): Promise<Delivery[]> {
    return Array.from(this.deliveries.values()).filter(delivery => delivery.poId === poId);
  }

  async createDelivery(insertDelivery: InsertDelivery): Promise<Delivery> {
    const id = this.currentId++;
    const delivery: Delivery = {
      ...insertDelivery,
      id,
      createdAt: new Date(),
    };
    this.deliveries.set(id, delivery);
    return delivery;
  }

  // Audit operations
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const id = this.currentId++;
    const log: AuditLog = {
      ...insertLog,
      id,
      timestamp: new Date(),
    };
    this.auditLogs.set(id, log);
    return log;
  }

  async getAuditLogs(entityType?: string, entityId?: number): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values());
    
    if (entityType) {
      logs = logs.filter(log => log.entityType === entityType);
    }
    
    if (entityId) {
      logs = logs.filter(log => log.entityId === entityId);
    }
    
    return logs.sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());
  }
}

export const storage = new MemStorage();
