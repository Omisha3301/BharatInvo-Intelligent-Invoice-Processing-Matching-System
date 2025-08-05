import type { Express } from "express";
import { storage } from "../storage/mongoStorage";
import { authenticate } from "../utils/auth";
import { log } from "../utils/vite";

export function registerAuditLogRoutes(app: Express) {
  app.get("/api/audit-logs", authenticate, async (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { entityType, entityId } = req.query;
      const logs = await storage.getAuditLogs(
        entityType as string,
        entityId ? parseInt(entityId as string) : undefined
      );
      res.json(logs);
    } catch (error) {
      log(`[audit-logs] Get error: ${(error as Error).message}`);
      res.status(500).json({ message: "Failed to get audit logs", error: (error as Error).message });
    }
  });
}