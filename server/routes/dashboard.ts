import type { Express } from "express";
import { storage } from "../storage/mongoStorage";
import { authenticate } from "../utils/auth";
import { log } from "../utils/vite";

export function registerDashboardRoutes(app: Express) {
  app.get("/api/dashboard/stats", authenticate, async (req: any, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = {
        totalInvoices: invoices.length,
        pendingReview: invoices.filter((inv) => inv.status === "pending").length,
        approvedToday: invoices.filter(
          (inv) => inv.status === "approved" && new Date(inv.updatedAt!) >= today
        ).length,
        accuracy: calculateMatchingAccuracy(invoices),
      };

      res.json(stats);
    } catch (error) {
      log(`[dashboard] Stats error: ${(error as Error).message}`);
      res.status(500).json({ message: "Failed to get stats", error: (error as Error).message });
    }
  });

  app.get("/api/dashboard/activity", authenticate, async (req: any, res) => {
    try {
      const logs = await storage.getAuditLogs();
      const recentActivity = logs.slice(0, 10).map((log) => ({
        id: log.id,
        description: formatActivityDescription(log),
        timestamp: formatTimeAgo(log.timestamp!),
        status: getActivityStatus(log.action),
      }));

      res.json(recentActivity);
    } catch (error) {
      log(`[dashboard] Activity error: ${(error as Error).message}`);
      res.status(500).json({ message: "Failed to get activity", error: (error as Error).message });
    }
  });
}

function calculateMatchingAccuracy(invoices: any[]): number {
  if (invoices.length === 0) return 0;

  const processedInvoices = invoices.filter((inv) => inv.matchingResults);
  if (processedInvoices.length === 0) return 0;

  const totalScore = processedInvoices.reduce((sum, inv) => sum + (inv.matchingResults.overallScore || 0), 0);

  return Math.round((totalScore / processedInvoices.length) * 100 * 10) / 10;
}

function formatActivityDescription(log: any): string {
  switch (log.action) {
    case "upload":
      return `Invoice ${log.details?.fileName || "uploaded"} by user`;
    case "status_change":
      return `Invoice status changed to ${log.details?.status || "updated"}`;
    case "update":
      return `Invoice ${log.entityId} updated`;
    default:
      return `${log.action} performed on ${log.entityType} ${log.entityId}`;
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function getActivityStatus(action: string): string {
  switch (action) {
    case "upload":
      return "Pending";
    case "status_change":
      return "Completed";
    default:
      return "Processing";
  }
}