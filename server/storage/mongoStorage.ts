import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  User, InsertUser,
  Invoice, InsertInvoice,
  PurchaseOrder, InsertPurchaseOrder,
  Delivery, InsertDelivery,
  AuditLog, InsertAuditLog,
  Payment, InsertPayment
} from '@shared/schema';
import { UserModel, InvoiceModel, PurchaseOrderModel, DeliveryModel, AuditLogModel, PaymentModel, SettingsModel } from '../models';
import 'dotenv/config';

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  validatePassword(email: string, password: string): Promise<User | null>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByStatus(status: string): Promise<Invoice[]>;
  getInvoicesByUser(userId: string): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;
  getAllPurchaseOrders(): Promise<PurchaseOrder[]>;
  getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(po: InsertPurchaseOrder): Promise<PurchaseOrder>;
  getAllDeliveries(): Promise<Delivery[]>;
  getDeliveriesByPO(poId: string): Promise<Delivery[]>;
  createDelivery(delivery: InsertDelivery): Promise<Delivery>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]>;
  deleteUser(id: string): Promise<any | null>;
  deletePurchaseOrder(id: string): Promise<any | null>;
  deleteDelivery(id: string): Promise<any | null>;
  deleteInvoice(id: string): Promise<any | null>;
  getDeliveryByNumber(deliveryNumber: string): Promise<any | null>;
  getInvoiceByNumber(invoiceNumber: string): Promise<any | null>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByInvoice(invoiceId: string): Promise<Payment[]>;
  //Annie
  getPaymentsByInvoice(invoiceId: string): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  getAutoApproveSetting(): Promise<boolean>;
  setAutoApproveSetting(autoApprove: boolean): Promise<void>;
}

export class MongoStorage implements IStorage {
  constructor() {
    this.connect();
  }

