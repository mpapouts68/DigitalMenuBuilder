import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeDatabase } from "./db";

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

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

// Comprehensive error handling wrapper for server initialization
async function startServer() {
  try {
    log("Starting server initialization...");
    
    // Initialize database connection first
    await initializeDatabase();
    log("Database initialized successfully");
    
    // Health check endpoint for deployment validation (register early)
    app.get('/health', (_req, res) => {
      res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development"
      });
    });

    // Register routes and get server instance
    const server = await registerRoutes(app);
    log("Routes registered successfully");

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      log(`Error ${status}: ${message}`, "error");
      res.status(status).json({ message });
      
      // Don't throw in production to keep server running
      if (process.env.NODE_ENV !== "production") {
        throw err;
      }
    });

    // Setup static file serving or Vite middleware
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
      log("Vite development server configured");
    } else {
      serveStatic(app);
      log("Static file serving configured");
    }

    // Production environment check and explicit port configuration
    // For Replit deployment, maintain port 5000 as the standard
    const port = process.env.PORT || process.env.REPL_PORT || 5000;
    const host = "0.0.0.0"; // Always bind to all interfaces for deployment
    
    server.listen({
      port,
      host,
      reusePort: true,
    }, () => {
      log(`Server running on ${host}:${port} in ${process.env.NODE_ENV || "development"} mode`);
    });

    // Graceful shutdown handling for production
    if (process.env.NODE_ENV === "production") {
      const gracefulShutdown = (signal: string) => {
        log(`Received ${signal}, shutting down gracefully...`);
        server.close(() => {
          log("Server closed");
          process.exit(0);
        });
      };

      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }

  } catch (error) {
    log(`Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
    console.error('Server startup error:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, "error");
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, "error");
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Start the server
startServer();
