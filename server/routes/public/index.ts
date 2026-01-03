import type { Express } from "express";
import { storage } from "../../storage";
import { publicContactSchema, bytbilWebhookSchema } from "@shared/schema";
import { z } from "zod";
import { roundRobinService } from "../../roundRobin";
import { notificationService } from "../../notificationService";
import { publicLimiter } from "../../rateLimiters";

/**
 * Register public routes (no authentication required)
 * These endpoints are accessible without login
 */
export function registerPublicRoutes(app: Express): void {
  // Public contact form endpoint
  app.post('/api/public/contact', publicLimiter, async (req, res) => {
    try {
      const validatedData = publicContactSchema.parse(req.body);

      // Create lead with source HEMSIDA
      const leadData = {
        source: "HEMSIDA" as const,
        anlaggning: validatedData.anlaggning,
        contactName: validatedData.contactName,
        contactEmail: validatedData.contactEmail || null,
        contactPhone: validatedData.contactPhone,
        vehicleTitle: validatedData.vehicleTitle,
        message: validatedData.message || null,
        status: "NY_INTRESSEANMALAN" as const,
      };

      const lead = await storage.createLead(leadData);

      // Assign lead using round-robin
      try {
        const assignedToId = await roundRobinService.assignLeadToNextSeller(validatedData.anlaggning);
        if (assignedToId) {
          await storage.assignLead(lead.id, assignedToId);
          console.log(`✅ Public contact form lead ${lead.id} assigned to ${assignedToId} for ${validatedData.anlaggning}`);

          await notificationService.notifyLeadAssignment(lead.id, assignedToId);
        }
      } catch (error) {
        console.error(`❌ Failed to assign public contact form lead ${lead.id}:`, error);
      }

      res.status(201).json({
        message: "Tack för din intresseanmälan! Vi kommer att kontakta dig inom kort.",
        leadId: lead.id
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error creating public contact:", error);
      res.status(500).json({ message: "Ett fel uppstod. Försök igen senare." });
    }
  });

  // Bytbil webhook endpoint (validates webhook secret)
  app.post('/api/webhooks/bytbil', publicLimiter, async (req, res) => {
    try {
      // Validate webhook secret if configured
      const webhookSecret = process.env.BYTBIL_WEBHOOK_SECRET;
      if (webhookSecret) {
        const providedSecret = req.headers['x-webhook-secret'] || req.headers['authorization']?.replace('Bearer ', '');
        if (providedSecret !== webhookSecret) {
          console.warn('❌ Bytbil webhook: Invalid webhook secret');
          return res.status(401).json({ message: "Unauthorized" });
        }
      }

      console.log('📥 Bytbil webhook received:', JSON.stringify(req.body, null, 2));

      const validatedData = bytbilWebhookSchema.parse(req.body);

      // Check for duplicate leads by listing ID
      if (validatedData.listingId) {
        const existingLeads = await storage.getLeads({ listingId: validatedData.listingId });
        if (existingLeads.length > 0) {
          console.log(`⚠️  Bytbil webhook: Lead already exists for listing ${validatedData.listingId}, skipping`);
          return res.status(200).json({
            message: "Lead already exists",
            leadId: existingLeads[0].id
          });
        }
      }

      // Create lead with source BYTBIL
      const leadData = {
        source: "BYTBIL" as const,
        anlaggning: validatedData.anlaggning || null,
        contactName: validatedData.contactName,
        contactEmail: validatedData.contactEmail || null,
        contactPhone: validatedData.contactPhone || null,
        vehicleTitle: validatedData.vehicleTitle,
        vehicleLink: validatedData.vehicleLink || null,
        listingId: validatedData.listingId || null,
        message: validatedData.message || null,
        rawPayload: req.body,
        status: "NY_INTRESSEANMALAN" as const,
      };

      // If anlaggning is provided, create with assignment
      let lead;
      if (validatedData.anlaggning) {
        lead = await roundRobinService.createLeadWithAssignment(leadData);
        console.log(`✅ Bytbil webhook lead ${lead.id} created and assigned to ${lead.assignedToId} for ${validatedData.anlaggning}`);
      } else {
        // Create without assignment if no anlaggning
        lead = await storage.createLead(leadData);
        console.log(`✅ Bytbil webhook lead ${lead.id} created (unassigned - no anlaggning specified)`);
      }

      res.status(201).json({
        message: "Lead received successfully",
        leadId: lead.id
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        console.error('❌ Bytbil webhook validation error:', error.errors);
        return res.status(400).json({ message: "Invalid webhook payload", errors: error.errors });
      }
      console.error("❌ Error processing Bytbil webhook:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
