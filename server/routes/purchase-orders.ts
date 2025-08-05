import type { Express } from "express";
import { storage } from "../storage/mongoStorage";
import { authenticate } from "../utils/auth";
import { log } from "../utils/vite";

export function registerPurchaseOrderRoutes(app: Express) {
  app.get("/api/purchase-orders", authenticate, async (req, res) => {
    try {
      const purchaseOrders = await storage.getAllPurchaseOrders();
      res.json(purchaseOrders);
    } catch (error) {
      log(`[purchase-orders] Get error: ${(error as Error).message}`);
      res.status(500).json({ message: "Failed to get purchase orders", error: (error as Error).message });
    }
  });
}