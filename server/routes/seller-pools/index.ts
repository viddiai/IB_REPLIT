import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../localAuth";
import { insertSellerPoolSchema } from "@shared/schema";
import { z } from "zod";

/**
 * Register seller pool management routes
 * Handles round-robin pools for lead distribution per facility
 */
export function registerSellerPoolRoutes(app: Express): void {
  // Get all seller pools (manager only)
  app.get('/api/seller-pools', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only managers can view seller pools" });
      }

      const { anlaggning } = req.query;
      const pools = await storage.getSellerPools(anlaggning as string);
      res.json(pools);
    } catch (error) {
      console.error("Error fetching seller pools:", error);
      res.status(500).json({ message: "Failed to fetch seller pools" });
    }
  });

  // Create seller pool (manager only)
  app.post('/api/seller-pools', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only managers can create seller pools" });
      }

      const validatedData = insertSellerPoolSchema.parse(req.body);
      const pool = await storage.createSellerPool(validatedData);
      res.status(201).json(pool);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating seller pool:", error);
      res.status(500).json({ message: "Failed to create seller pool" });
    }
  });

  // Reorder seller pools (manager only)
  app.patch('/api/seller-pools/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only managers can reorder seller pools" });
      }

      const reorderSchema = z.object({
        updates: z.array(z.object({
          id: z.string(),
          sortOrder: z.number(),
        })),
      });

      const validatedData = reorderSchema.parse(req.body);

      await storage.bulkUpdateSellerPoolOrder(validatedData.updates);

      res.json({ success: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error reordering seller pools:", error);
      res.status(500).json({ message: "Failed to reorder seller pools" });
    }
  });

  // Update seller pool (manager only)
  app.patch('/api/seller-pools/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only managers can update seller pools" });
      }

      const updateSchema = z.object({
        isEnabled: z.boolean().optional(),
        sortOrder: z.number().optional(),
      });

      const validatedData = updateSchema.parse(req.body);

      // Get current pool state for logging
      const currentPoolQuery = await storage.getSellerPools();
      const currentPool = currentPoolQuery.find(p => p.id === req.params.id);

      const pool = await storage.updateSellerPool(req.params.id, validatedData);

      if (!pool) {
        return res.status(404).json({ message: "Seller pool not found" });
      }

      // Log status change if isEnabled was changed
      if (validatedData.isEnabled !== undefined && currentPool && currentPool.isEnabled !== validatedData.isEnabled) {
        await storage.createStatusChangeHistory({
          sellerPoolId: pool.id,
          changedById: userId,
          newStatus: validatedData.isEnabled,
        });
      }

      res.json(pool);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating seller pool:", error);
      res.status(500).json({ message: "Failed to update seller pool" });
    }
  });

  // Get user's own seller pools
  app.get('/api/my-seller-pools', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      const userPools = await storage.getSellerPoolsByUserId(userId);
      res.json(userPools);
    } catch (error) {
      console.error("Error fetching own seller pools:", error);
      res.status(500).json({ message: "Misslyckades att hämta resurspooler" });
    }
  });

  // Sync user facilities (create/update pools for selected facilities)
  app.post('/api/my-facilities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      const facilitiesSchema = z.object({
        anlaggningar: z.array(z.enum(["Falkenberg", "Göteborg", "Trollhättan"])),
      });

      const validatedData = facilitiesSchema.parse(req.body);

      await storage.syncUserFacilities(userId, validatedData.anlaggningar);

      const updatedPools = await storage.getSellerPoolsByUserId(userId);
      res.json(updatedPools);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error syncing user facilities:", error);
      res.status(500).json({ message: "Misslyckades att uppdatera anläggningar" });
    }
  });

  // Update own seller pool status
  app.patch('/api/my-seller-pools/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      const statusSchema = z.object({
        isEnabled: z.boolean(),
      });

      const validatedData = statusSchema.parse(req.body);

      // Prevent enabling seller pool if email notifications are disabled
      if (validatedData.isEnabled && !user.emailOnLeadAssignment) {
        return res.status(400).json({
          message: "Du måste aktivera e-postnotifikationer för att kunna ta emot leads",
          code: "EMAIL_NOTIFICATIONS_REQUIRED"
        });
      }

      // Get the seller pool to verify ownership
      const allPools = await storage.getSellerPools();
      const pool = allPools.find(p => p.id === req.params.id);

      if (!pool) {
        return res.status(404).json({ message: "Resurspool hittades inte" });
      }

      // Verify the pool belongs to the current user
      if (pool.userId !== userId) {
        return res.status(403).json({ message: "Du kan bara ändra din egen status" });
      }

      const updatedPool = await storage.updateSellerPool(req.params.id, { isEnabled: validatedData.isEnabled });

      if (!updatedPool) {
        return res.status(404).json({ message: "Resurspool hittades inte" });
      }

      // Log the status change
      await storage.createStatusChangeHistory({
        sellerPoolId: updatedPool.id,
        changedById: userId,
        newStatus: validatedData.isEnabled,
      });

      res.json(updatedPool);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error updating own seller pool status:", error);
      res.status(500).json({ message: "Misslyckades att uppdatera status" });
    }
  });

  // Get status change history for a seller pool
  app.get('/api/seller-pools/:id/status-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const history = await storage.getStatusChangeHistoryBySellerPool(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching status change history:", error);
      res.status(500).json({ message: "Failed to fetch status change history" });
    }
  });
}
