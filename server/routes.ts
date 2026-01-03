import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isManager } from "./localAuth";
import { insertLeadSchema, insertLeadNoteSchema, insertLeadTaskSchema, insertSellerPoolSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import { roundRobinService } from "./roundRobin";
import { notificationService } from "./notificationService";
import { apiLimiter } from "./rateLimiters";
import { uploadsDir } from "./routes/utils/multerConfig";

// Import refactored route modules
import { registerPublicRoutes } from "./routes/public";
import { registerAuthRoutes } from "./routes/auth";
import { registerUserRoutes } from "./routes/users";

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
  // REFACTORED ROUTES (Fas A & B - COMPLETE)
  // ==========================================
  registerPublicRoutes(app);
  registerAuthRoutes(app);
  registerUserRoutes(app);

  app.get('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { status, anlaggning, assignedToId } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (anlaggning) filters.anlaggning = anlaggning;
      
      if (user.role === "MANAGER") {
        if (assignedToId) {
          filters.assignedToId = assignedToId;
        }
      } else {
        filters.assignedToId = userId;
      }

      const leads = await storage.getLeads(filters);
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const hasMessages = await storage.hasMessagesForLead(userId, lead.id);
      if (user.role !== "MANAGER" && lead.assignedToId !== userId && !hasMessages) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const validatedData = insertLeadSchema.parse(req.body);
      const lead = await storage.createLead(validatedData);
      res.status(201).json(lead);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.patch('/api/leads/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const statusSchema = z.object({
        status: z.enum(["NY_INTRESSEANMALAN", "KUND_KONTAKTAD", "VUNNEN", "FORLORAD"]),
      });

      const validatedData = statusSchema.parse(req.body);
      const updatedLead = await storage.updateLeadStatus(req.params.id, validatedData.status, userId);
      res.json(updatedLead);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error.message === "Lead not found") {
        return res.status(404).json({ message: "Lead not found" });
      }
      console.error("Error updating lead status:", error);
      res.status(500).json({ message: "Failed to update lead status" });
    }
  });

  app.post('/api/leads/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (!lead.anlaggning) {
        return res.status(400).json({ message: "Lead must have a facility assigned" });
      }

      const nextSellerId = await roundRobinService.assignLeadToNextSeller(lead.anlaggning);
      if (!nextSellerId) {
        return res.status(400).json({ message: "No available sellers for this facility" });
      }

      const updatedLead = await storage.assignLead(req.params.id, nextSellerId);
      
      await notificationService.notifyLeadAssignment(req.params.id, nextSellerId);
      
      res.json(updatedLead);
    } catch (error: any) {
      if (error.message === "Lead not found") {
        return res.status(404).json({ message: "Lead not found" });
      }
      console.error("Error assigning lead via round-robin:", error);
      res.status(500).json({ message: "Failed to assign lead" });
    }
  });

  app.patch('/api/leads/:id/assign', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only managers can reassign leads" });
      }

      const assignSchema = z.object({
        assignedToId: z.string().min(1),
      });

      const validatedData = assignSchema.parse(req.body);
      
      const targetUser = await storage.getUser(validatedData.assignedToId);
      if (!targetUser) {
        return res.status(400).json({ message: "Target user does not exist" });
      }

      // Get current lead state for audit log
      const currentLead = await storage.getLead(req.params.id);
      if (!currentLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const updatedLead = await storage.assignLead(req.params.id, validatedData.assignedToId);
      
      // Create audit log entry for reassignment
      const fromUser = currentLead.assignedToId ? await storage.getUser(currentLead.assignedToId) : null;
      const toUser = await storage.getUser(validatedData.assignedToId);
      await storage.createAuditLog({
        leadId: req.params.id,
        userId: userId,
        action: "REASSIGNED",
        fromValue: fromUser ? `${fromUser.firstName} ${fromUser.lastName}` : "Ej tilldelad",
        toValue: toUser ? `${toUser.firstName} ${toUser.lastName}` : validatedData.assignedToId,
      });

      await notificationService.notifyLeadAssignment(req.params.id, validatedData.assignedToId);

      res.json(updatedLead);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      if (error.message === "Lead not found") {
        return res.status(404).json({ message: "Lead not found" });
      }
      console.error("Error assigning lead:", error);
      res.status(500).json({ message: "Failed to assign lead" });
    }
  });

  app.post('/api/leads/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (lead.assignedToId !== userId) {
        return res.status(403).json({ message: "You can only accept leads assigned to you" });
      }

      if (lead.status !== "VANTAR_PA_ACCEPT") {
        return res.status(400).json({ message: "This lead is not pending acceptance" });
      }

      const updatedLead = await storage.acceptLead(req.params.id, userId);
      
      res.json(updatedLead);
    } catch (error: any) {
      console.error("Error accepting lead:", error);
      res.status(500).json({ message: "Failed to accept lead" });
    }
  });

  app.post('/api/leads/:id/decline', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (lead.assignedToId !== userId) {
        return res.status(403).json({ message: "You can only decline leads assigned to you" });
      }

      if (lead.status !== "VANTAR_PA_ACCEPT") {
        return res.status(400).json({ message: "This lead is not pending acceptance" });
      }

      if (!lead.anlaggning) {
        return res.status(400).json({ message: "Lead must have a facility assigned" });
      }

      await storage.declineLead(req.params.id, userId);

      const nextSellerId = await roundRobinService.reassignLead(req.params.id, lead.anlaggning, userId);
      if (!nextSellerId) {
        await storage.updateLead(req.params.id, {
          status: "NY_INTRESSEANMALAN",
          assignedToId: null,
          acceptStatus: null
        });
        return res.json({ message: "Lead declined, but no other sellers available" });
      }

      res.json({ message: "Lead declined and reassigned to next seller" });
    } catch (error: any) {
      console.error("Error declining lead:", error);
      res.status(500).json({ message: "Failed to decline lead" });
    }
  });

  app.post('/api/leads/:id/reassign-to-seller', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (lead.assignedToId !== userId) {
        return res.status(403).json({ message: "You can only reassign leads assigned to you" });
      }

      if (lead.status !== "VANTAR_PA_ACCEPT") {
        return res.status(400).json({ message: "This lead is not pending acceptance" });
      }

      const reassignSchema = z.object({
        newSellerId: z.string().min(1, "New seller ID is required"),
      });

      const validatedData = reassignSchema.parse(req.body);

      const newSeller = await storage.getUser(validatedData.newSellerId);
      if (!newSeller) {
        return res.status(404).json({ message: "New seller not found" });
      }

      if (!newSeller.isActive) {
        return res.status(400).json({ message: "New seller is not active" });
      }

      if (newSeller.role !== "SALJARE") {
        return res.status(400).json({ message: "Can only reassign to salespeople" });
      }

      const updatedLead = await storage.reassignLeadToSeller(req.params.id, validatedData.newSellerId, userId);

      await notificationService.notifyLeadAssignment(req.params.id, validatedData.newSellerId);

      res.json({ message: "Lead reassigned successfully", lead: updatedLead });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error reassigning lead:", error);
      res.status(500).json({ message: "Failed to reassign lead" });
    }
  });

  app.get('/api/leads/:id/email-accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.redirect('/login?error=user_not_found');
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.redirect('/?error=lead_not_found');
      }

      if (lead.assignedToId !== userId) {
        return res.redirect(`/leads/${req.params.id}?error=not_assigned_to_you`);
      }

      if (lead.status !== "VANTAR_PA_ACCEPT") {
        return res.redirect(`/leads/${req.params.id}?message=already_processed`);
      }

      await storage.acceptLead(req.params.id, userId);
      
      return res.redirect(`/leads/${req.params.id}?success=lead_accepted`);
    } catch (error: any) {
      console.error("Error accepting lead via email:", error);
      return res.redirect(`/leads/${req.params.id}?error=failed_to_accept`);
    }
  });

  app.get('/api/leads/:id/email-decline', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.redirect('/login?error=user_not_found');
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.redirect('/?error=lead_not_found');
      }

      if (lead.assignedToId !== userId) {
        return res.redirect(`/leads/${req.params.id}?error=not_assigned_to_you`);
      }

      if (lead.status !== "VANTAR_PA_ACCEPT") {
        return res.redirect(`/leads/${req.params.id}?message=already_processed`);
      }

      if (!lead.anlaggning) {
        return res.redirect(`/leads/${req.params.id}?error=no_facility`);
      }

      await storage.declineLead(req.params.id, userId);

      const nextSellerId = await roundRobinService.reassignLead(req.params.id, lead.anlaggning, userId);
      if (!nextSellerId) {
        await storage.updateLead(req.params.id, {
          status: "NY_INTRESSEANMALAN",
          assignedToId: null,
          acceptStatus: null
        });
      }

      return res.redirect('/?success=lead_declined');
    } catch (error: any) {
      console.error("Error declining lead via email:", error);
      return res.redirect(`/leads/${req.params.id}?error=failed_to_decline`);
    }
  });

  app.patch('/api/leads/:id/vehicle-info', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const vehicleInfoSchema = z.object({
        registrationNumber: z
          .string()
          .optional()
          .transform((val) => val || undefined)
          .refine(
            (val) => !val || /^[A-Z]{3}\d{2}[A-Z0-9]$/i.test(val),
            { message: "Regnummer måste vara i formatet ABC123 eller ABC12D" }
          ),
        verendusId: z.string().optional().transform((val) => val || undefined),
      });

      const validatedData = vehicleInfoSchema.parse(req.body);
      
      const updatedLead = await storage.updateLead(req.params.id, validatedData);

      if (!updatedLead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      res.json(updatedLead);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating vehicle info:", error);
      res.status(500).json({ message: "Failed to update vehicle info" });
    }
  });

  app.get('/api/leads/:id/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const notes = await storage.getLeadNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching lead notes:", error);
      res.status(500).json({ message: "Failed to fetch lead notes" });
    }
  });

  app.post('/api/leads/:id/notes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const validatedData = insertLeadNoteSchema.parse({
        ...req.body,
        leadId: req.params.id,
        userId,
      });

      const note = await storage.createLeadNote(validatedData);
      res.status(201).json(note);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating lead note:", error);
      res.status(500).json({ message: "Failed to create lead note" });
    }
  });

  app.get('/api/leads/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const tasks = await storage.getLeadTasks(req.params.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching lead tasks:", error);
      res.status(500).json({ message: "Failed to fetch lead tasks" });
    }
  });

  app.post('/api/leads/:id/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      console.log("Creating task with data:", JSON.stringify({ ...req.body, leadId: req.params.id }));

      const validatedData = insertLeadTaskSchema.parse({
        ...req.body,
        leadId: req.params.id,
      });

      const task = await storage.createLeadTask(validatedData);
      res.status(201).json(task);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error("Task validation error:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating lead task:", error);
      res.status(500).json({ message: "Failed to create lead task" });
    }
  });

  app.patch('/api/tasks/:id/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const task = await storage.completeLeadTask(req.params.id);
      res.json(task);
    } catch (error) {
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

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

  app.get('/api/leads/:id/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const auditLogs = await storage.getAuditLogs(req.params.id);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ message: "Failed to fetch activity logs" });
    }
  });

  app.get('/api/leads/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (user.role !== "MANAGER" && lead.assignedToId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const leadMessages = await storage.getLeadMessages(req.params.id);
      res.json(leadMessages);
    } catch (error) {
      console.error("Error fetching lead messages:", error);
      res.status(500).json({ message: "Misslyckades att hämta meddelanden" });
    }
  });

  // Messages routes
  app.get('/api/messages/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Misslyckades att hämta konversationer" });
    }
  });

  app.get('/api/messages/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Misslyckades att hämta antal olästa meddelanden" });
    }
  });

  app.get('/api/messages/lead/:leadId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const leadId = req.params.leadId;
      
      const messages = await storage.getMessages(userId, leadId);
      
      // Mark messages as read
      await storage.markMessagesAsRead(userId, leadId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Misslyckades att hämta meddelanden" });
    }
  });

  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });

      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Misslyckades att skicka meddelande" });
    }
  });

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

  const httpServer = createServer(app);

  return httpServer;
}
