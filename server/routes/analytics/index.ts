import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../localAuth";

/**
 * Register analytics and dashboard routes
 * Handles statistics and reporting endpoints
 */
export function registerAnalyticsRoutes(app: Express): void {
  // Get dashboard statistics with filters
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const filters: any = {};

      // If seller, always filter by their userId
      if (user.role !== "MANAGER") {
        filters.userId = userId;
      } else {
        // For managers, allow filtering by sellerId from query params (skip if "all")
        if (req.query.sellerId && req.query.sellerId !== 'all') {
          filters.userId = req.query.sellerId as string;
        }
      }

      // Apply anlaggning filter if provided (skip if "all")
      if (req.query.anlaggning && req.query.anlaggning !== 'all') {
        filters.anlaggning = req.query.anlaggning as string;
      }

      // Apply date range filters if provided
      if (req.query.dateFrom) {
        filters.dateFrom = new Date(req.query.dateFrom as string);
      }

      if (req.query.dateTo) {
        filters.dateTo = new Date(req.query.dateTo as string);
      }

      const stats = await storage.getDashboardStats(filters);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Get overview statistics for user
  app.get('/api/overview/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stats = await storage.getOverviewStats(userId, user.role);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching overview stats:", error);
      res.status(500).json({ message: "Failed to fetch overview stats" });
    }
  });
}
