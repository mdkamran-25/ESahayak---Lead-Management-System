CREATE TYPE "public"."bhk" AS ENUM('1', '2', '3', '4', 'Studio');--> statement-breakpoint
CREATE TYPE "public"."city" AS ENUM('Chandigarh', 'Mohali', 'Zirakpur', 'Panchkula', 'Other');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('Apartment', 'Villa', 'Plot', 'Office', 'Retail');--> statement-breakpoint
CREATE TYPE "public"."purpose" AS ENUM('Buy', 'Rent');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('Website', 'Referral', 'Walk-in', 'Call', 'Other');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('New', 'Qualified', 'Contacted', 'Visited', 'Negotiation', 'Converted', 'Dropped');--> statement-breakpoint
CREATE TYPE "public"."timeline" AS ENUM('0-3m', '3-6m', '>6m', 'Exploring');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "buyer_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"diff" json NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(80) NOT NULL,
	"email" varchar(255),
	"phone" varchar(15) NOT NULL,
	"city" "city" NOT NULL,
	"property_type" "property_type" NOT NULL,
	"bhk" "bhk",
	"purpose" "purpose" NOT NULL,
	"budget_min" integer,
	"budget_max" integer,
	"timeline" timeline NOT NULL,
	"source" "source" NOT NULL,
	"status" "status" DEFAULT 'New' NOT NULL,
	"notes" text,
	"tags" json DEFAULT '[]'::json,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"email_verified" timestamp,
	"image" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_history" ADD CONSTRAINT "buyer_history_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_history" ADD CONSTRAINT "buyer_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "buyer_history_buyer_idx" ON "buyer_history" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "buyer_history_changed_at_idx" ON "buyer_history" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "buyers_owner_idx" ON "buyers" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "buyers_status_idx" ON "buyers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "buyers_city_idx" ON "buyers" USING btree ("city");--> statement-breakpoint
CREATE INDEX "buyers_property_type_idx" ON "buyers" USING btree ("property_type");--> statement-breakpoint
CREATE INDEX "buyers_updated_at_idx" ON "buyers" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "buyers_phone_idx" ON "buyers" USING btree ("phone");