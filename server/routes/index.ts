import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerAuditLogRoutes } from "./audit-logs";
import { registerAuthRoutes } from "./auth";
import registerAnalyticsRoutes from "./analytics";
import { registerDashboardRoutes } from "./dashboard";
import { registerDeliveryRoutes } from "./deliveries";
import { registerInvoiceRoutes } from "./invoices";
import { registerPurchaseOrderRoutes } from "./purchase-orders";
import { registerUserRoutes } from "./users";
import { registerSettingsRoutes } from "./settings";

// ... inside registerRoutes function
export async function registerRoutes(app: Express): Promise<Server> {
  registerAnalyticsRoutes(app);
  registerAuditLogRoutes(app);
  registerAuthRoutes(app);
  registerDashboardRoutes(app);
  registerDeliveryRoutes(app);
  registerInvoiceRoutes(app);
  registerPurchaseOrderRoutes(app);
  registerUserRoutes(app);
  registerSettingsRoutes(app); // Add this line
  
  const httpServer = createServer(app);
  return httpServer;
}