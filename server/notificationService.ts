import { sendLeadAssignmentEmail } from './email';
import { storage } from './storage';
import type { Lead } from '@shared/schema';

export class NotificationService {
  async notifyLeadAssignment(leadId: string, assignedToId: string): Promise<void> {
    try {
      const user = await storage.getUser(assignedToId);
      if (!user) {
        console.error(`❌ User ${assignedToId} not found for notification`);
        return;
      }

      if (!user.emailOnLeadAssignment) {
        console.log(`⏭️  User ${user.email} has email notifications disabled, skipping`);
        return;
      }

      const lead = await storage.getLead(leadId);
      if (!lead) {
        console.error(`❌ Lead ${leadId} not found for notification`);
        return;
      }

      console.log(`📧 Sending lead assignment notification to ${user.email} for lead ${leadId}`);
      
      try {
        await sendLeadAssignmentEmail(user, lead);
        
        await storage.logEmailNotification({
          userId: assignedToId,
          leadId: leadId,
          emailTo: user.email,
          subject: `Nytt lead tilldelat: ${lead.vehicleTitle}`,
          success: true,
          errorMessage: null,
        });
        
        console.log(`✅ Lead assignment notification sent successfully to ${user.email}`);
      } catch (emailError: any) {
        console.error(`❌ Failed to send lead assignment notification to ${user.email}:`, emailError);
        
        await storage.logEmailNotification({
          userId: assignedToId,
          leadId: leadId,
          emailTo: user.email,
          subject: `Nytt lead tilldelat: ${lead.vehicleTitle}`,
          success: false,
          errorMessage: emailError.message || 'Unknown error',
        });
      }
    } catch (error) {
      console.error(`❌ Error in notifyLeadAssignment for lead ${leadId}:`, error);
    }
  }
}

export const notificationService = new NotificationService();
