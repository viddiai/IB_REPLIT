import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./static";
import { createImapWorkers } from "./imapWorker";
import { acceptanceWorker } from "./acceptanceWorker";

// Validate critical environment variables at startup
function validateEnvironment() {
  const errors: string[] = [];

  // Validate SESSION_SECRET
  if (!process.env.SESSION_SECRET) {
    errors.push("SESSION_SECRET is not set. Sessions will be insecure.");
  } else if (process.env.SESSION_SECRET.length < 32) {
    errors.push(`SESSION_SECRET is too short (${process.env.SESSION_SECRET.length} characters). It should be at least 32 characters for security.`);
  }

  // Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    errors.push("DATABASE_URL is not set. Database connection will fail.");
  }

  if (errors.length > 0) {
    console.error("\n❌ CRITICAL CONFIGURATION ERRORS:");
    errors.forEach(error => console.error(`  - ${error}`));
    console.error("\nApplication will not start. Please fix the above errors.\n");
    process.exit(1);
  }

  console.log("✅ Environment validation passed");
}

// Validate environment before starting the app
validateEnvironment();

const app = express();

// Security headers with helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Vite in dev
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for styled components
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Needed for some resources
}));

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
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    // Dynamic import to avoid bundling vite in production
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    const imapWorkers = createImapWorkers();
    if (imapWorkers.length > 0) {
      log(`Starting ${imapWorkers.length} IMAP worker(s)`);
      // Start workers sequentially with a delay to avoid rate limiting
      for (let i = 0; i < imapWorkers.length; i++) {
        setTimeout(() => {
          imapWorkers[i].start();
        }, i * 3000); // 3 second delay between each worker
      }
    } else {
      log("No IMAP workers configured");
    }

    log("Starting acceptance monitoring worker");
    acceptanceWorker.start();
  });
})();
