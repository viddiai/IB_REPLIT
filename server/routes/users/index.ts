import type { Express } from "express";
import { storage } from "../../storage";
import { isAuthenticated, isManager, sanitizeUser } from "../../localAuth";
import { updateProfileSchema, updateNotificationPreferencesSchema, changePasswordSchema, updateUserByAdminSchema } from "@shared/schema";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../../auth";
import { profileImageUpload, uploadsDir } from "../utils/multerConfig";
import { uploadLimiter } from "../../rateLimiters";
import path from "path";
import fs from "fs";

/**
 * Register user management routes
 * Handles user profiles, settings, and admin operations
 */
export function registerUserRoutes(app: Express): void {
  // Get all users (manager only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only managers can view all users" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get all sellers (for assignment dropdowns)
  app.get('/api/users/sellers', isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      const sellers = users.filter(u => u.role === "SALJARE");
      res.json(sellers);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      res.status(500).json({ message: "Failed to fetch sellers" });
    }
  });

  // Update user (self only)
  app.patch('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const targetUserId = req.params.id;

      if (userId !== targetUserId) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updateSchema = z.object({
        role: z.enum(["MANAGER", "SALJARE"]).optional(),
        anlaggning: z.enum(["Falkenberg", "Göteborg", "Trollhättan"]).optional().nullable(),
      });

      const validatedData = updateSchema.parse(req.body);
      const updatedUser = await storage.updateUser(userId, validatedData);

      res.json(updatedUser);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Upload profile image endpoint with rate limiting
  app.post('/api/users/:id/profile-image', uploadLimiter, isAuthenticated, profileImageUpload.single('profileImage'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const targetUserId = req.params.id;

      if (userId !== targetUserId) {
        // Clean up uploaded file if user doesn't match
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(403).json({ message: "Du kan bara uppdatera din egen profilbild" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Ingen fil uppladdad" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        // Clean up uploaded file if user doesn't exist
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      // Delete old profile image if it exists and is a local file
      if (user.profileImageUrl && user.profileImageUrl.startsWith('/uploads/profile-images/')) {
        // Remove leading slash to create correct relative path
        const relativePath = user.profileImageUrl.replace(/^\//, '');
        const oldImagePath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
            console.log(`✅ Deleted old profile image: ${oldImagePath}`);
          } catch (err) {
            console.error('❌ Failed to delete old profile image:', err);
          }
        } else {
          console.log(`⚠️ Old profile image not found at: ${oldImagePath}`);
        }
      }

      // Update user's profile image URL
      const profileImageUrl = `/uploads/profile-images/${req.file.filename}`;
      const updatedUser = await storage.updateUser(userId, { profileImageUrl });

      res.json({
        message: "Profilbild uppladdad",
        profileImageUrl,
        user: sanitizeUser(updatedUser)
      });
    } catch (error: any) {
      // Clean up uploaded file on error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Failed to delete uploaded file:', err);
        }
      }
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: error.message || "Misslyckades att ladda upp profilbild" });
    }
  });

  // Update user profile
  app.patch('/api/users/:id/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const targetUserId = req.params.id;

      if (userId !== targetUserId) {
        return res.status(403).json({ message: "Du kan bara uppdatera din egen profil" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      const validatedData = updateProfileSchema.parse(req.body);
      const updatedUser = await storage.updateUser(userId, validatedData);

      res.json(sanitizeUser(updatedUser));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Misslyckades att uppdatera profil" });
    }
  });

  // Update notification preferences
  app.patch('/api/users/:id/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const targetUserId = req.params.id;

      if (userId !== targetUserId) {
        return res.status(403).json({ message: "Du kan bara uppdatera dina egna inställningar" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      const validatedData = updateNotificationPreferencesSchema.parse(req.body);

      // If email notifications are being disabled, also disable all seller pools
      if (validatedData.emailOnLeadAssignment === false) {
        const userPools = await storage.getSellerPoolsByUserId(userId);
        for (const pool of userPools) {
          await storage.updateSellerPool(pool.id, { isEnabled: false });
          // Log the status change
          await storage.createStatusChangeHistory({
            sellerPoolId: pool.id,
            changedById: userId,
            newStatus: false,
          });
        }
      }

      const updatedUser = await storage.updateUser(userId, validatedData);
      res.json(sanitizeUser(updatedUser));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Misslyckades att uppdatera notifikationsinställningar" });
    }
  });

  // Change password
  app.patch('/api/users/:id/password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const targetUserId = req.params.id;

      if (userId !== targetUserId) {
        return res.status(403).json({ message: "Du kan bara ändra ditt eget lösenord" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      const validatedData = changePasswordSchema.parse(req.body);

      // Verify old password
      if (!user.passwordHash) {
        return res.status(400).json({ message: "Användaren har inget lösenord inställt" });
      }

      const isValidPassword = await verifyPassword(user.passwordHash, validatedData.oldPassword);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Nuvarande lösenord är felaktigt" });
      }

      // Hash new password and update
      const newPasswordHash = await hashPassword(validatedData.newPassword);
      const updatedUser = await storage.updateUser(userId, { passwordHash: newPasswordHash });

      res.json({ message: "Lösenordet har uppdaterats" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Misslyckades att ändra lösenord" });
    }
  });

  // Admin routes - Manager only
  app.get('/api/admin/users', isManager, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithPools = await Promise.all(
        users.map(async (user) => {
          const pools = await storage.getSellerPoolsByUserId(user.id);
          return {
            ...sanitizeUser(user),
            sellerPools: pools,
          };
        })
      );
      res.json(usersWithPools);
    } catch (error) {
      console.error("Error fetching users for admin:", error);
      res.status(500).json({ message: "Misslyckades att hämta användare" });
    }
  });

  // Admin update user
  app.patch('/api/admin/users/:id', isManager, async (req: any, res) => {
    try {
      const targetUserId = req.params.id;
      const managerId = req.user.id;

      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "Användare hittades inte" });
      }

      const validatedData = updateUserByAdminSchema.parse(req.body);

      // Check for email uniqueness if email is being changed
      if (validatedData.email && validatedData.email !== targetUser.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser) {
          return res.status(400).json({ message: "En användare med denna e-postadress finns redan" });
        }
      }

      // Track changes for audit log
      const changes: Array<{ field: string; fromValue: string | null; toValue: string | null }> = [];

      if (validatedData.firstName && validatedData.firstName !== targetUser.firstName) {
        changes.push({
          field: "firstName",
          fromValue: targetUser.firstName || null,
          toValue: validatedData.firstName,
        });
      }

      if (validatedData.lastName && validatedData.lastName !== targetUser.lastName) {
        changes.push({
          field: "lastName",
          fromValue: targetUser.lastName || null,
          toValue: validatedData.lastName,
        });
      }

      if (validatedData.email && validatedData.email !== targetUser.email) {
        changes.push({
          field: "email",
          fromValue: targetUser.email,
          toValue: validatedData.email,
        });
      }

      if (validatedData.role && validatedData.role !== targetUser.role) {
        changes.push({
          field: "role",
          fromValue: targetUser.role,
          toValue: validatedData.role,
        });
      }

      if (validatedData.anlaggning !== undefined && validatedData.anlaggning !== targetUser.anlaggning) {
        changes.push({
          field: "anlaggning",
          fromValue: targetUser.anlaggning || null,
          toValue: validatedData.anlaggning,
        });
      }

      if (validatedData.isActive !== undefined && validatedData.isActive !== targetUser.isActive) {
        changes.push({
          field: "isActive",
          fromValue: String(targetUser.isActive),
          toValue: String(validatedData.isActive),
        });
      }

      if (validatedData.emailOnLeadAssignment !== undefined && validatedData.emailOnLeadAssignment !== targetUser.emailOnLeadAssignment) {
        changes.push({
          field: "emailOnLeadAssignment",
          fromValue: String(targetUser.emailOnLeadAssignment),
          toValue: String(validatedData.emailOnLeadAssignment),
        });
      }

      // Update user and create audit logs in a transaction-like manner
      const updatedUser = await storage.updateUser(targetUserId, validatedData);

      // Create audit log entries for each change
      for (const change of changes) {
        await storage.createUserManagementAuditLog({
          targetUserId,
          changedById: managerId,
          field: change.field,
          fromValue: change.fromValue,
          toValue: change.toValue,
        });
      }

      res.json(sanitizeUser(updatedUser));
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error updating user by admin:", error);
      res.status(500).json({ message: "Misslyckades att uppdatera användare" });
    }
  });

  // Get user audit logs
  app.get('/api/admin/users/:id/audit', isManager, async (req: any, res) => {
    try {
      const targetUserId = req.params.id;
      const auditLogs = await storage.getUserManagementAuditLogs(targetUserId);
      res.json(auditLogs);
    } catch (error) {
      console.error("Error fetching user audit logs:", error);
      res.status(500).json({ message: "Misslyckades att hämta ändringshistorik" });
    }
  });
}
