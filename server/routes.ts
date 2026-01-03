import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./localAuth";
import { apiLimiter } from "./rateLimiters";
import { uploadsDir } from "./routes/utils/multerConfig";

// Import refactored route modules
import { registerPublicRoutes } from "./routes/public";
import { registerAuthRoutes } from "./routes/auth";
import { registerUserRoutes } from "./routes/users";
import { registerLeadRoutes } from "./routes/leads";
import { registerSellerPoolRoutes } from "./routes/seller-pools";
import { registerMessageRoutes } from "./routes/messages";
import { registerAnalyticsRoutes } from "./routes/analytics";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Apply general rate limiting to all API routes
  app.use('/api/', apiLimiter);

  // Serve uploaded profile images
  app.use('/uploads/profile-images', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });
  app.use('/uploads/profile-images', express.static(uploadsDir));

  // ==========================================
  // MODULAR ROUTES - Fas A, B & C (COMPLETE)
  // ==========================================

  // Fas A & B - Low/Medium risk
  registerPublicRoutes(app);      // Public contact form, webhooks
  registerAuthRoutes(app);        // Login, logout, password reset
  registerUserRoutes(app);        // User profiles, admin operations

  // Fas C - High risk (business critical)
  registerLeadRoutes(app);        // Lead CRUD, assignment, notes, tasks
  registerSellerPoolRoutes(app);  // Round-robin pools per facility
  registerMessageRoutes(app);     // Internal messaging
  registerAnalyticsRoutes(app);   // Dashboard & overview stats

  const httpServer = createServer(app);

  return httpServer;
}
