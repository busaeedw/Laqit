CREATE TYPE "public"."customer_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."inspection_status" AS ENUM('draft', 'rfq_sent', 'waiting_quotes', 'quotes_received', 'quote_accepted', 'payment_pending', 'paid', 'vendor_notified', 'ready_for_pickup', 'cancelled', 'closed');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('car_photo', 'damage_photo', 'other');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('outbound', 'inbound');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('sms', 'whatsapp', 'push', 'email');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'failed', 'delivered');--> statement-breakpoint
CREATE TYPE "public"."part_source" AS ENUM('ai', 'user');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('initiated', 'authorized', 'captured', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('received', 'parsed', 'unparsed', 'presented', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'staff');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."vendor_status" AS ENUM('pending_verification', 'active', 'suspended', 'rejected');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"audit_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" varchar(30),
	"actor_id" uuid,
	"action" varchar(80) NOT NULL,
	"entity_type" varchar(80),
	"entity_id" uuid,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "car_make_agents" (
	"agent_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"make_id" uuid NOT NULL,
	"agent_name_en" varchar(200) NOT NULL,
	"agent_name_ar" varchar(200),
	"website" varchar(300),
	"phone" varchar(30),
	"headquarters_city" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "car_make_agents_make_id_unique" UNIQUE("make_id")
);
--> statement-breakpoint
CREATE TABLE "car_makes" (
	"make_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"make_name" varchar(50) NOT NULL,
	"name_ar" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "car_makes_make_name_unique" UNIQUE("make_name")
);
--> statement-breakpoint
CREATE TABLE "car_models" (
	"car_model_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"make_id" uuid NOT NULL,
	"model_name" varchar(80) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"city_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_ar" varchar(80) NOT NULL,
	"name_en" varchar(80),
	"country_code" char(2) DEFAULT 'SA' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"customer_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(150),
	"mobile_e164" varchar(20) NOT NULL,
	"email" varchar(254) NOT NULL,
	"city_id" uuid NOT NULL,
	"status" "customer_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "customers_mobile_e164_unique" UNIQUE("mobile_e164"),
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "inspection_media" (
	"media_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"media_type" "media_type" NOT NULL,
	"file_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspection_parts" (
	"inspection_part_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"part_name" varchar(120) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"source" "part_source" DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" serial PRIMARY KEY NOT NULL,
	"inspection_number" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"car_make" text NOT NULL,
	"car_make_ar" text,
	"car_model" text NOT NULL,
	"car_model_ar" text,
	"car_year" text,
	"parts" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inspections_inspection_number_unique" UNIQUE("inspection_number")
);
--> statement-breakpoint
CREATE TABLE "laqit_inspections" (
	"inspection_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_no" varchar(30) NOT NULL,
	"customer_id" uuid NOT NULL,
	"city_id" uuid NOT NULL,
	"car_model_id" uuid NOT NULL,
	"car_year" smallint,
	"car_type" varchar(40),
	"status" "inspection_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "laqit_inspections_inspection_no_unique" UNIQUE("inspection_no")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"notification_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_type" varchar(20) NOT NULL,
	"customer_id" uuid,
	"vendor_user_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"inspection_id" uuid,
	"body" text NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"payment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"quote_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" char(3) DEFAULT 'SAR' NOT NULL,
	"status" "payment_status" DEFAULT 'initiated' NOT NULL,
	"gateway" varchar(50),
	"gateway_ref" varchar(120),
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"quote_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"vendor_user_id" uuid NOT NULL,
	"quote_image_url" text,
	"total_amount" numeric(12, 2),
	"currency" char(3) DEFAULT 'SAR' NOT NULL,
	"status" "quote_status" DEFAULT 'received' NOT NULL,
	"ocr_raw_text" text,
	"presented_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_documents" (
	"rfq_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"pdf_url" text NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rfq_documents_inspection_id_unique" UNIQUE("inspection_id")
);
--> statement-breakpoint
CREATE TABLE "rfq_recipients" (
	"rfq_recipient_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"vendor_user_id" uuid NOT NULL,
	"channel" varchar(20) DEFAULT 'whatsapp' NOT NULL,
	"status" "delivery_status" DEFAULT 'queued' NOT NULL,
	"provider_message_id" varchar(120),
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"mobile" text NOT NULL,
	"email" text,
	"terms_accepted" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_mobile_unique" UNIQUE("mobile")
);
--> statement-breakpoint
CREATE TABLE "vendor_locations" (
	"vendor_location_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"city_id" uuid NOT NULL,
	"address_line" varchar(255),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_supported_models" (
	"vendor_id" uuid NOT NULL,
	"car_model_id" uuid NOT NULL,
	"year_from" smallint,
	"year_to" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_users" (
	"vendor_user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"full_name" varchar(150),
	"mobile_e164" varchar(20) NOT NULL,
	"email" varchar(254),
	"whatsapp_e164" varchar(20) NOT NULL,
	"whatsapp_verified_at" timestamp with time zone,
	"is_whatsapp_primary" boolean DEFAULT false NOT NULL,
	"role" "user_role" DEFAULT 'owner' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "vendor_users_mobile_e164_unique" UNIQUE("mobile_e164"),
	CONSTRAINT "vendor_users_email_unique" UNIQUE("email"),
	CONSTRAINT "vendor_users_whatsapp_e164_unique" UNIQUE("whatsapp_e164")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"vendor_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_name" varchar(150) NOT NULL,
	"legal_name" varchar(150),
	"cr_number" varchar(50),
	"vat_number" varchar(50),
	"status" "vendor_status" DEFAULT 'pending_verification' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"message_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"direction" "message_direction" NOT NULL,
	"vendor_id" uuid,
	"vendor_user_id" uuid,
	"vendor_whatsapp_e164" varchar(20) NOT NULL,
	"inspection_id" uuid,
	"inspection_no_extracted" varchar(30),
	"text_body" text,
	"media_url" text,
	"provider_message_id" varchar(120),
	"sent_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_messages_provider_message_id_unique" UNIQUE("provider_message_id")
);
--> statement-breakpoint
ALTER TABLE "car_make_agents" ADD CONSTRAINT "car_make_agents_make_id_car_makes_make_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."car_makes"("make_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "car_models" ADD CONSTRAINT "car_models_make_id_car_makes_make_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."car_makes"("make_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_city_id_cities_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("city_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_media" ADD CONSTRAINT "inspection_media_inspection_id_laqit_inspections_inspection_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."laqit_inspections"("inspection_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_parts" ADD CONSTRAINT "inspection_parts_inspection_id_laqit_inspections_inspection_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."laqit_inspections"("inspection_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laqit_inspections" ADD CONSTRAINT "laqit_inspections_customer_id_customers_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laqit_inspections" ADD CONSTRAINT "laqit_inspections_city_id_cities_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("city_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "laqit_inspections" ADD CONSTRAINT "laqit_inspections_car_model_id_car_models_car_model_id_fk" FOREIGN KEY ("car_model_id") REFERENCES "public"."car_models"("car_model_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_customers_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_vendor_user_id_vendor_users_vendor_user_id_fk" FOREIGN KEY ("vendor_user_id") REFERENCES "public"."vendor_users"("vendor_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_inspection_id_laqit_inspections_inspection_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."laqit_inspections"("inspection_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_inspection_id_laqit_inspections_inspection_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."laqit_inspections"("inspection_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_quote_id_quotes_quote_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("quote_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("customer_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_inspection_id_laqit_inspections_inspection_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."laqit_inspections"("inspection_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_vendor_id_vendors_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_vendor_user_id_vendor_users_vendor_user_id_fk" FOREIGN KEY ("vendor_user_id") REFERENCES "public"."vendor_users"("vendor_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_documents" ADD CONSTRAINT "rfq_documents_inspection_id_laqit_inspections_inspection_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."laqit_inspections"("inspection_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_recipients" ADD CONSTRAINT "rfq_recipients_inspection_id_laqit_inspections_inspection_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."laqit_inspections"("inspection_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_recipients" ADD CONSTRAINT "rfq_recipients_vendor_id_vendors_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_recipients" ADD CONSTRAINT "rfq_recipients_vendor_user_id_vendor_users_vendor_user_id_fk" FOREIGN KEY ("vendor_user_id") REFERENCES "public"."vendor_users"("vendor_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_locations" ADD CONSTRAINT "vendor_locations_vendor_id_vendors_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_locations" ADD CONSTRAINT "vendor_locations_city_id_cities_city_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("city_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_supported_models" ADD CONSTRAINT "vendor_supported_models_vendor_id_vendors_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_supported_models" ADD CONSTRAINT "vendor_supported_models_car_model_id_car_models_car_model_id_fk" FOREIGN KEY ("car_model_id") REFERENCES "public"."car_models"("car_model_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_users" ADD CONSTRAINT "vendor_users_vendor_id_vendors_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_vendor_id_vendors_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("vendor_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_vendor_user_id_vendor_users_vendor_user_id_fk" FOREIGN KEY ("vendor_user_id") REFERENCES "public"."vendor_users"("vendor_user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_inspection_id_laqit_inspections_inspection_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."laqit_inspections"("inspection_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_log_actor" ON "audit_log" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_entity" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_log_created_at" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_car_models_make_id" ON "car_models" USING btree ("make_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_car_models_make_model" ON "car_models" USING btree ("make_id","model_name");--> statement-breakpoint
CREATE INDEX "idx_cities_country_code" ON "cities" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "idx_customers_city_id" ON "customers" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX "idx_inspection_media_inspection_type" ON "inspection_media" USING btree ("inspection_id","media_type");--> statement-breakpoint
CREATE INDEX "idx_inspection_parts_inspection_id" ON "inspection_parts" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX "idx_laqit_inspections_customer_created" ON "laqit_inspections" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_laqit_inspections_city_model" ON "laqit_inspections" USING btree ("city_id","car_model_id");--> statement-breakpoint
CREATE INDEX "idx_laqit_inspections_status" ON "laqit_inspections" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notifications_customer_id" ON "notifications" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_vendor_user_id" ON "notifications" USING btree ("vendor_user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_status" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payments_inspection_id" ON "payments" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX "idx_payments_customer_id" ON "payments" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_one_live_payment_per_inspection" ON "payments" USING btree ("inspection_id") WHERE status IN ('initiated', 'captured');--> statement-breakpoint
CREATE INDEX "idx_quotes_inspection_id" ON "quotes" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX "idx_quotes_vendor_id" ON "quotes" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "idx_quotes_status" ON "quotes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_one_accepted_quote_per_inspection" ON "quotes" USING btree ("inspection_id") WHERE status = 'accepted';--> statement-breakpoint
CREATE INDEX "idx_rfq_documents_generated_at" ON "rfq_documents" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "idx_rfq_recipients_inspection_id" ON "rfq_recipients" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX "idx_rfq_recipients_vendor_id" ON "rfq_recipients" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "idx_rfq_recipients_status" ON "rfq_recipients" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vendor_locations_vendor_city" ON "vendor_locations" USING btree ("vendor_id","city_id");--> statement-breakpoint
CREATE INDEX "idx_vendor_locations_city_vendor" ON "vendor_locations" USING btree ("city_id","vendor_id");--> statement-breakpoint
CREATE INDEX "idx_vsm_car_model_vendor" ON "vendor_supported_models" USING btree ("car_model_id","vendor_id");--> statement-breakpoint
CREATE INDEX "idx_vendor_users_vendor_id" ON "vendor_users" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "idx_vendor_users_is_primary" ON "vendor_users" USING btree ("is_whatsapp_primary");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vendor_one_primary_whatsapp" ON "vendor_users" USING btree ("vendor_id") WHERE "vendor_users"."is_whatsapp_primary" = true;--> statement-breakpoint
CREATE INDEX "idx_vendors_status" ON "vendors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_whatsapp_e164" ON "whatsapp_messages" USING btree ("vendor_whatsapp_e164");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_inspection_no" ON "whatsapp_messages" USING btree ("inspection_no_extracted");--> statement-breakpoint
CREATE INDEX "idx_whatsapp_messages_inspection_id" ON "whatsapp_messages" USING btree ("inspection_id");