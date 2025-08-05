import type { Express } from "express";
import { storage } from "../storage/mongoStorage";
import { authenticate } from "../utils/auth";
import { log } from "../utils/vite";

export function registerSettingsRoutes(app: Express) {
  app.patch("/api/settings/auto-approve", authenticate, async (req: any, res) => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const { autoApprove } = req.body;
      if (typeof autoApprove !== "boolean") {
        return res.status(400).json({ message: "autoApprove must be a boolean" });
      }

      await storage.setAutoApproveSetting(autoApprove);
      log(`[settings] Auto-approve setting updated to ${autoApprove} by user ${req.user.id}`);
      
      await storage.createAuditLog({
        userId: req.user.id.toString(),
        action: "update_auto_approve",
        entityType: "settings",
        entityId: "global",
        details: { autoApprove },
      });

      res.json({ autoApprove });
    } catch (error) {
      log(`[settings] Update auto-approve error: ${(error as Error).message}`);
      res.status(500).json({ message: "Failed to update auto-approve setting", error: (error as Error).message });
    }
  });

  app.get("/api/settings/auto-approve", authenticate, async (req: any, res) => {
    try {
      const autoApprove = await storage.getAutoApproveSetting();
      res.json({ autoApprove });
    } catch (error) {
      log(`[settings] Get auto-approve error: ${(error as Error).message}`);
      res.status(500).json({ message: "Failed to get auto-approve setting", error: (error as Error).message });
    }
  });
}