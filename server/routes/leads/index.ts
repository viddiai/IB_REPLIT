import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../localAuth";
import { insertLeadSchema, insertLeadNoteSchema, insertLeadTaskSchema } from "@shared/schema";
import { z } from "zod";
import { roundRobinService } from "../../roundRobin";
import { notificationService } from "../../notificationService";

/**
 * Register lead management routes
 * Handles lead CRUD, assignment, acceptance/decline, notes, tasks, and activity
 */
export function registerLeadRoutes(app: Express): void {
  // Get all leads with filters
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

  // Get single lead
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

  // Create new lead
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

  // Update lead status
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

  // Round-robin assignment
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

  // Manager reassignment
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

  // Accept lead
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

  // Decline lead
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

  // Reassign to specific seller
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

  // Email-triggered acceptance
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

  // Email-triggered decline
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

  // Update vehicle info
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

  // Get lead notes
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

  // Create lead note
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

  // Get lead tasks
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

  // Create lead task
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

  // Complete task (note: this is /api/tasks/:id, not /api/leads/:id/tasks)
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

  // Get lead activity/audit logs
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

  // Get lead messages
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
}
