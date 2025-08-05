import type { Express } from "express";
import { storage } from "../storage/mongoStorage";
import { authenticate } from "../utils/auth";
import { log } from "../utils/vite";

export function registerDeliveryRoutes(app: Express) {
  app.get("/api/deliveries", authenticate, async (req, res) => {
    try {
      const deliveries = await storage.getAllDeliveries();
      res.json(deliveries);
    } catch (error) {
      log(`[deliveries] Get error: ${(error as Error).message}`);
      res.status(500).json({ message: "Failed to get deliveries", error: (error as Error).message });
    }
  });
}