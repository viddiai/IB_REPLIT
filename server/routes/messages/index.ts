import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated } from "../../localAuth";
import { insertMessageSchema } from "@shared/schema";
import { z } from "zod";

/**
 * Register message routes
 * Handles internal messaging between users about leads
 */
export function registerMessageRoutes(app: Express): void {
  // Get user conversations
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

  // Get unread message count
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

  // Get messages for a specific lead
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

  // Send a message
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
}
