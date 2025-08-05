import mongoose from "mongoose";
import { log } from "./utils/vite";
import { UserModel, InvoiceModel, PurchaseOrderModel, DeliveryModel, AuditLogModel, PaymentModel, } from "./models";
import "dotenv/config";
import { storage } from "./storage/mongoStorage";
async function clearCollections() {
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bharatinvo";

  try {
    // Connect to MongoDB
    log("[clear-db] Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    log("[clear-db] Connected to MongoDB");

    // Clear collections
    const collections = [
      { model: InvoiceModel, name: "invoices" },
      { model: PurchaseOrderModel, name: "purchaseOrders" },
      //{ model: DeliveryModel, name: "deliveries" },
      { model: AuditLogModel, name: "auditLogs" },
      { model: PaymentModel, name: "payments" },
      
    ];

    for (const { model, name } of collections) {
      await model.deleteMany({});
      log(`[clear-db] Cleared collection: ${name}`);
    }

    log("[clear-db] All collections cleared successfully");
  } catch (error) {
    log(`[clear-db] Error clearing collections: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log("[clear-db] Disconnected from MongoDB");
  }
}

clearCollections();