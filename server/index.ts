import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./utils/vite";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // Setup vite in development
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    const port = 5000;
    const httpServer = server.listen({ port }, () => {
      log(`serving on port ${port}`);
    });

    // Handle server shutdown without cleaning test data
    process.on("SIGINT", () => {
      log("Received SIGINT. Shutting down...");
      httpServer.close(() => {
        log("Server closed.");
        process.exit(0);
      });
    });

    process.on("SIGTERM", () => {
      log("Received SIGTERM. Shutting down...");
      httpServer.close(() => {
        log("Server closed.");
        process.exit(0);
      });
    });
  } catch (error) {
    log(`Failed to start server: ${(error as Error).message}`);
    process.exit(1);
  }
})();