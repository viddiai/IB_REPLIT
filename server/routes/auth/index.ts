import type { Express } from "express";
import { storage } from "../../storage";
import { sanitizeUser, isAuthenticated } from "../../localAuth";
import { forgotPasswordSchema, resetPasswordSchema } from "@shared/schema";
import { z } from "zod";
import { hashPassword } from "../../auth";
import { sendPasswordResetEmail } from "../../email";
import { generateResetToken } from "../utils/helpers";
import passport from "passport";
import { authLimiter, passwordResetLimiter } from "../../rateLimiters";

/**
 * Register authentication routes
 * Handles login, logout, password reset, and user session
 */
export function registerAuthRoutes(app: Express): void {
  // Login endpoint with rate limiting
  app.post('/api/login', authLimiter, (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Ett fel uppstod" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Felaktig e-postadress eller lösenord" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return res.status(500).json({ message: "Inloggning misslyckades" });
        }
        res.json({ message: "Inloggning lyckades", user: sanitizeUser(user) });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Utloggning misslyckades" });
      }
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          return res.status(500).json({ message: "Utloggning misslyckades" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Utloggning lyckades" });
      });
    });
  });

  // Get current authenticated user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      res.json(sanitizeUser(req.user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Forgot password endpoint with rate limiting
  app.post('/api/forgot-password', passwordResetLimiter, async (req, res) => {
    try {
      const validatedData = forgotPasswordSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);

      // Don't reveal if email exists or not for security reasons
      if (!user) {
        return res.json({ message: "Om e-postadressen finns i systemet har ett återställningsmail skickats" });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to database
      await storage.createPasswordResetToken(user.id, resetToken, expiresAt);

      // Send password reset email
      try {
        const emailResult = await sendPasswordResetEmail(user.email, resetToken);
        console.log(`✅ Password reset email sent to ${user.email}`, emailResult);
      } catch (emailError: any) {
        console.error('❌ Failed to send password reset email:', emailError);
        console.error('Error details:', emailError.message, emailError.statusCode);
        // Don't reveal email sending failure to prevent user enumeration
      }

      res.json({ message: "Om e-postadressen finns i systemet har ett återställningsmail skickats" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error during forgot password:", error);
      res.status(500).json({ message: "Ett fel uppstod" });
    }
  });

  // Reset password endpoint with rate limiting
  app.post('/api/reset-password', passwordResetLimiter, async (req, res) => {
    try {
      const validatedData = resetPasswordSchema.parse(req.body);

      // Find reset token
      const resetToken = await storage.getPasswordResetToken(validatedData.token);

      if (!resetToken) {
        return res.status(400).json({ message: "Ogiltig eller utgången återställningslänk" });
      }

      // Check if token is expired
      if (resetToken.expiresAt < new Date()) {
        return res.status(400).json({ message: "Återställningslänken har utgått" });
      }

      // Check if token has already been used
      if (resetToken.usedAt) {
        return res.status(400).json({ message: "Återställningslänken har redan använts" });
      }

      // Hash new password
      const passwordHash = await hashPassword(validatedData.newPassword);

      // Update user password
      await storage.updateUser(resetToken.userId, { passwordHash });

      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(validatedData.token);

      // Clean up expired tokens
      await storage.deleteExpiredPasswordResetTokens();

      res.json({ message: "Lösenordet har återställts" });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Valideringsfel", errors: error.errors });
      }
      console.error("Error during password reset:", error);
      res.status(500).json({ message: "Ett fel uppstod" });
    }
  });
}
