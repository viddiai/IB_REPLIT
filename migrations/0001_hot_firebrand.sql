CREATE TYPE "public"."accept_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
ALTER TYPE "public"."status" ADD VALUE 'VANTAR_PA_ACCEPT' BEFORE 'NY_INTRESSEANMALAN';--> statement-breakpoint
CREATE TABLE "email_notification_logs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"lead_id" varchar(255) NOT NULL,
	"email_to" varchar NOT NULL,
	"subject" text NOT NULL,
	"success" boolean NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar(255) NOT NULL,
	"receiver_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"lead_id" varchar(255),
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_change_history" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_pool_id" varchar(255) NOT NULL,
	"changed_by_id" varchar(255) NOT NULL,
	"new_status" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'VANTAR_PA_ACCEPT';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "verendus_id" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "accept_status" "accept_status";--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "declined_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "decline_reason" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "reminder_sent_at_6h" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "reminder_sent_at_11h" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "timeout_notified_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_on_lead_assignment" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "leads_accepted_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "leads_declined_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "leads_timed_out_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "email_notification_logs" ADD CONSTRAINT "email_notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_notification_logs" ADD CONSTRAINT "email_notification_logs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_change_history" ADD CONSTRAINT "status_change_history_seller_pool_id_seller_pools_id_fk" FOREIGN KEY ("seller_pool_id") REFERENCES "public"."seller_pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_change_history" ADD CONSTRAINT "status_change_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;