  private async connect() {
    try {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error('MONGODB_URI is not defined in .env file');
      }
      await mongoose.connect(uri);
      console.log('Connected to MongoDB Atlas');
    } catch (error) {
      console.error('MongoDB connection error: ', error);
      process.exit(1);
    }
  }
  async getAutoApproveSetting(): Promise<boolean> {
    let settings = await SettingsModel.findOne({});
    if (!settings) {
      settings = new SettingsModel({ autoApprove: false });
      await settings.save();
    }
    return settings.autoApprove;
  }

  async setAutoApproveSetting(autoApprove: boolean): Promise<void> {
    await SettingsModel.updateOne({}, { autoApprove }, { upsert: true });
  }
  async getUser(id: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ id });
    return user ? user.toObject() : undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ email });
    return user ? user.toObject() : undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user = new UserModel({
      ...insertUser,
      id: insertUser.id || uuidv4(),
      lastLogin: null,
      createdAt: new Date(),
    });
    await user.save();
    return user.toObject();
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = await UserModel.findOneAndUpdate({ id }, updates, { new: true });
    return user ? user.toObject() : undefined;
  }

  async getAllUsers(): Promise<User[]> {
    const users = await UserModel.find();
    return users.map(user => user.toObject());
  }

  async validatePassword(email: string, password: string): Promise<User | null> {
    const user = await UserModel.findOne({ email });
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    await UserModel.findOneAndUpdate({ email }, { lastLogin: new Date() });
    return user.toObject();
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const invoice = await InvoiceModel.findOne({ id });
    return invoice ? invoice.toObject() : undefined;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    const invoices = await InvoiceModel.find();
    return invoices.map(invoice => invoice.toObject());
  }

  async getInvoicesByStatus(status: string): Promise<Invoice[]> {
    const invoices = await InvoiceModel.find({ status });
    return invoices.map(invoice => invoice.toObject());
  }

  async getInvoicesByUser(userId: string): Promise<Invoice[]> {
    const invoices = await InvoiceModel.find({ uploadedBy: userId });
    return invoices.map(invoice => invoice.toObject());
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const invoice = new InvoiceModel({
      ...insertInvoice,
      id: insertInvoice.id || uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await invoice.save();
    return invoice.toObject();
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const invoice = await InvoiceModel.findOneAndUpdate({ id }, { ...updates, updatedAt: new Date() }, { new: true });
    return invoice ? invoice.toObject() : undefined;
  }

  async getAllPurchaseOrders(): Promise<PurchaseOrder[]> {
    const pos = await PurchaseOrderModel.find();
    return pos.map(po => po.toObject());
  }

  async getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrder | undefined> {
    const po = await PurchaseOrderModel.findOne({ poNumber });
    return po ? po.toObject() : undefined;
  }

  async createPurchaseOrder(insertPO: InsertPurchaseOrder): Promise<PurchaseOrder> {
    const po = new PurchaseOrderModel({
      ...insertPO,
      id: insertPO.id || uuidv4(),
      createdAt: new Date(),
    });
    await po.save();
    return po.toObject();
  }

  async getAllDeliveries(): Promise<Delivery[]> {
    const deliveries = await DeliveryModel.find();
    return deliveries.map(delivery => delivery.toObject());
  }

  async getDeliveriesByPO(poId: string): Promise<Delivery[]> {
    const deliveries = await DeliveryModel.find({ poId });
    return deliveries.map(delivery => delivery.toObject());
  }

  async createDelivery(insertDelivery: InsertDelivery): Promise<Delivery> {
    const delivery = new DeliveryModel({
      ...insertDelivery,
      id: insertDelivery.id || uuidv4(),
      createdAt: new Date(),
    });
    await delivery.save();
    return delivery.toObject();
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const log = new AuditLogModel({
      ...insertLog,
      id: uuidv4(),
      timestamp: new Date(),
    });
    await log.save();
    return log.toObject();
  }

  async getAuditLogs(entityType?: string, entityId?: string): Promise<AuditLog[]> {
    const query: any = {};
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;

    const logs = await AuditLogModel.find(query).sort({ timestamp: -1 });
    return logs.map(log => log.toObject());
  }

  async deleteUser(id: string): Promise<any | null> {
    const user = await UserModel.findOneAndDelete({ id });
    return user ? user.toObject() : null;
  }

  async deletePurchaseOrder(id: string): Promise<any | null> {
    const po = await PurchaseOrderModel.findOneAndDelete({ id });
    return po ? po.toObject() : null;
  }

  async deleteDelivery(id: string): Promise<any | null> {
    const delivery = await DeliveryModel.findOneAndDelete({ id });
    return delivery ? delivery.toObject() : null;
  }

  async deleteInvoice(id: string): Promise<any | null> {
    const invoice = await InvoiceModel.findOneAndDelete({ id });
    return invoice ? invoice.toObject() : null;
  }

  async getDeliveryByNumber(deliveryNumber: string): Promise<any | null> {
    const delivery = await DeliveryModel.findOne({ deliveryNumber });
    return delivery ? delivery.toObject() : null;
  }

  async getInvoiceByNumber(invoiceNumber: string): Promise<any | null> {
    const invoice = await InvoiceModel.findOne({ invoiceNumber });
    return invoice ? invoice.toObject() : null;
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const payment = new PaymentModel({
      ...insertPayment,
      id: insertPayment.id || uuidv4(),
      createdAt: new Date(),
    });
    console.log("Saving new payment:", payment);
    await payment.save();
    return payment.toObject();
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const payment = await PaymentModel.findOne({ id });
    return payment ? payment.toObject() : undefined;
  }

  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    const payments = await PaymentModel.find({ invoiceId });
    return payments.map(payment => payment.toObject());
  }

  async getAllPayments(): Promise<Payment[]> {
    const payments = await PaymentModel.find().sort({ paymentDate: -1 });
    console.log("==> getAllPayments returned:", payments);
    return payments.map(payment => payment.toObject());
  }


}

export const storage = new MongoStorage();