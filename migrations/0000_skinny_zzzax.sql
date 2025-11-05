CREATE TYPE "public"."anlaggning" AS ENUM('Falkenberg', 'Göteborg', 'Trollhättan');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('MANAGER', 'SALJARE');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('BYTBIL', 'BLOCKET', 'HEMSIDA', 'EGET');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('NY_INTRESSEANMALAN', 'KUND_KONTAKTAD', 'OFFERT_SKICKAD', 'VUNNEN', 'FORLORAD');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"action" text NOT NULL,
	"from_value" text,
	"to_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_notes" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_tasks" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"due_date" timestamp,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "source" NOT NULL,
	"anlaggning" "anlaggning",
	"contact_name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"vehicle_title" text NOT NULL,
	"vehicle_link" text,
	"listing_id" text,
	"registration_number" text,
	"message" text,
	"inquiry_date_time" text,
	"raw_payload" jsonb,
	"status" "status" DEFAULT 'NY_INTRESSEANMALAN' NOT NULL,
	"assigned_to_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"assigned_at" timestamp,
	"first_contact_at" timestamp,
	"closed_at" timestamp,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"used_at" timestamp,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "seller_pools" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"anlaggning" "anlaggning" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"password_hash" text,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" "role" DEFAULT 'SALJARE' NOT NULL,
	"anlaggning" "anlaggning",
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_tasks" ADD CONSTRAINT "lead_tasks_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_pools" ADD CONSTRAINT "seller_pools_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");