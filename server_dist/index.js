var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/services/sms.ts
var sms_exports = {};
__export(sms_exports, {
  sendSms: () => sendSms
});
async function sendSms(toE164, body) {
  const apiKey = process.env.SMS_API_KEY;
  if (!apiKey) {
    console.log(`[SMS STUB] Would send to ${toE164}:`);
    console.log(`  Message: ${body}`);
    return { success: true, messageId: `mock_sms_${Date.now()}` };
  }
  try {
    const response = await fetch("https://api.unifonic.com/rest/Messages/Send", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        AppSid: apiKey,
        Recipient: toE164,
        Body: body
      }).toString()
    });
    const result = await response.json();
    return {
      success: response.ok && result?.Success,
      messageId: result?.Data?.MessageID
    };
  } catch (err) {
    console.error("[SMS] Send error:", err?.message);
    return { success: false, error: err?.message };
  }
}
var init_sms = __esm({
  "server/services/sms.ts"() {
    "use strict";
  }
});

// server/index.ts
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

// server/routes.ts
import { createServer } from "node:http";
import { createHmac as createHmac2, timingSafeEqual as timingSafeEqual2 } from "crypto";
import OpenAI2 from "openai";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  auditLog: () => auditLog,
  carMakeAgents: () => carMakeAgents,
  carMakes: () => carMakes,
  carModels: () => carModels,
  cities: () => cities,
  conversations: () => conversations,
  customerStatusEnum: () => customerStatusEnum,
  customers: () => customers,
  deliveryStatusEnum: () => deliveryStatusEnum,
  insertAuditLogSchema: () => insertAuditLogSchema,
  insertCarMakeAgentSchema: () => insertCarMakeAgentSchema,
  insertCarMakeSchema: () => insertCarMakeSchema,
  insertCarModelSchema: () => insertCarModelSchema,
  insertCitySchema: () => insertCitySchema,
  insertCustomerSchema: () => insertCustomerSchema,
  insertInspectionMediaSchema: () => insertInspectionMediaSchema,
  insertInspectionPartSchema: () => insertInspectionPartSchema,
  insertInspectionSchema: () => insertInspectionSchema,
  insertLaqitInspectionSchema: () => insertLaqitInspectionSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertQuoteSchema: () => insertQuoteSchema,
  insertRfqDocumentSchema: () => insertRfqDocumentSchema,
  insertRfqRecipientSchema: () => insertRfqRecipientSchema,
  insertUserSchema: () => insertUserSchema,
  insertVendorLocationSchema: () => insertVendorLocationSchema,
  insertVendorSchema: () => insertVendorSchema,
  insertVendorSupportedModelSchema: () => insertVendorSupportedModelSchema,
  insertVendorUserSchema: () => insertVendorUserSchema,
  insertWhatsappMessageSchema: () => insertWhatsappMessageSchema,
  inspectionMedia: () => inspectionMedia,
  inspectionParts: () => inspectionParts,
  inspectionStatusEnum: () => inspectionStatusEnum,
  inspections: () => inspections,
  laqitInspections: () => laqitInspections,
  mediaTypeEnum: () => mediaTypeEnum,
  messageDirectionEnum: () => messageDirectionEnum,
  messages: () => messages,
  notificationChannelEnum: () => notificationChannelEnum,
  notificationStatusEnum: () => notificationStatusEnum,
  notifications: () => notifications,
  partSourceEnum: () => partSourceEnum,
  paymentStatusEnum: () => paymentStatusEnum,
  payments: () => payments,
  quoteStatusEnum: () => quoteStatusEnum,
  quotes: () => quotes,
  rfqDocuments: () => rfqDocuments,
  rfqRecipients: () => rfqRecipients,
  userRoleEnum: () => userRoleEnum,
  userStatusEnum: () => userStatusEnum,
  users: () => users,
  vendorLocations: () => vendorLocations,
  vendorStatusEnum: () => vendorStatusEnum,
  vendorSupportedModels: () => vendorSupportedModels,
  vendorUsers: () => vendorUsers,
  vendors: () => vendors,
  whatsappMessages: () => whatsappMessages
});
import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  varchar,
  timestamp,
  serial,
  uuid,
  boolean,
  smallint,
  integer,
  numeric,
  char,
  jsonb,
  index,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  email: text("email"),
  termsAccepted: timestamp("terms_accepted").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  inspectionNumber: varchar("inspection_number").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id),
  carMake: text("car_make").notNull(),
  carMakeAr: text("car_make_ar"),
  carModel: text("car_model").notNull(),
  carModelAr: text("car_model_ar"),
  carYear: text("car_year"),
  parts: text("parts").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var insertUserSchema = createInsertSchema(users).pick({
  name: true,
  mobile: true,
  email: true
});
var insertInspectionSchema = createInsertSchema(inspections).pick({
  userId: true,
  carMake: true,
  carMakeAr: true,
  carModel: true,
  carModelAr: true,
  carYear: true,
  parts: true
});
var conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});
var inspectionStatusEnum = pgEnum("inspection_status", [
  "draft",
  "rfq_sent",
  "waiting_quotes",
  "quotes_received",
  "quote_accepted",
  "payment_pending",
  "paid",
  "vendor_notified",
  "ready_for_pickup",
  "cancelled",
  "closed"
]);
var deliveryStatusEnum = pgEnum("delivery_status", [
  "queued",
  "sent",
  "failed"
]);
var messageDirectionEnum = pgEnum("message_direction", [
  "outbound",
  "inbound"
]);
var quoteStatusEnum = pgEnum("quote_status", [
  "received",
  "parsed",
  "unparsed",
  "presented",
  "accepted",
  "rejected"
]);
var paymentStatusEnum = pgEnum("payment_status", [
  "initiated",
  "authorized",
  "captured",
  "failed",
  "refunded"
]);
var userRoleEnum = pgEnum("user_role", ["owner", "staff"]);
var userStatusEnum = pgEnum("user_status", ["active", "blocked"]);
var vendorStatusEnum = pgEnum("vendor_status", [
  "pending_verification",
  "active",
  "suspended",
  "rejected"
]);
var customerStatusEnum = pgEnum("customer_status", [
  "active",
  "blocked"
]);
var mediaTypeEnum = pgEnum("media_type", [
  "car_photo",
  "damage_photo",
  "other"
]);
var partSourceEnum = pgEnum("part_source", ["ai", "user"]);
var notificationChannelEnum = pgEnum("notification_channel", [
  "sms",
  "whatsapp",
  "push",
  "email"
]);
var notificationStatusEnum = pgEnum("notification_status", [
  "queued",
  "sent",
  "failed",
  "delivered"
]);
var cities = pgTable(
  "cities",
  {
    cityId: uuid("city_id").primaryKey().default(sql`gen_random_uuid()`),
    nameAr: varchar("name_ar", { length: 80 }).notNull(),
    nameEn: varchar("name_en", { length: 80 }),
    countryCode: char("country_code", { length: 2 }).notNull().default("SA"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index("idx_cities_country_code").on(t.countryCode)]
);
var carMakes = pgTable("car_makes", {
  makeId: uuid("make_id").primaryKey().default(sql`gen_random_uuid()`),
  makeName: varchar("make_name", { length: 50 }).notNull().unique(),
  nameAr: varchar("name_ar", { length: 80 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
var carModels = pgTable(
  "car_models",
  {
    carModelId: uuid("car_model_id").primaryKey().default(sql`gen_random_uuid()`),
    makeId: uuid("make_id").notNull().references(() => carMakes.makeId),
    modelName: varchar("model_name", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("idx_car_models_make_id").on(t.makeId),
    uniqueIndex("uq_car_models_make_model").on(t.makeId, t.modelName)
  ]
);
var customers = pgTable(
  "customers",
  {
    customerId: uuid("customer_id").primaryKey().default(sql`gen_random_uuid()`),
    fullName: varchar("full_name", { length: 150 }),
    mobileE164: varchar("mobile_e164", { length: 20 }).notNull().unique(),
    email: varchar("email", { length: 254 }).notNull().unique(),
    cityId: uuid("city_id").notNull().references(() => cities.cityId),
    status: customerStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true })
  },
  (t) => [index("idx_customers_city_id").on(t.cityId)]
);
var vendors = pgTable(
  "vendors",
  {
    vendorId: uuid("vendor_id").primaryKey().default(sql`gen_random_uuid()`),
    vendorName: varchar("vendor_name", { length: 150 }).notNull(),
    legalName: varchar("legal_name", { length: 150 }),
    crNumber: varchar("cr_number", { length: 50 }),
    vatNumber: varchar("vat_number", { length: 50 }),
    status: vendorStatusEnum("status").notNull().default("pending_verification"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index("idx_vendors_status").on(t.status)]
);
var vendorUsers = pgTable(
  "vendor_users",
  {
    vendorUserId: uuid("vendor_user_id").primaryKey().default(sql`gen_random_uuid()`),
    vendorId: uuid("vendor_id").notNull().references(() => vendors.vendorId),
    fullName: varchar("full_name", { length: 150 }),
    mobileE164: varchar("mobile_e164", { length: 20 }).notNull().unique(),
    email: varchar("email", { length: 254 }).unique(),
    whatsappE164: varchar("whatsapp_e164", { length: 20 }).notNull().unique(),
    whatsappVerifiedAt: timestamp("whatsapp_verified_at", {
      withTimezone: true
    }),
    isWhatsappPrimary: boolean("is_whatsapp_primary").notNull().default(false),
    role: userRoleEnum("role").notNull().default("owner"),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true })
  },
  (t) => [
    index("idx_vendor_users_vendor_id").on(t.vendorId),
    index("idx_vendor_users_is_primary").on(t.isWhatsappPrimary),
    uniqueIndex("uq_vendor_one_primary_whatsapp").on(t.vendorId).where(sql`${t.isWhatsappPrimary} = true`)
  ]
);
var vendorLocations = pgTable(
  "vendor_locations",
  {
    vendorLocationId: uuid("vendor_location_id").primaryKey().default(sql`gen_random_uuid()`),
    vendorId: uuid("vendor_id").notNull().references(() => vendors.vendorId),
    cityId: uuid("city_id").notNull().references(() => cities.cityId),
    addressLine: varchar("address_line", { length: 255 }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("uq_vendor_locations_vendor_city").on(t.vendorId, t.cityId),
    index("idx_vendor_locations_city_vendor").on(t.cityId, t.vendorId)
  ]
);
var vendorSupportedModels = pgTable(
  "vendor_supported_models",
  {
    vendorId: uuid("vendor_id").notNull().references(() => vendors.vendorId),
    carModelId: uuid("car_model_id").notNull().references(() => carModels.carModelId),
    yearFrom: smallint("year_from"),
    yearTo: smallint("year_to"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index("idx_vsm_car_model_vendor").on(t.carModelId, t.vendorId)]
);
var laqitInspections = pgTable(
  "laqit_inspections",
  {
    inspectionId: uuid("inspection_id").primaryKey().default(sql`gen_random_uuid()`),
    inspectionNo: varchar("inspection_no", { length: 30 }).notNull().unique(),
    customerId: uuid("customer_id").notNull().references(() => customers.customerId),
    cityId: uuid("city_id").notNull().references(() => cities.cityId),
    carModelId: uuid("car_model_id").notNull().references(() => carModels.carModelId),
    carYear: smallint("car_year"),
    carType: varchar("car_type", { length: 40 }),
    status: inspectionStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("idx_laqit_inspections_customer_created").on(
      t.customerId,
      t.createdAt
    ),
    index("idx_laqit_inspections_city_model").on(t.cityId, t.carModelId),
    index("idx_laqit_inspections_status").on(t.status)
  ]
);
var inspectionMedia = pgTable(
  "inspection_media",
  {
    mediaId: uuid("media_id").primaryKey().default(sql`gen_random_uuid()`),
    inspectionId: uuid("inspection_id").notNull().references(() => laqitInspections.inspectionId),
    mediaType: mediaTypeEnum("media_type").notNull(),
    fileUrl: text("file_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("idx_inspection_media_inspection_type").on(
      t.inspectionId,
      t.mediaType
    )
  ]
);
var inspectionParts = pgTable(
  "inspection_parts",
  {
    inspectionPartId: uuid("inspection_part_id").primaryKey().default(sql`gen_random_uuid()`),
    inspectionId: uuid("inspection_id").notNull().references(() => laqitInspections.inspectionId),
    partName: varchar("part_name", { length: 120 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    source: partSourceEnum("source").notNull().default("ai"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index("idx_inspection_parts_inspection_id").on(t.inspectionId)]
);
var rfqDocuments = pgTable(
  "rfq_documents",
  {
    rfqId: uuid("rfq_id").primaryKey().default(sql`gen_random_uuid()`),
    inspectionId: uuid("inspection_id").notNull().unique().references(() => laqitInspections.inspectionId),
    pdfUrl: text("pdf_url").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index("idx_rfq_documents_generated_at").on(t.generatedAt)]
);
var rfqRecipients = pgTable(
  "rfq_recipients",
  {
    rfqRecipientId: uuid("rfq_recipient_id").primaryKey().default(sql`gen_random_uuid()`),
    inspectionId: uuid("inspection_id").notNull().references(() => laqitInspections.inspectionId),
    vendorId: uuid("vendor_id").notNull().references(() => vendors.vendorId),
    vendorUserId: uuid("vendor_user_id").notNull().references(() => vendorUsers.vendorUserId),
    channel: varchar("channel", { length: 20 }).notNull().default("whatsapp"),
    status: deliveryStatusEnum("status").notNull().default("queued"),
    providerMessageId: varchar("provider_message_id", { length: 120 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("idx_rfq_recipients_inspection_id").on(t.inspectionId),
    index("idx_rfq_recipients_vendor_id").on(t.vendorId),
    index("idx_rfq_recipients_status").on(t.status)
  ]
);
var whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    messageId: uuid("message_id").primaryKey().default(sql`gen_random_uuid()`),
    direction: messageDirectionEnum("direction").notNull(),
    vendorId: uuid("vendor_id").references(() => vendors.vendorId),
    vendorUserId: uuid("vendor_user_id").references(
      () => vendorUsers.vendorUserId
    ),
    vendorWhatsappE164: varchar("vendor_whatsapp_e164", {
      length: 20
    }).notNull(),
    inspectionId: uuid("inspection_id").references(
      () => laqitInspections.inspectionId
    ),
    inspectionNoExtracted: varchar("inspection_no_extracted", { length: 30 }),
    textBody: text("text_body"),
    mediaUrl: text("media_url"),
    providerMessageId: varchar("provider_message_id", { length: 120 }).unique(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("idx_whatsapp_messages_whatsapp_e164").on(t.vendorWhatsappE164),
    index("idx_whatsapp_messages_inspection_no").on(t.inspectionNoExtracted),
    index("idx_whatsapp_messages_inspection_id").on(t.inspectionId)
  ]
);
var quotes = pgTable(
  "quotes",
  {
    quoteId: uuid("quote_id").primaryKey().default(sql`gen_random_uuid()`),
    inspectionId: uuid("inspection_id").notNull().references(() => laqitInspections.inspectionId),
    vendorId: uuid("vendor_id").notNull().references(() => vendors.vendorId),
    vendorUserId: uuid("vendor_user_id").notNull().references(() => vendorUsers.vendorUserId),
    quoteImageUrl: text("quote_image_url"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
    currency: char("currency", { length: 3 }).notNull().default("SAR"),
    status: quoteStatusEnum("status").notNull().default("received"),
    ocrRawText: text("ocr_raw_text"),
    presentedAt: timestamp("presented_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("idx_quotes_inspection_id").on(t.inspectionId),
    index("idx_quotes_vendor_id").on(t.vendorId),
    index("idx_quotes_status").on(t.status),
    uniqueIndex("uq_one_accepted_quote_per_inspection").on(t.inspectionId).where(sql`status = 'accepted'`)
  ]
);
var payments = pgTable(
  "payments",
  {
    paymentId: uuid("payment_id").primaryKey().default(sql`gen_random_uuid()`),
    inspectionId: uuid("inspection_id").notNull().references(() => laqitInspections.inspectionId),
    quoteId: uuid("quote_id").notNull().references(() => quotes.quoteId),
    customerId: uuid("customer_id").notNull().references(() => customers.customerId),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("SAR"),
    status: paymentStatusEnum("status").notNull().default("initiated"),
    gateway: varchar("gateway", { length: 50 }),
    gatewayRef: varchar("gateway_ref", { length: 120 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("idx_payments_inspection_id").on(t.inspectionId),
    index("idx_payments_customer_id").on(t.customerId),
    index("idx_payments_status").on(t.status),
    uniqueIndex("uq_one_live_payment_per_inspection").on(t.inspectionId).where(sql`status IN ('initiated', 'captured')`)
  ]
);
var notifications = pgTable(
  "notifications",
  {
    notificationId: uuid("notification_id").primaryKey().default(sql`gen_random_uuid()`),
    recipientType: varchar("recipient_type", { length: 20 }).notNull(),
    customerId: uuid("customer_id").references(() => customers.customerId),
    vendorUserId: uuid("vendor_user_id").references(
      () => vendorUsers.vendorUserId
    ),
    channel: notificationChannelEnum("channel").notNull(),
    status: notificationStatusEnum("status").notNull().default("queued"),
    inspectionId: uuid("inspection_id").references(
      () => laqitInspections.inspectionId
    ),
    body: text("body").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("idx_notifications_customer_id").on(t.customerId),
    index("idx_notifications_vendor_user_id").on(t.vendorUserId),
    index("idx_notifications_status").on(t.status)
  ]
);
var auditLog = pgTable(
  "audit_log",
  {
    auditId: uuid("audit_id").primaryKey().default(sql`gen_random_uuid()`),
    actorType: varchar("actor_type", { length: 30 }),
    actorId: uuid("actor_id"),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }),
    entityId: uuid("entity_id"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index("idx_audit_log_actor").on(t.actorType, t.actorId),
    index("idx_audit_log_entity").on(t.entityType, t.entityId),
    index("idx_audit_log_created_at").on(t.createdAt)
  ]
);
var carMakeAgents = pgTable(
  "car_make_agents",
  {
    agentId: uuid("agent_id").primaryKey().default(sql`gen_random_uuid()`),
    makeId: uuid("make_id").notNull().unique().references(() => carMakes.makeId),
    agentNameEn: varchar("agent_name_en", { length: 200 }).notNull(),
    agentNameAr: varchar("agent_name_ar", { length: 200 }),
    website: varchar("website", { length: 300 }),
    phone: varchar("phone", { length: 30 }),
    headquartersCity: varchar("headquarters_city", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  }
);
var insertCitySchema = createInsertSchema(cities).omit({
  cityId: true,
  createdAt: true
});
var insertCarMakeSchema = createInsertSchema(carMakes).omit({
  makeId: true,
  createdAt: true
});
var insertCarModelSchema = createInsertSchema(carModels).omit({
  carModelId: true,
  createdAt: true
});
var insertCustomerSchema = createInsertSchema(customers).omit({
  customerId: true,
  createdAt: true,
  lastLoginAt: true
});
var insertVendorSchema = createInsertSchema(vendors).omit({
  vendorId: true,
  createdAt: true
});
var insertVendorUserSchema = createInsertSchema(vendorUsers).omit({
  vendorUserId: true,
  createdAt: true,
  lastLoginAt: true,
  whatsappVerifiedAt: true
});
var insertVendorLocationSchema = createInsertSchema(
  vendorLocations
).omit({ vendorLocationId: true, createdAt: true });
var insertVendorSupportedModelSchema = createInsertSchema(
  vendorSupportedModels
).omit({ createdAt: true });
var insertLaqitInspectionSchema = createInsertSchema(
  laqitInspections
).omit({ inspectionId: true, createdAt: true, updatedAt: true });
var insertInspectionMediaSchema = createInsertSchema(
  inspectionMedia
).omit({ mediaId: true, createdAt: true });
var insertInspectionPartSchema = createInsertSchema(
  inspectionParts
).omit({ inspectionPartId: true, createdAt: true });
var insertRfqDocumentSchema = createInsertSchema(rfqDocuments).omit({
  rfqId: true,
  generatedAt: true
});
var insertRfqRecipientSchema = createInsertSchema(rfqRecipients).omit(
  { rfqRecipientId: true, createdAt: true, sentAt: true }
);
var insertWhatsappMessageSchema = createInsertSchema(
  whatsappMessages
).omit({ messageId: true, createdAt: true });
var insertQuoteSchema = createInsertSchema(quotes).omit({
  quoteId: true,
  createdAt: true,
  presentedAt: true,
  acceptedAt: true
});
var insertPaymentSchema = createInsertSchema(payments).omit({
  paymentId: true,
  createdAt: true,
  paidAt: true
});
var insertNotificationSchema = createInsertSchema(notifications).omit({
  notificationId: true,
  createdAt: true,
  sentAt: true
});
var insertAuditLogSchema = createInsertSchema(auditLog).omit({
  auditId: true,
  createdAt: true
});
var insertCarMakeAgentSchema = createInsertSchema(carMakeAgents).omit({
  agentId: true,
  createdAt: true
});

// server/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/auth.ts
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
var jwtSecret;
if (process.env.JWT_SECRET) {
  jwtSecret = process.env.JWT_SECRET;
} else {
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[auth] WARNING: JWT_SECRET env var not set in production. Tokens will be invalidated on every server restart. Set JWT_SECRET to a stable secret."
    );
  }
  jwtSecret = randomBytes(32).toString("hex");
}
var HEADER_B64 = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
var TOKEN_TTL_SECS = 30 * 24 * 3600;
function signToken(customerId) {
  const now = Math.floor(Date.now() / 1e3);
  const payload = Buffer.from(
    JSON.stringify({ sub: customerId, iat: now, exp: now + TOKEN_TTL_SECS })
  ).toString("base64url");
  const sig = createHmac("sha256", jwtSecret).update(`${HEADER_B64}.${payload}`).digest("base64url");
  return `${HEADER_B64}.${payload}.${sig}`;
}
function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = createHmac("sha256", jwtSecret).update(`${header}.${payload}`).digest("base64url");
  try {
    const expBuf = Buffer.from(expected, "base64url");
    const sigBuf = Buffer.from(sig, "base64url");
    if (expBuf.length !== sigBuf.length || !timingSafeEqual(expBuf, sigBuf)) {
      return null;
    }
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (!claims.sub || typeof claims.sub !== "string") return null;
    if (typeof claims.exp === "number" && claims.exp < Math.floor(Date.now() / 1e3)) return null;
    return { customerId: claims.sub };
  } catch {
    return null;
  }
}
function requireAdmin(req, res, next) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    res.status(503).json({ error: "\u062E\u062F\u0645\u0629 \u0627\u0644\u0625\u062F\u0627\u0631\u0629 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629" });
    return;
  }
  const provided = req.headers["x-admin-api-key"];
  if (typeof provided !== "string" || provided.length !== adminKey.length) {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
    return;
  }
  try {
    if (!timingSafeEqual(Buffer.from(provided, "utf-8"), Buffer.from(adminKey, "utf-8"))) {
      res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      return;
    }
  } catch {
    res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
    return;
  }
  next();
}
function requireCustomer(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "\u063A\u064A\u0631 \u0645\u0635\u0631\u062D" });
    return;
  }
  const token = authHeader.slice(7);
  const claims = verifyToken(token);
  if (!claims) {
    res.status(401).json({ error: "\u0627\u0644\u062C\u0644\u0633\u0629 \u0645\u0646\u062A\u0647\u064A\u0629\u060C \u064A\u0631\u062C\u0649 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0645\u062C\u062F\u062F\u0627\u064B" });
    return;
  }
  res.locals.customerId = claims.customerId;
  next();
}
function optionalCustomer(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const claims = verifyToken(authHeader.slice(7));
    if (claims) {
      res.locals.customerId = claims.customerId;
    }
  }
  next();
}
var RateLimiter = class {
  store = /* @__PURE__ */ new Map();
  windowMs;
  maxRequests;
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }
  /** Returns true if the request is allowed, false if over limit. */
  check(key) {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const bucket = this.store.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
    if (bucket.timestamps.length >= this.maxRequests) {
      this.store.set(key, bucket);
      return false;
    }
    bucket.timestamps.push(now);
    this.store.set(key, bucket);
    return true;
  }
  /** Seconds until the caller can retry. */
  retryAfterSeconds(key) {
    const bucket = this.store.get(key);
    if (!bucket || bucket.timestamps.length === 0) return 0;
    const oldest = Math.min(...bucket.timestamps);
    return Math.max(0, Math.ceil((oldest + this.windowMs - Date.now()) / 1e3));
  }
};
var otpIpLimiter = new RateLimiter(15 * 60 * 1e3, 5);
var aiCustomerLimiter = new RateLimiter(60 * 60 * 1e3, 20);
var aiIpLimiter = new RateLimiter(60 * 60 * 1e3, 40);
var emailIpLimiter = new RateLimiter(60 * 1e3, 5);
var OTP_TTL_MS = 5 * 60 * 1e3;
var OTP_RESEND_COOLDOWN_MS = 60 * 1e3;
var OTP_MAX_ATTEMPTS = 5;
var otpStore = /* @__PURE__ */ new Map();
function hashOtp(code) {
  return createHmac("sha256", jwtSecret).update(code).digest("hex");
}
function issueOtp(mobileE164) {
  const existing = otpStore.get(mobileE164);
  const now = Date.now();
  if (existing && now - existing.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
    return { cooldownRemaining: Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1e3) };
  }
  const code = String(Math.floor(1e5 + Math.random() * 9e5));
  otpStore.set(mobileE164, {
    hash: hashOtp(code),
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: now
  });
  return { code };
}
function hasPendingOtp(mobileE164) {
  const entry = otpStore.get(mobileE164);
  return !!entry && Date.now() <= entry.expiresAt;
}
function verifyOtp(mobileE164, code) {
  const entry = otpStore.get(mobileE164);
  if (!entry) {
    return { success: false, error: "\u0644\u0645 \u064A\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642\u060C \u064A\u0631\u062C\u0649 \u0637\u0644\u0628 \u0631\u0645\u0632 \u062C\u062F\u064A\u062F" };
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(mobileE164);
    return { success: false, error: "\u0627\u0646\u062A\u0647\u062A \u0635\u0644\u0627\u062D\u064A\u0629 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642\u060C \u064A\u0631\u062C\u0649 \u0637\u0644\u0628 \u0631\u0645\u0632 \u062C\u062F\u064A\u062F" };
  }
  if (entry.attempts >= OTP_MAX_ATTEMPTS) {
    otpStore.delete(mobileE164);
    return { success: false, error: "\u062A\u062C\u0627\u0648\u0632\u062A \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0645\u0646 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A\u060C \u064A\u0631\u062C\u0649 \u0637\u0644\u0628 \u0631\u0645\u0632 \u062C\u062F\u064A\u062F" };
  }
  const expected = hashOtp(code.trim());
  const expBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(entry.hash, "hex");
  if (expBuf.length !== gotBuf.length || !timingSafeEqual(expBuf, gotBuf)) {
    entry.attempts += 1;
    const attemptsLeft = OTP_MAX_ATTEMPTS - entry.attempts;
    if (attemptsLeft <= 0) {
      otpStore.delete(mobileE164);
      return { success: false, error: "\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D. \u062A\u0645 \u062A\u062C\u0627\u0648\u0632 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0645\u0646 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0627\u062A" };
    }
    return { success: false, error: "\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D", attemptsLeft };
  }
  otpStore.delete(mobileE164);
  return { success: true };
}

// server/routes.ts
import { eq, and, desc, inArray } from "drizzle-orm";

// server/services/whatsapp.ts
async function sendWhatsAppMessage(toE164, text2, pdfUrl, inspectionId) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!apiKey || !phoneNumberId) {
    console.log(`[WhatsApp STUB] Would send to ${toE164}:`);
    console.log(`  Text: ${text2.substring(0, 100)}...`);
    if (pdfUrl) console.log(`  PDF: ${pdfUrl}`);
    const mockId = `mock_wa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await db.insert(whatsappMessages).values({
      direction: "outbound",
      vendorWhatsappE164: toE164,
      inspectionId: inspectionId ?? null,
      textBody: text2,
      mediaUrl: pdfUrl ?? null,
      providerMessageId: mockId,
      sentAt: /* @__PURE__ */ new Date()
    });
    return { success: true, providerMessageId: mockId };
  }
  try {
    const body = {
      messaging_product: "whatsapp",
      to: toE164,
      type: "text",
      text: { body: text2 }
    };
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );
    const result = await response.json();
    const providerMessageId = result?.messages?.[0]?.id ?? void 0;
    await db.insert(whatsappMessages).values({
      direction: "outbound",
      vendorWhatsappE164: toE164,
      inspectionId: inspectionId ?? null,
      textBody: text2,
      mediaUrl: pdfUrl ?? null,
      providerMessageId: providerMessageId ?? null,
      sentAt: /* @__PURE__ */ new Date()
    });
    return { success: response.ok, providerMessageId };
  } catch (err) {
    console.error("[WhatsApp] Send error:", err?.message);
    return { success: false, error: err?.message };
  }
}

// server/routes.ts
init_sms();

// server/services/ocr.ts
import OpenAI from "openai";
var openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
async function extractTotalPrice(imageUrl) {
  const systemPrompt = `You are an OCR system specialized in reading spare parts quote invoices.
Your ONLY job is to extract the GRAND TOTAL / TOTAL price from the quote image.

Rules:
- Look for labels like "\u0627\u0644\u0645\u062C\u0645\u0648\u0639", "\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A", "Total", "Grand Total", "TOTAL", "\u0627\u0644\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0643\u0644\u064A"
- The amount is a number (may include commas as thousands separator and a decimal point)
- Currency is usually SAR, \u0631\u064A\u0627\u0644, SR, or SAR
- Return ONLY the final total, NOT subtotals or VAT lines
- If you cannot find a clear total, return null for totalAmount

You MUST return this exact JSON (no extra text):
{
  "totalAmount": 1250.00,
  "currency": "SAR",
  "rawText": "all text visible in the image",
  "confidence": 85
}

Where:
- totalAmount: number or null
- currency: 3-letter string (default SAR)
- rawText: all text you can read from the image
- confidence: integer 0-100, how confident you are in the total extraction`;
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the total price from this spare parts quote image." },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048
    });
    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    return {
      totalAmount: typeof parsed.totalAmount === "number" ? parsed.totalAmount : null,
      currency: typeof parsed.currency === "string" ? parsed.currency : "SAR",
      rawText: typeof parsed.rawText === "string" ? parsed.rawText : "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0
    };
  } catch (err) {
    console.error("[OCR] Error:", err?.message);
    return { totalAmount: null, currency: "SAR", rawText: "", confidence: 0 };
  }
}

// server/services/payment.ts
async function createPaymentIntent(amount, currency, metadata) {
  const secretKey = process.env.PAYMENT_SECRET_KEY;
  if (!secretKey) {
    console.log(`[Payment STUB] Creating intent: ${amount} ${currency}`, metadata);
    const mockId = `pi_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      id: mockId,
      clientSecret: `${mockId}_secret_mock`,
      amount,
      currency,
      status: "initiated"
    };
  }
  const params = new URLSearchParams({
    amount: String(Math.round(amount * 100)),
    currency: currency.toLowerCase(),
    payment_method_types: "card",
    "metadata[inspectionId]": metadata.inspectionId ?? "",
    "metadata[quoteId]": metadata.quoteId ?? ""
  });
  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString()
  });
  const result = await response.json();
  return {
    id: result.id,
    clientSecret: result.client_secret,
    amount,
    currency,
    status: "initiated"
  };
}

// server/services/analysisPdf.ts
import PDFDocument from "pdfkit";
import * as path from "path";
var AMIRI_FONT_PATH = path.resolve(__dirname, "../assets/fonts/Amiri-Regular.ttf");
var PRIVATE_HOSTNAME_RE = /^(localhost|.*\.local)$|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\.|^169\.254\.|^\[?::1\]?$|^\[?fc|^\[?fd/i;
function isSafeImageUri(uri) {
  if (!uri.startsWith("https://")) return false;
  try {
    const { hostname } = new URL(uri);
    if (PRIVATE_HOSTNAME_RE.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}
var MAX_IMAGE_BYTES = 10 * 1024 * 1024;
async function fetchImageBuffer(uri) {
  if (!isSafeImageUri(uri)) {
    console.warn(`[analysisPdf] Image URI rejected by SSRF guard: ${uri.slice(0, 80)}`);
    return null;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8e3);
  try {
    const resp = await fetch(uri, {
      signal: controller.signal,
      redirect: "error"
    });
    if (!resp.ok) {
      console.warn(`[analysisPdf] Image fetch failed: HTTP ${resp.status}`);
      return null;
    }
    const contentType = resp.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      console.warn(`[analysisPdf] Rejected non-image content-type: ${contentType}`);
      return null;
    }
    const contentLength = parseInt(resp.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_IMAGE_BYTES) {
      console.warn(`[analysisPdf] Image too large (content-length): ${contentLength}`);
      return null;
    }
    const arrayBuffer = await resp.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) {
      console.warn(`[analysisPdf] Image too large after download: ${arrayBuffer.byteLength}`);
      return null;
    }
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.warn(`[analysisPdf] Image fetch error: ${err?.message ?? err}`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
async function generateAnalysisPdf(carInfo, parts, imageUri) {
  const imageBuffer = imageUri ? await fetchImageBuffer(imageUri) : null;
  return new Promise((resolve3, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve3(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont("Arabic", AMIRI_FONT_PATH);
    const blue = "#1E74F2";
    const gray = "#6B7280";
    const light = "#F3F4F6";
    const dark = "#111827";
    const pageWidth = doc.page.width - 100;
    const arText = (text2, x, y, opts = {}) => {
      doc.font("Arabic").fontSize(opts.fontSize ?? 10).fillColor(opts.fillColor ?? dark).text(text2, x, y, { align: "right", ...opts, font: void 0 });
    };
    const latText = (text2, x, y, opts = {}) => {
      doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(opts.fontSize ?? 10).fillColor(opts.fillColor ?? dark).text(text2, x, y, { ...opts, bold: void 0, font: void 0 });
    };
    doc.rect(50, 40, pageWidth, 60).fill(blue);
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#FFFFFF").text("Laqit", 50, 52, { width: pageWidth / 2, align: "left" });
    doc.font("Arabic").fontSize(18).fillColor("#FFFFFF").text("\u0644\u0627\u0642\u0637", 50, 52, { width: pageWidth, align: "right" });
    doc.moveDown(3);
    const dateStr = (/* @__PURE__ */ new Date()).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    doc.font("Helvetica-Bold").fontSize(15).fillColor(dark).text("Car Damage Analysis Report", 50, 120, { width: pageWidth, align: "center" });
    doc.font("Arabic").fontSize(13).fillColor(dark).text("\u062A\u0642\u0631\u064A\u0631 \u062A\u0634\u062E\u064A\u0635 \u0623\u0636\u0631\u0627\u0631 \u0627\u0644\u0633\u064A\u0627\u0631\u0629", 50, 138, { width: pageWidth, align: "center" });
    doc.font("Helvetica").fontSize(10).fillColor(gray).text(`Date: ${dateStr}`, 50, 158, { width: pageWidth, align: "center" });
    doc.moveDown(1.2);
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(blue).lineWidth(1.5).stroke();
    doc.moveDown(1);
    const carY = doc.y;
    doc.rect(50, carY, pageWidth, 28).fill(light);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(blue).text("Vehicle Information", 55, carY + 8, { width: pageWidth * 0.5, align: "left" });
    doc.font("Arabic").fontSize(12).fillColor(blue).text("\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0633\u064A\u0627\u0631\u0629", 50, carY + 8, { width: pageWidth - 10, align: "right" });
    doc.moveDown(0.3);
    const colW = pageWidth / 3;
    const labelY = doc.y + 4;
    const valueY = labelY + 14;
    doc.font("Helvetica").fontSize(9).fillColor(gray).text("Make", 50, labelY, { width: colW }).text("Model", 50 + colW, labelY, { width: colW }).text("Year", 50 + colW * 2, labelY, { width: colW });
    doc.font("Arabic").fontSize(12).fillColor(dark).text(carInfo.makeAr, 50, valueY, { width: colW, align: "left" });
    doc.font("Helvetica").fontSize(10).fillColor(gray).text(`(${carInfo.make})`, 50, valueY + 14, { width: colW });
    doc.font("Arabic").fontSize(12).fillColor(dark).text(carInfo.modelAr, 50 + colW, valueY, { width: colW, align: "left" });
    doc.font("Helvetica").fontSize(10).fillColor(gray).text(`(${carInfo.model})`, 50 + colW, valueY + 14, { width: colW });
    doc.font("Helvetica-Bold").fontSize(13).fillColor(dark).text(carInfo.year, 50 + colW * 2, valueY, { width: colW });
    doc.moveDown(3.2);
    if (imageBuffer) {
      const imgSectionY = doc.y;
      doc.rect(50, imgSectionY, pageWidth, 28).fill(light);
      doc.font("Helvetica-Bold").fontSize(11).fillColor(blue).text("Damage Photo", 55, imgSectionY + 8, { width: pageWidth * 0.5, align: "left" });
      doc.font("Arabic").fontSize(12).fillColor(blue).text("\u0635\u0648\u0631\u0629 \u0627\u0644\u0636\u0631\u0631", 50, imgSectionY + 8, { width: pageWidth - 10, align: "right" });
      doc.moveDown(0.5);
      const maxImgWidth = pageWidth;
      const maxImgHeight = 200;
      try {
        doc.image(imageBuffer, 50, doc.y, {
          fit: [maxImgWidth, maxImgHeight],
          align: "center",
          valign: "center"
        });
        doc.y = Math.max(doc.y, imgSectionY + 28 + maxImgHeight + 8);
      } catch (imgErr) {
        console.warn(`[analysisPdf] Could not embed image: ${imgErr?.message}`);
        doc.font("Helvetica").fontSize(10).fillColor(gray).text("[Photo could not be embedded]", 50, doc.y, { width: pageWidth, align: "center" });
        doc.moveDown(1);
      }
    }
    doc.moveDown(0.5);
    if (doc.y > doc.page.height - 150) doc.addPage();
    const tableActualY = doc.y;
    doc.rect(50, tableActualY, pageWidth, 28).fill(blue);
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#FFFFFF").text("Detected Parts", 55, tableActualY + 8, { width: pageWidth * 0.5, align: "left" });
    doc.font("Arabic").fontSize(13).fillColor("#FFFFFF").text("\u0627\u0644\u0642\u0637\u0639 \u0627\u0644\u0645\u0643\u062A\u0634\u0641\u0629", 50, tableActualY + 7, { width: pageWidth - 10, align: "right" });
    const c1 = 50;
    const c2 = 50 + pageWidth * 0.36;
    const c3 = 50 + pageWidth * 0.63;
    const c4 = 50 + pageWidth * 0.78;
    let rowTop = tableActualY + 28 + 5;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(gray).text("Arabic Name", c1, rowTop, { width: pageWidth * 0.34 }).text("English Name", c2, rowTop, { width: pageWidth * 0.25 }).text("Confidence", c3, rowTop, { width: pageWidth * 0.14 }).text("Est. Price (SAR)", c4, rowTop, { width: pageWidth * 0.22 });
    doc.font("Arabic").fontSize(9).fillColor(gray).text("\u0627\u0644\u0627\u0633\u0645 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629", c1, rowTop, { width: pageWidth * 0.34, align: "right" });
    rowTop += 18;
    doc.moveTo(50, rowTop).lineTo(50 + pageWidth, rowTop).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
    parts.forEach((part, i) => {
      if (rowTop > doc.page.height - 100) {
        doc.addPage();
        rowTop = 60;
      }
      if (i % 2 === 0) {
        doc.rect(50, rowTop, pageWidth, 24).fill(light);
      }
      const conf = part.confidence;
      const confColor = conf >= 90 ? "#16A34A" : conf >= 75 ? "#22C55E" : conf >= 60 ? "#D97706" : "#DC2626";
      doc.font("Arabic").fontSize(10).fillColor(dark).text(part.nameAr, c1, rowTop + 6, { width: pageWidth * 0.34, align: "right" });
      doc.font("Helvetica").fontSize(9).fillColor(dark).text(part.name, c2, rowTop + 8, { width: pageWidth * 0.25 });
      doc.font("Helvetica-Bold").fontSize(9).fillColor(confColor).text(`${conf}%`, c3, rowTop + 8, { width: pageWidth * 0.14 });
      doc.font("Helvetica").fontSize(9).fillColor(dark).text(`${part.price.toLocaleString()} SAR`, c4, rowTop + 8, { width: pageWidth * 0.22 });
      rowTop += 24;
      doc.moveTo(50, rowTop).lineTo(50 + pageWidth, rowTop).strokeColor("#E5E7EB").lineWidth(0.3).stroke();
    });
    const total = parts.reduce((sum, p) => sum + p.price, 0);
    doc.y = rowTop + 8;
    doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).strokeColor(blue).lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(dark).text(`Total Estimated: ${total.toLocaleString()} SAR`, 50, doc.y, {
      width: pageWidth * 0.5
    });
    doc.font("Arabic").fontSize(12).fillColor(dark).text(`\u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A: ${total.toLocaleString()} \u0631\u064A\u0627\u0644`, 50, doc.y - 16, {
      width: pageWidth,
      align: "right"
    });
    const footerY = doc.page.height - 50;
    doc.font("Helvetica").fontSize(8).fillColor(gray).text(
      "Generated by Laqit \u2014 \u0644\u0627\u0642\u0637 | laqit.app \u2014 All prices are estimates only.",
      50,
      footerY,
      { width: pageWidth, align: "center" }
    );
    doc.end();
  });
}

// server/services/email.ts
async function sendAnalysisPdfEmail(to, pdfBuffer, filename) {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT ?? "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM ?? user ?? "noreply@laqit.app";
  if (!host || !user || !pass) {
    console.log(`[Email STUB] Would send PDF to: ${to}`);
    console.log(`  From: ${from}`);
    console.log(`  Subject: \u062A\u0642\u0631\u064A\u0631 \u062A\u0634\u062E\u064A\u0635 \u0627\u0644\u0633\u064A\u0627\u0631\u0629 - \u0644\u0627\u0642\u0637`);
    console.log(`  Attachment: ${filename} (${pdfBuffer.length} bytes)`);
    return { success: true, messageId: `mock_email_${Date.now()}` };
  }
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
    const info = await transporter.sendMail({
      from,
      to,
      subject: "\u062A\u0642\u0631\u064A\u0631 \u062A\u0634\u062E\u064A\u0635 \u0627\u0644\u0633\u064A\u0627\u0631\u0629 - \u0644\u0627\u0642\u0637",
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1E74F2;">\u0644\u0627\u0642\u0637 \u2014 \u062A\u0642\u0631\u064A\u0631 \u062A\u0634\u062E\u064A\u0635 \u0627\u0644\u0633\u064A\u0627\u0631\u0629</h2>
          <p>\u0645\u0631\u062D\u0628\u0627\u064B\u060C</p>
          <p>\u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0637\u0644\u0627\u0639 \u0639\u0644\u0649 \u062A\u0642\u0631\u064A\u0631 \u062A\u0634\u062E\u064A\u0635 \u0633\u064A\u0627\u0631\u062A\u0643 \u0627\u0644\u0645\u0631\u0641\u0642 \u0623\u062F\u0646\u0627\u0647.</p>
          <p>\u064A\u062D\u062A\u0648\u064A \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0639\u0644\u0649 \u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u0633\u064A\u0627\u0631\u0629 \u0648\u0627\u0644\u0642\u0637\u0639 \u0627\u0644\u0645\u0643\u062A\u0634\u0641\u0629 \u0645\u0639 \u0627\u0644\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u062A\u0642\u062F\u064A\u0631\u064A\u0629.</p>
          <hr />
          <p style="color: #888; font-size: 12px;">\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0647\u0630\u0627 \u0627\u0644\u0628\u0631\u064A\u062F \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0645\u0646 \u0645\u0646\u0635\u0629 \u0644\u0627\u0642\u0637.</p>
        </div>
      `,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("[Email] Send error:", err?.message);
    return { success: false, error: err?.message };
  }
}

// server/routes.ts
var openai2 = new OpenAI2({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
function clientIp(req) {
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}
async function registerRoutes(app2) {
  app2.post("/api/register", async (req, res) => {
    try {
      const { name, mobile, email } = req.body;
      if (!name || !mobile) {
        return res.status(400).json({ error: "\u0627\u0644\u0627\u0633\u0645 \u0648\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      }
      const existingUser = await db.select().from(users).where(eq(users.mobile, mobile)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
      }
      const [newUser] = await db.insert(users).values({
        name,
        mobile,
        email: email || null
      }).returning();
      res.json({ success: true, user: { id: newUser.id, name: newUser.name, mobile: newUser.mobile, email: newUser.email } });
    } catch (error) {
      console.error("Registration error:", error?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u0633\u062C\u064A\u0644" });
    }
  });
  app2.post("/api/login", (_req, res) => {
    res.status(410).json({ error: "\u0647\u0630\u0647 \u0627\u0644\u062E\u062F\u0645\u0629 \u0644\u0645 \u062A\u0639\u062F \u0645\u062A\u0627\u062D\u0629" });
  });
  app2.post("/api/inspections", (_req, res) => {
    res.status(410).json({ error: "\u0647\u0630\u0647 \u0627\u0644\u062E\u062F\u0645\u0629 \u0644\u0645 \u062A\u0639\u062F \u0645\u062A\u0627\u062D\u0629" });
  });
  app2.get("/api/inspections/:userId", (_req, res) => {
    res.status(410).json({ error: "\u0647\u0630\u0647 \u0627\u0644\u062E\u062F\u0645\u0629 \u0644\u0645 \u062A\u0639\u062F \u0645\u062A\u0627\u062D\u0629" });
  });
  app2.post("/api/analyze", optionalCustomer, async (req, res) => {
    try {
      const customerId = res.locals.customerId;
      if (customerId && !aiCustomerLimiter.check(customerId)) {
        const retryAfter = aiCustomerLimiter.retryAfterSeconds(customerId);
        return res.status(429).json({ error: `\u062A\u062C\u0627\u0648\u0632\u062A \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0645\u0646 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062A\u062D\u0644\u064A\u0644\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F ${retryAfter} \u062B\u0627\u0646\u064A\u0629` });
      }
      const ip = clientIp(req);
      if (!aiIpLimiter.check(ip)) {
        const retryAfter = aiIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `\u0637\u0644\u0628\u0627\u062A \u0643\u062B\u064A\u0631\u0629 \u062C\u062F\u0627\u064B\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F ${retryAfter} \u062B\u0627\u0646\u064A\u0629` });
      }
      const { imageUri, carInfo } = req.body;
      console.log("Received analyze request");
      const systemPrompt = `You are an expert automotive damage and missing parts detection system. You MUST analyze the image and identify the car, then detect any missing, damaged, broken, or worn parts.

IMPORTANT: You MUST ALWAYS return valid JSON in the exact format specified below. NEVER return error messages or plain text.

STEP 1 - Identify the car:
- Look for visible text on the car (brand names like "ODYSSEY", "FLEX", "CAMRY", etc.)
- Look for brand logos/emblems (Honda "H", Ford oval, Toyota logo, etc.)
- Study the body shape, taillights, and distinctive features
- Estimate the year based on the generation/design

STEP 2 - Systematically inspect for damage (scan EVERY zone):
This is a damage inspection tool; missing real damage is the worst possible outcome. Work zone by zone and report EVERY visible defect as its own separate part entry:
- FRONT: bumper, grille, headlights, fog lights, hood, emblem, license plate area
- REAR: bumper, tail lights, trunk/tailgate, exhaust tip, emblem
- SIDES: front/rear doors, fenders, side mirrors, door handles, side moldings/trim, rocker panels
- GLASS: windshield, rear window, side windows (look for chips, cracks, shattering)
- WHEELS & TIRES: rims (scuffs, bends, curb rash), tires (wear, flats, sidewall cuts)
- LIGHTS: any cracked, broken, fogged, hazed, or missing lamp/lens
- PAINT & BODY: scratches, scuffs, dents, dings, rust, faded/peeling/chipped paint, paint transfer, misaligned panels or uneven gaps

For EACH defect, create a SEPARATE entry. Report damage even when minor (small scratches, light scuffs, paint chips, curb rash). Describe the condition precisely: "missing", "damaged", "cracked", "broken", "dented", "scratched", "worn", "faded", etc. Provide a realistic replacement/repair price in Saudi Riyals (SAR) for each.

You MUST return this exact JSON structure (no exceptions):
{
  "carInfo": {
    "make": "Honda",
    "makeAr": "\u0647\u0648\u0646\u062F\u0627",
    "model": "Odyssey",
    "modelAr": "\u0623\u0648\u062F\u064A\u0633\u064A",
    "year": "2022"
  },
  "parts": [
    {
      "id": "1",
      "name": "Front Bumper - Damaged",
      "nameAr": "\u0627\u0644\u0635\u062F\u0627\u0645 \u0627\u0644\u0623\u0645\u0627\u0645\u064A - \u062A\u0627\u0644\u0641",
      "description": "Front bumper has visible crack on the left side",
      "descriptionAr": "\u0627\u0644\u0635\u062F\u0627\u0645 \u0627\u0644\u0623\u0645\u0627\u0645\u064A \u0628\u0647 \u0634\u0631\u062E \u0648\u0627\u0636\u062D \u0639\u0644\u0649 \u0627\u0644\u062C\u0627\u0646\u0628 \u0627\u0644\u0623\u064A\u0633\u0631",
      "condition": "damaged",
      "conditionAr": "\u062A\u0627\u0644\u0641",
      "primaryUse": "Protects the front of the vehicle in low-speed collisions",
      "primaryUseAr": "\u062D\u0645\u0627\u064A\u0629 \u0645\u0642\u062F\u0645\u0629 \u0627\u0644\u0633\u064A\u0627\u0631\u0629 \u0641\u064A \u0627\u0644\u062A\u0635\u0627\u062F\u0645\u0627\u062A \u0645\u0646\u062E\u0641\u0636\u0629 \u0627\u0644\u0633\u0631\u0639\u0629",
      "price": 1200,
      "confidence": 85,
      "boundingBox": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.2 }
    }
  ]
}

CONDITION VALUES:
- "missing" / "\u0645\u0641\u0642\u0648\u062F" - Part is completely absent
- "damaged" / "\u062A\u0627\u0644\u0641" - Part is broken, cracked, or significantly damaged  
- "scratched" / "\u0645\u062E\u062F\u0648\u0634" - Part has scratches or surface damage
- "dented" / "\u0645\u0636\u063A\u0648\u0637" - Part has dents
- "worn" / "\u0645\u062A\u0622\u0643\u0644" - Part shows significant wear
- "faded" / "\u0628\u0627\u0647\u062A" - Paint or surface has faded
- "cracked" / "\u0645\u062A\u0634\u0642\u0642" - Part has cracks

RULES:
- Be thorough: report EVERY visible defect as its own part entry. Err on the side of reporting borderline or minor damage rather than missing it.
- Examine the whole image methodically; do not stop after finding one issue. A single photo often shows several separate damaged parts.
- Only return an empty parts array if the image clearly shows an undamaged car in pristine condition, or if there is genuinely no car in the image.
- If the image is blurry or a region is partly unclear, still report what is visibly wrong and lower the confidence accordingly instead of skipping it.
- boundingBox must tightly frame the damaged area using normalized 0-1 coordinates (x,y = top-left corner; width,height = size). Provide one for every part.
- ALWAYS provide Arabic translations (makeAr, modelAr, nameAr, descriptionAr, conditionAr, primaryUseAr)
- Confidence should reflect how certain you are about the damage (60-100)
- Prices should be realistic replacement/repair estimates in SAR
- NEVER return an error message - always return the JSON structure above`;
      const userMessage = carInfo ? `The user has selected: ${carInfo.make} ${carInfo.model} ${carInfo.year}. Inspect the car image carefully for any missing, damaged, broken, worn, or defective parts.` : `Identify the car make, model, year, then inspect the image carefully for any missing, damaged, broken, worn, or defective parts.`;
      console.log("Calling OpenAI API with model gpt-5...");
      const response = await openai2.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage },
              {
                type: "image_url",
                image_url: { url: imageUri, detail: "high" }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        reasoning_effort: "medium",
        max_completion_tokens: 8192
      });
      const finishReason = response.choices[0]?.finish_reason;
      console.log(`OpenAI API response received (finish_reason=${finishReason})`);
      if (finishReason === "length") {
        console.warn("Analyze response was truncated (hit max_completion_tokens)");
      }
      const content = response.choices[0]?.message?.content || "{}";
      const result = JSON.parse(content);
      if (!result.carInfo || !Array.isArray(result.parts)) {
        console.log("Invalid response structure, returning default");
        return res.json({
          carInfo: {
            make: "Unknown",
            makeAr: "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
            model: "Unknown",
            modelAr: "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
            year: "---"
          },
          parts: []
        });
      }
      res.json(result);
    } catch (error) {
      console.error("Analysis error details:", {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        type: error?.type
      });
      res.status(500).json({
        error: true,
        message: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0635\u0648\u0631\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.",
        carInfo: {
          make: "Unknown",
          makeAr: "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
          model: "Unknown",
          modelAr: "\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641",
          year: "---"
        },
        parts: []
      });
    }
  });
  app2.post("/api/identify-car", optionalCustomer, async (req, res) => {
    try {
      const customerId = res.locals.customerId;
      if (customerId && !aiCustomerLimiter.check(customerId)) {
        const retryAfter = aiCustomerLimiter.retryAfterSeconds(customerId);
        return res.status(429).json({ error: `\u062A\u062C\u0627\u0648\u0632\u062A \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0633\u0645\u0648\u062D \u0645\u0646 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062A\u062D\u0644\u064A\u0644\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F ${retryAfter} \u062B\u0627\u0646\u064A\u0629` });
      }
      const ip = clientIp(req);
      if (!aiIpLimiter.check(ip)) {
        const retryAfter = aiIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `\u0637\u0644\u0628\u0627\u062A \u0643\u062B\u064A\u0631\u0629 \u062C\u062F\u0627\u064B\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F ${retryAfter} \u062B\u0627\u0646\u064A\u0629` });
      }
      const { imageUri } = req.body;
      if (!imageUri) return res.status(400).json({ error: "imageUri required" });
      const response = await openai2.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are an automotive expert. Analyze the car in the image and identify its make, model, and year. Return ONLY valid JSON in this exact format:
{
  "makeName": "Toyota",
  "modelName": "Camry",
  "year": "2022",
  "confidence": 85
}
Rules:
- makeName: the manufacturer brand name in English (e.g. Toyota, Hyundai, Nissan, Ford, GMC, Kia, Honda, BMW)
- modelName: the model name in English (e.g. Camry, Corolla, Accent)
- year: 4-digit year as a string, estimate if not certain
- confidence: integer 0-100 reflecting certainty
- If the image has no car, return { "makeName": null, "modelName": null, "year": null, "confidence": 0 }`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify the make, model, and year of this car." },
              { type: "image_url", image_url: { url: imageUri } }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2048
      });
      const raw = response.choices[0]?.message?.content ?? "{}";
      const result = JSON.parse(raw);
      res.json(result);
    } catch (err) {
      console.error("identify-car error:", err?.message);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u0644\u064A\u0644 \u0635\u0648\u0631\u0629 \u0627\u0644\u0633\u064A\u0627\u0631\u0629" });
    }
  });
  app2.post("/api/analysis/send-pdf", async (req, res) => {
    try {
      const ip = clientIp(req);
      if (!emailIpLimiter.check(ip)) {
        const retryAfter = emailIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `\u0637\u0644\u0628\u0627\u062A \u0643\u062B\u064A\u0631\u0629 \u062C\u062F\u0627\u064B\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F ${retryAfter} \u062B\u0627\u0646\u064A\u0629` });
      }
      const { email, carInfo, parts, imageUri } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0637\u0644\u0648\u0628" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u063A\u064A\u0631 \u0635\u062D\u064A\u062D" });
      }
      if (!carInfo || !Array.isArray(parts)) {
        return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629" });
      }
      const safeImageUri = typeof imageUri === "string" && imageUri.startsWith("https://") ? imageUri : void 0;
      const pdfBuffer = await generateAnalysisPdf(carInfo, parts, safeImageUri);
      const filename = `laqit-analysis-${Date.now()}.pdf`;
      const result = await sendAnalysisPdfEmail(email, pdfBuffer, filename);
      if (!result.success) {
        return res.status(500).json({ error: "\u0641\u0634\u0644 \u0641\u064A \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0627\u062D\u0642\u0627\u064B" });
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("send-pdf error:", err?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0623\u0648 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u062A\u0642\u0631\u064A\u0631" });
    }
  });
  app2.get("/api/cities", async (_req, res) => {
    try {
      const result = await db.select().from(cities).orderBy(cities.nameAr);
      res.json({ cities: result });
    } catch (err) {
      console.error("GET /api/cities error:", err?.message);
      res.status(500).json({ error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u062F\u0646" });
    }
  });
  app2.get("/api/car-makes", async (_req, res) => {
    try {
      const rows = await db.select({
        makeId: carMakes.makeId,
        makeName: carMakes.makeName,
        nameAr: carMakes.nameAr,
        createdAt: carMakes.createdAt,
        agentNameEn: carMakeAgents.agentNameEn,
        agentNameAr: carMakeAgents.agentNameAr,
        website: carMakeAgents.website,
        phone: carMakeAgents.phone,
        headquartersCity: carMakeAgents.headquartersCity
      }).from(carMakes).leftJoin(carMakeAgents, eq(carMakeAgents.makeId, carMakes.makeId)).orderBy(carMakes.makeName);
      const makes = rows.map((r) => ({
        makeId: r.makeId,
        makeName: r.makeName,
        nameAr: r.nameAr,
        createdAt: r.createdAt,
        agent: r.agentNameEn ? {
          agentNameEn: r.agentNameEn,
          agentNameAr: r.agentNameAr,
          website: r.website,
          phone: r.phone,
          headquartersCity: r.headquartersCity
        } : null
      }));
      res.json({ makes });
    } catch (err) {
      console.error("GET /api/car-makes error:", err?.message);
      res.status(500).json({ error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0627\u0631\u0643\u0627\u062A" });
    }
  });
  app2.patch("/api/car-makes/:makeId/agent", requireAdmin, async (req, res) => {
    try {
      const { makeId } = req.params;
      const { agentNameEn, agentNameAr, website, phone, headquartersCity } = req.body;
      if (!agentNameEn) {
        return res.status(400).json({ error: "agentNameEn is required" });
      }
      const [agent] = await db.insert(carMakeAgents).values({ makeId, agentNameEn, agentNameAr: agentNameAr || null, website: website || null, phone: phone || null, headquartersCity: headquartersCity || null }).onConflictDoUpdate({
        target: carMakeAgents.makeId,
        set: {
          agentNameEn,
          agentNameAr: agentNameAr || null,
          website: website || null,
          phone: phone || null,
          headquartersCity: headquartersCity || null
        }
      }).returning();
      res.json({ success: true, agent });
    } catch (err) {
      console.error("PATCH /api/car-makes/:makeId/agent error:", err?.message);
      res.status(500).json({ error: err?.message });
    }
  });
  app2.get("/api/car-models/counts", async (_req, res) => {
    try {
      const result = await db.select().from(carModels);
      res.json({ models: result.map((m) => ({ makeId: m.makeId })) });
    } catch (err) {
      console.error("GET /api/car-models/counts error:", err?.message);
      res.status(500).json({ error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0639\u062F\u062F \u0627\u0644\u0645\u0648\u062F\u064A\u0644\u0627\u062A" });
    }
  });
  app2.get("/api/car-models/:makeId", async (req, res) => {
    try {
      const { makeId } = req.params;
      const result = await db.select().from(carModels).where(eq(carModels.makeId, makeId)).orderBy(carModels.modelName);
      res.json({ models: result });
    } catch (err) {
      console.error("GET /api/car-models error:", err?.message);
      res.status(500).json({ error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0648\u062F\u064A\u0644\u0627\u062A" });
    }
  });
  app2.post("/api/customers/register", async (req, res) => {
    try {
      const ip = clientIp(req);
      if (!otpIpLimiter.check(ip)) {
        const retryAfter = otpIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `\u0637\u0644\u0628\u0627\u062A \u0643\u062B\u064A\u0631\u0629 \u062C\u062F\u0627\u064B\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F ${retryAfter} \u062B\u0627\u0646\u064A\u0629` });
      }
      const { fullName, mobileE164, email, cityId } = req.body;
      if (!mobileE164 || !email || !cityId) {
        return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0648\u0627\u0644\u0628\u0631\u064A\u062F \u0648\u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0645\u0637\u0644\u0648\u0628\u0629" });
      }
      const [existingMobile] = await db.select({ customerId: customers.customerId }).from(customers).where(eq(customers.mobileE164, mobileE164)).limit(1);
      if (existingMobile) {
        return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
      }
      const [existingEmail] = await db.select({ customerId: customers.customerId }).from(customers).where(eq(customers.email, email)).limit(1);
      if (existingEmail) {
        return res.status(400).json({ error: "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
      }
      let customer;
      try {
        [customer] = await db.insert(customers).values({
          fullName: fullName ?? null,
          mobileE164,
          email,
          cityId,
          lastLoginAt: /* @__PURE__ */ new Date()
        }).returning();
      } catch (insertErr) {
        if (insertErr?.code === "23505") {
          return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0623\u0648 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
        }
        throw insertErr;
      }
      const token = signToken(customer.customerId);
      res.json({ success: true, customer, token });
    } catch (err) {
      console.error("Customer register error:", err?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u0633\u062C\u064A\u0644" });
    }
  });
  app2.post("/api/customers/login", async (req, res) => {
    try {
      const ip = clientIp(req);
      if (!otpIpLimiter.check(ip)) {
        const retryAfter = otpIpLimiter.retryAfterSeconds(ip);
        return res.status(429).json({ error: `\u0637\u0644\u0628\u0627\u062A \u0643\u062B\u064A\u0631\u0629 \u062C\u062F\u0627\u064B\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0628\u0639\u062F ${retryAfter} \u062B\u0627\u0646\u064A\u0629` });
      }
      const { mobileE164 } = req.body;
      if (!mobileE164) return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0645\u0637\u0644\u0648\u0628" });
      const [customer] = await db.select().from(customers).where(eq(customers.mobileE164, mobileE164)).limit(1);
      if (customer) {
        await db.update(customers).set({ lastLoginAt: /* @__PURE__ */ new Date() }).where(eq(customers.customerId, customer.customerId));
        const token = signToken(customer.customerId);
        return res.json({ success: true, customer, token });
      }
      if (!hasPendingOtp(mobileE164)) {
        return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      }
      const result = issueOtp(mobileE164);
      if ("cooldownRemaining" in result && !("code" in result)) {
        return res.status(429).json({ error: `\u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631 ${result.cooldownRemaining} \u062B\u0627\u0646\u064A\u0629 \u0642\u0628\u0644 \u0637\u0644\u0628 \u0631\u0645\u0632 \u062C\u062F\u064A\u062F` });
      }
      const { code } = result;
      const { sendSms: sendSms2 } = await Promise.resolve().then(() => (init_sms(), sms_exports));
      await sendSms2(mobileE164, `\u0644\u0627\u0642\u0637: \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0627\u0644\u062E\u0627\u0635 \u0628\u0643 \u0647\u0648 ${code}. \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 5 \u062F\u0642\u0627\u0626\u0642.`);
      res.json({ success: true, message: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0625\u0644\u0649 \u062C\u0648\u0627\u0644\u0643" });
    } catch (err) {
      console.error("Customer login error:", err?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
    }
  });
  app2.post("/api/customers/verify-otp", async (req, res) => {
    try {
      const { mobileE164, otp, fullName, email, cityId } = req.body;
      if (!mobileE164 || !otp) return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0648\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      const result = verifyOtp(mobileE164, String(otp));
      if (!result.success) {
        return res.status(400).json({ error: result.error, attemptsLeft: result.attemptsLeft });
      }
      const [existing] = await db.select().from(customers).where(eq(customers.mobileE164, mobileE164)).limit(1);
      let customer;
      if (!existing) {
        if (!email || !cityId) {
          return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629" });
        }
        try {
          [customer] = await db.insert(customers).values({
            fullName: fullName ?? null,
            mobileE164,
            email,
            cityId,
            lastLoginAt: /* @__PURE__ */ new Date()
          }).returning();
        } catch (insertErr) {
          if (insertErr?.code === "23505") {
            return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0623\u0648 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
          }
          throw insertErr;
        }
      } else {
        await db.update(customers).set({ lastLoginAt: /* @__PURE__ */ new Date() }).where(eq(customers.customerId, existing.customerId));
        customer = existing;
      }
      const token = signToken(customer.customerId);
      res.json({ success: true, customer, token });
    } catch (err) {
      console.error("Verify OTP error:", err?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u062D\u0642\u0642" });
    }
  });
  app2.get("/api/customers/:id", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      if (req.params.id !== callerCustomerId) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      }
      const [customer] = await db.select().from(customers).where(eq(customers.customerId, req.params.id)).limit(1);
      if (!customer) return res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      res.json({ customer });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.patch("/api/customers/:id", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      if (req.params.id !== callerCustomerId) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      }
      const { fullName, cityId } = req.body;
      const [updated] = await db.update(customers).set({ ...fullName && { fullName }, ...cityId && { cityId } }).where(eq(customers.customerId, req.params.id)).returning();
      res.json({ success: true, customer: updated });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.get("/api/vendors", requireAdmin, async (_req, res) => {
    try {
      const result = await db.select().from(vendors).orderBy(vendors.createdAt);
      res.json({ vendors: result });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/vendors", requireAdmin, async (req, res) => {
    try {
      const { vendorName, legalName, crNumber, vatNumber } = req.body;
      if (!vendorName) return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0631\u062F \u0645\u0637\u0644\u0648\u0628" });
      const [vendor] = await db.insert(vendors).values({ vendorName, legalName, crNumber, vatNumber }).returning();
      res.json({ success: true, vendor });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.get("/api/vendor-users", requireAdmin, async (_req, res) => {
    try {
      const result = await db.select().from(vendorUsers).orderBy(vendorUsers.createdAt);
      res.json({ vendorUsers: result });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/vendor-users", requireAdmin, async (req, res) => {
    try {
      const { vendorId, fullName, mobileE164, email, whatsappE164, role } = req.body;
      if (!vendorId || !mobileE164 || !whatsappE164) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0648\u0631\u062F \u0648\u0627\u0644\u062C\u0648\u0627\u0644 \u0648\u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628 \u0645\u0637\u0644\u0648\u0628\u0629" });
      }
      const existing = await db.select().from(vendorUsers).where(and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.isWhatsappPrimary, true))).limit(1);
      const isFirst = existing.length === 0;
      const [vu] = await db.insert(vendorUsers).values({ vendorId, fullName, mobileE164, email, whatsappE164, isWhatsappPrimary: isFirst, role: role ?? "owner" }).returning();
      res.json({ success: true, vendorUser: vu });
    } catch (err) {
      if (err?.code === "23505") {
        return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0623\u0648 \u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628 \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
      }
      res.status(500).json({ error: err?.message });
    }
  });
  function generateInspectionNo() {
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const seq = Math.floor(1e5 + Math.random() * 9e5);
    return `INS-${year}-${seq}`;
  }
  app2.post("/api/laqit-inspections", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      const { customerId, carModelId, carYear, carType } = req.body;
      if (!customerId || !carModelId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0645\u064A\u0644 \u0648\u0627\u0644\u0645\u0648\u062F\u064A\u0644 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      }
      if (customerId !== callerCustomerId) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      }
      const [customer] = await db.select().from(customers).where(eq(customers.customerId, customerId)).limit(1);
      if (!customer) return res.status(404).json({ error: "\u0627\u0644\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      let inspectionNo = generateInspectionNo();
      let attempts = 0;
      while (attempts < 5) {
        const clash = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionNo, inspectionNo)).limit(1);
        if (clash.length === 0) break;
        inspectionNo = generateInspectionNo();
        attempts++;
      }
      const [inspection] = await db.insert(laqitInspections).values({
        inspectionNo,
        customerId,
        cityId: customer.cityId,
        carModelId,
        carYear: carYear ? Number(carYear) : null,
        carType: carType ?? null,
        status: "draft"
      }).returning();
      res.json({ success: true, inspection });
    } catch (err) {
      console.error("Create inspection error:", err?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0641\u062D\u0635" });
    }
  });
  app2.get("/api/laqit-inspections/customer/:customerId", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      if (req.params.customerId !== callerCustomerId) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      }
      const rows = await db.select().from(laqitInspections).where(eq(laqitInspections.customerId, req.params.customerId)).orderBy(desc(laqitInspections.createdAt));
      const uniqueModelIds = [...new Set(rows.map((r) => r.carModelId))];
      const modelRows = uniqueModelIds.length > 0 ? await db.select().from(carModels).where(inArray(carModels.carModelId, uniqueModelIds)) : [];
      const uniqueMakeIds = [...new Set(modelRows.map((m) => m.makeId))];
      const makeRows = uniqueMakeIds.length > 0 ? await db.select().from(carMakes).where(inArray(carMakes.makeId, uniqueMakeIds)) : [];
      const modelMap = {};
      modelRows.forEach((m) => {
        modelMap[m.carModelId] = { modelName: m.modelName, makeId: m.makeId };
      });
      const makeMap = {};
      makeRows.forEach((m) => {
        makeMap[m.makeId] = m.makeName;
      });
      const enriched = rows.map((r) => ({
        ...r,
        modelName: modelMap[r.carModelId]?.modelName ?? null,
        makeName: makeMap[modelMap[r.carModelId]?.makeId ?? ""] ?? null
      }));
      res.json({ inspections: enriched });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.get("/api/laqit-inspections/:id", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, req.params.id)).limit(1);
      if (!inspection) return res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      if (inspection.customerId !== callerCustomerId) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      }
      const media = await db.select().from(inspectionMedia).where(eq(inspectionMedia.inspectionId, req.params.id));
      const parts = await db.select().from(inspectionParts).where(eq(inspectionParts.inspectionId, req.params.id));
      const quotesList = await db.select().from(quotes).where(eq(quotes.inspectionId, req.params.id)).orderBy(desc(quotes.createdAt));
      res.json({ inspection, media, parts, quotes: quotesList });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/laqit-inspections/:id/media", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, req.params.id)).limit(1);
      if (!inspection) return res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      if (inspection.customerId !== callerCustomerId) return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      const { fileUrl, mediaType } = req.body;
      if (!fileUrl || !mediaType) {
        return res.status(400).json({ error: "fileUrl \u0648 mediaType \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      }
      const [media] = await db.insert(inspectionMedia).values({ inspectionId: req.params.id, fileUrl, mediaType }).returning();
      res.json({ success: true, media });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/laqit-inspections/:id/parts", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, req.params.id)).limit(1);
      if (!inspection) return res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      if (inspection.customerId !== callerCustomerId) return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      const { parts: partsList } = req.body;
      if (!Array.isArray(partsList) || partsList.length === 0) {
        return res.status(400).json({ error: "\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0642\u0637\u0639 \u0645\u0637\u0644\u0648\u0628\u0629" });
      }
      const inserted = await db.insert(inspectionParts).values(
        partsList.map((p) => ({
          inspectionId: req.params.id,
          partName: p.partName,
          quantity: p.quantity ?? 1,
          source: p.source ?? "user"
        }))
      ).returning();
      res.json({ success: true, parts: inserted });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.patch("/api/laqit-inspections/:id/status", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, req.params.id)).limit(1);
      if (!inspection) return res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      if (inspection.customerId !== callerCustomerId) return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      const { status } = req.body;
      if (typeof status !== "string" || !inspectionStatusEnum.enumValues.includes(status)) {
        return res.status(400).json({ error: "\u062D\u0627\u0644\u0629 \u063A\u064A\u0631 \u0635\u0627\u0644\u062D\u0629" });
      }
      if (status !== "cancelled") {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D \u0628\u062A\u0639\u064A\u064A\u0646 \u0647\u0630\u0647 \u0627\u0644\u062D\u0627\u0644\u0629" });
      }
      if (inspection.status === "cancelled") {
        return res.json({ success: true, inspection });
      }
      const CUSTOMER_CANCELLABLE_FROM = ["draft", "rfq_sent", "waiting_quotes", "quotes_received"];
      if (!CUSTOMER_CANCELLABLE_FROM.includes(inspection.status)) {
        return res.status(409).json({ error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0637\u0644\u0628 \u0641\u064A \u0647\u0630\u0647 \u0627\u0644\u0645\u0631\u062D\u0644\u0629" });
      }
      const [updated] = await db.update(laqitInspections).set({ status: "cancelled", updatedAt: /* @__PURE__ */ new Date() }).where(eq(laqitInspections.inspectionId, req.params.id)).returning();
      res.json({ success: true, inspection: updated });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/laqit-inspections/:id/submit", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      const inspectionId = req.params.id;
      const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, inspectionId)).limit(1);
      if (!inspection) return res.status(404).json({ error: "\u0627\u0644\u0641\u062D\u0635 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      if (inspection.customerId !== callerCustomerId) return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      const claimed = await db.update(laqitInspections).set({ status: "rfq_sent", updatedAt: /* @__PURE__ */ new Date() }).where(
        and(
          eq(laqitInspections.inspectionId, inspectionId),
          eq(laqitInspections.status, "draft")
        )
      ).returning();
      if (claimed.length === 0) {
        return res.status(409).json({ error: "\u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0645\u0646 \u0642\u0628\u0644" });
      }
      const locationRows = await db.select({ vendorId: vendorLocations.vendorId }).from(vendorLocations).where(eq(vendorLocations.cityId, inspection.cityId));
      const cityVendorIds = locationRows.map((r) => r.vendorId);
      if (cityVendorIds.length === 0) {
        return res.json({ success: true, vendorsNotified: 0, message: "\u0644\u0627 \u064A\u0648\u062C\u062F \u0645\u0648\u0631\u062F\u0648\u0646 \u0641\u064A \u0645\u062F\u064A\u0646\u062A\u0643 \u0628\u0639\u062F" });
      }
      const modelRows = await db.select({ vendorId: vendorSupportedModels.vendorId }).from(vendorSupportedModels).where(
        and(
          eq(vendorSupportedModels.carModelId, inspection.carModelId),
          inArray(vendorSupportedModels.vendorId, cityVendorIds)
        )
      );
      const eligibleVendorIds = modelRows.map((r) => r.vendorId);
      const parts = await db.select().from(inspectionParts).where(eq(inspectionParts.inspectionId, inspectionId));
      const partsText = parts.map((p) => `- ${p.partName} (${p.quantity})`).join("\n");
      let vendorsNotified = 0;
      for (const vendorId of eligibleVendorIds) {
        const [primaryUser] = await db.select().from(vendorUsers).where(
          and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.isWhatsappPrimary, true))
        ).limit(1);
        if (!primaryUser) continue;
        const rfqText = `\u0637\u0644\u0628 \u0639\u0631\u0636 \u0633\u0639\u0631 - \u0644\u0627\u0642\u0637
\u0631\u0642\u0645 \u0627\u0644\u0641\u062D\u0635: ${inspection.inspectionNo}
\u0627\u0644\u0645\u0648\u062F\u064A\u0644: ${inspection.carModelId}
\u0627\u0644\u0633\u0646\u0629: ${inspection.carYear ?? "\u063A\u064A\u0631 \u0645\u062D\u062F\u062F"}

\u0627\u0644\u0642\u0637\u0639 \u0627\u0644\u0645\u0637\u0644\u0648\u0628\u0629:
${partsText}

\u0644\u0644\u0631\u062F: \u0623\u0631\u0633\u0644 \u0631\u0642\u0645 \u0627\u0644\u0641\u062D\u0635 ${inspection.inspectionNo} \u0645\u0639 \u0635\u0648\u0631\u0629 \u0639\u0631\u0636 \u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A`;
        const rfqDoc = await db.select().from(rfqDocuments).where(eq(rfqDocuments.inspectionId, inspectionId)).limit(1);
        const sendResult = await sendWhatsAppMessage(
          primaryUser.whatsappE164,
          rfqText,
          rfqDoc[0]?.pdfUrl,
          inspectionId
        );
        await db.insert(rfqRecipients).values({
          inspectionId,
          vendorId,
          vendorUserId: primaryUser.vendorUserId,
          channel: "whatsapp",
          status: sendResult.success ? "sent" : "failed",
          providerMessageId: sendResult.providerMessageId ?? null,
          sentAt: sendResult.success ? /* @__PURE__ */ new Date() : null
        });
        if (sendResult.success) vendorsNotified++;
      }
      res.json({ success: true, vendorsNotified });
    } catch (err) {
      console.error("Submit RFQ error:", err?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u0639\u0631\u0636" });
    }
  });
  app2.post("/api/webhooks/whatsapp", async (req, res) => {
    try {
      const body = req.body;
      if (req.method === "GET" && req.query["hub.mode"] === "subscribe") {
        const challenge = req.query["hub.challenge"];
        return res.send(challenge);
      }
      const whatsappWebhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
      if (whatsappWebhookSecret) {
        const sigHeader = req.headers["x-hub-signature-256"];
        if (!sigHeader) {
          console.warn("WhatsApp webhook: missing x-hub-signature-256 header \u2014 rejecting");
          return res.sendStatus(401);
        }
        const rawBody = req.rawBody;
        if (!rawBody) {
          console.warn("WhatsApp webhook: raw body unavailable \u2014 rejecting");
          return res.sendStatus(400);
        }
        const expected = "sha256=" + createHmac2("sha256", whatsappWebhookSecret).update(rawBody).digest("hex");
        const expectedBuf = Buffer.from(expected, "utf-8");
        const actualBuf = Buffer.from(sigHeader, "utf-8");
        if (expectedBuf.length !== actualBuf.length || !timingSafeEqual2(expectedBuf, actualBuf)) {
          console.warn("WhatsApp webhook: signature mismatch \u2014 rejecting");
          return res.sendStatus(401);
        }
      } else {
        if (process.env.NODE_ENV !== "development") {
          console.error("WhatsApp webhook: WHATSAPP_WEBHOOK_SECRET not set in production \u2014 rejecting unsigned request");
          return res.sendStatus(401);
        }
        console.warn("WhatsApp webhook: WHATSAPP_WEBHOOK_SECRET not set \u2014 skipping signature verification (development mode only)");
      }
      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];
      if (!message) return res.sendStatus(200);
      const fromE164 = `+${message.from}`;
      const textBody = message?.text?.body ?? "";
      const mediaUrl = message?.image?.link ?? message?.document?.link;
      const providerMessageId = message.id ?? void 0;
      const [vendorUser] = await db.select().from(vendorUsers).where(eq(vendorUsers.whatsappE164, fromE164)).limit(1);
      const match = textBody.match(/INS-\d{4}-\d{6}/i);
      const inspectionNoExtracted = match ? match[0].toUpperCase() : null;
      let inspectionId = null;
      let linkedInspection;
      if (inspectionNoExtracted) {
        const [found] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionNo, inspectionNoExtracted)).limit(1);
        if (found) {
          linkedInspection = found;
          inspectionId = found.inspectionId;
        }
      }
      await db.insert(whatsappMessages).values({
        direction: "inbound",
        vendorId: vendorUser?.vendorId ?? null,
        vendorUserId: vendorUser?.vendorUserId ?? null,
        vendorWhatsappE164: fromE164,
        inspectionId,
        inspectionNoExtracted,
        textBody: textBody || null,
        mediaUrl: mediaUrl ?? null,
        providerMessageId: providerMessageId ?? null,
        receivedAt: /* @__PURE__ */ new Date()
      });
      if (!inspectionNoExtracted || !linkedInspection) {
        if (vendorUser) {
          await sendWhatsAppMessage(
            fromE164,
            "\u0634\u0643\u0631\u0627\u064B \u0644\u0643. \u0644\u0645 \u0646\u062A\u0645\u0643\u0646 \u0645\u0646 \u0631\u0628\u0637 \u0631\u0633\u0627\u0644\u062A\u0643 \u0628\u0641\u062D\u0635. \u064A\u0631\u062C\u0649 \u0625\u0631\u0633\u0627\u0644 \u0631\u0642\u0645 \u0627\u0644\u0641\u062D\u0635 (\u0645\u062B\u0627\u0644: INS-2026-123456) \u0645\u0639 \u0635\u0648\u0631\u0629 \u0639\u0631\u0636 \u0627\u0644\u0633\u0639\u0631.",
            void 0
          );
        }
        return res.sendStatus(200);
      }
      if (mediaUrl && vendorUser) {
        const [rfqEntry] = await db.select({ rfqRecipientId: rfqRecipients.rfqRecipientId }).from(rfqRecipients).where(
          and(
            eq(rfqRecipients.inspectionId, linkedInspection.inspectionId),
            eq(rfqRecipients.vendorId, vendorUser.vendorId)
          )
        ).limit(1);
        if (!rfqEntry) {
          console.warn(
            `WhatsApp webhook: vendor ${vendorUser.vendorId} not an RFQ recipient for inspection ${linkedInspection.inspectionNo} \u2014 ignoring quote`
          );
          return res.sendStatus(200);
        }
        const ocrResult = await extractTotalPrice(mediaUrl);
        await db.insert(quotes).values({
          inspectionId: linkedInspection.inspectionId,
          vendorId: vendorUser.vendorId,
          vendorUserId: vendorUser.vendorUserId,
          quoteImageUrl: mediaUrl,
          totalAmount: ocrResult.totalAmount !== null ? String(ocrResult.totalAmount) : null,
          currency: ocrResult.currency,
          status: ocrResult.totalAmount !== null ? "parsed" : "unparsed",
          ocrRawText: ocrResult.rawText
        });
        if (linkedInspection.status === "rfq_sent" || linkedInspection.status === "waiting_quotes") {
          await db.update(laqitInspections).set({ status: "quotes_received", updatedAt: /* @__PURE__ */ new Date() }).where(eq(laqitInspections.inspectionId, linkedInspection.inspectionId));
        }
        const [customer] = await db.select().from(customers).where(eq(customers.customerId, linkedInspection.customerId)).limit(1);
        if (customer) {
          const smsText = ocrResult.totalAmount ? `\u0644\u0642\u064A\u062A - \u0648\u0635\u0644 \u0639\u0631\u0636 \u0633\u0639\u0631 \u062C\u062F\u064A\u062F \u0644\u0641\u062D\u0635 ${linkedInspection.inspectionNo}: ${ocrResult.totalAmount} ${ocrResult.currency}. \u0627\u0641\u062A\u062D \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0639\u0631\u0648\u0636.` : `\u0644\u0642\u064A\u062A - \u0648\u0635\u0644 \u0639\u0631\u0636 \u0633\u0639\u0631 \u062C\u062F\u064A\u062F \u0644\u0641\u062D\u0635 ${linkedInspection.inspectionNo}. \u0627\u0641\u062A\u062D \u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0644\u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0639\u0631\u0648\u0636.`;
          await sendSms(customer.mobileE164, smsText);
          await db.insert(notifications).values({
            recipientType: "customer",
            customerId: customer.customerId,
            channel: "sms",
            status: "sent",
            inspectionId: linkedInspection.inspectionId,
            body: smsText,
            sentAt: /* @__PURE__ */ new Date()
          });
        }
      }
      res.sendStatus(200);
    } catch (err) {
      console.error("WhatsApp webhook error:", err?.message);
      res.sendStatus(200);
    }
  });
  app2.get("/api/laqit-inspections/:id/quotes", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, req.params.id)).limit(1);
      if (!inspection) return res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      if (inspection.customerId !== callerCustomerId) return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      const quotesList = await db.select().from(quotes).where(eq(quotes.inspectionId, req.params.id)).orderBy(desc(quotes.createdAt));
      const enriched = await Promise.all(
        quotesList.map(async (q) => {
          const [vendor] = await db.select().from(vendors).where(eq(vendors.vendorId, q.vendorId)).limit(1);
          return { ...q, vendorName: vendor?.vendorName ?? "" };
        })
      );
      res.json({ quotes: enriched });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.get("/api/quotes/:quoteId", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      const [quote] = await db.select().from(quotes).where(eq(quotes.quoteId, req.params.quoteId)).limit(1);
      if (!quote) return res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const [insp] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, quote.inspectionId)).limit(1);
      if (!insp || insp.customerId !== callerCustomerId) return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      const [vendor] = await db.select().from(vendors).where(eq(vendors.vendorId, quote.vendorId)).limit(1);
      res.json({ quote: { ...quote, vendorName: vendor?.vendorName ?? "" } });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/laqit-inspections/:id/quotes/:quoteId/accept", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      const { id: inspectionId, quoteId } = req.params;
      const [insp] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, inspectionId)).limit(1);
      if (!insp) return res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      if (insp.customerId !== callerCustomerId) return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      const lockedStatuses = [
        "payment_pending",
        "paid",
        "cancelled",
        "vendor_notified",
        "ready_for_pickup",
        "closed"
      ];
      if (lockedStatuses.includes(insp.status)) {
        return res.status(409).json({ error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0639\u0631\u0636 \u0628\u0639\u062F \u0628\u062F\u0621 \u0627\u0644\u062F\u0641\u0639 \u0623\u0648 \u0627\u0643\u062A\u0645\u0627\u0644\u0647" });
      }
      const [activePayment] = await db.select().from(payments).where(
        and(
          eq(payments.inspectionId, inspectionId),
          inArray(payments.status, ["initiated", "captured"])
        )
      ).limit(1);
      if (activePayment) {
        return res.status(409).json({ error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u0639\u0631\u0636 \u0628\u0639\u062F \u0628\u062F\u0621 \u0627\u0644\u062F\u0641\u0639 \u0623\u0648 \u0627\u0643\u062A\u0645\u0627\u0644\u0647" });
      }
      const [targetQuote] = await db.select().from(quotes).where(and(eq(quotes.quoteId, quoteId), eq(quotes.inspectionId, inspectionId))).limit(1);
      if (!targetQuote) return res.status(404).json({ error: "\u0627\u0644\u0639\u0631\u0636 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u0644\u0627 \u064A\u0646\u062A\u0645\u064A \u0644\u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628" });
      const allQuotes = await db.select().from(quotes).where(eq(quotes.inspectionId, inspectionId));
      for (const q of allQuotes) {
        if (q.quoteId !== quoteId) {
          await db.update(quotes).set({ status: "rejected" }).where(and(eq(quotes.quoteId, q.quoteId), eq(quotes.inspectionId, inspectionId)));
        }
      }
      await db.update(quotes).set({ status: "accepted", acceptedAt: /* @__PURE__ */ new Date() }).where(and(eq(quotes.quoteId, quoteId), eq(quotes.inspectionId, inspectionId)));
      await db.update(laqitInspections).set({ status: "quote_accepted", updatedAt: /* @__PURE__ */ new Date() }).where(eq(laqitInspections.inspectionId, inspectionId));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/payments", requireCustomer, async (req, res) => {
    try {
      const callerCustomerId = res.locals.customerId;
      const { inspectionId, quoteId, customerId } = req.body;
      if (!inspectionId || !quoteId || !customerId) {
        return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u0641\u0639 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629" });
      }
      if (customerId !== callerCustomerId) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      }
      const [insp] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, inspectionId)).limit(1);
      if (!insp || insp.customerId !== callerCustomerId) {
        return res.status(403).json({ error: "\u063A\u064A\u0631 \u0645\u0633\u0645\u0648\u062D" });
      }
      const [quote] = await db.select().from(quotes).where(and(eq(quotes.quoteId, quoteId), eq(quotes.inspectionId, inspectionId))).limit(1);
      if (!quote) return res.status(404).json({ error: "\u0627\u0644\u0639\u0631\u0636 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0623\u0648 \u0644\u0627 \u064A\u0646\u062A\u0645\u064A \u0644\u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628" });
      if (quote.status !== "accepted") {
        return res.status(400).json({ error: "\u0644\u0627 \u064A\u0645\u0643\u0646 \u0627\u0644\u062F\u0641\u0639 \u0625\u0644\u0627 \u0644\u0644\u0639\u0631\u0636 \u0627\u0644\u0645\u0642\u0628\u0648\u0644" });
      }
      const amount = parseFloat(quote.totalAmount ?? "0");
      const intent = await createPaymentIntent(amount, quote.currency, {
        inspectionId,
        quoteId,
        customerId
      });
      let payment;
      try {
        payment = await db.transaction(async (tx) => {
          const [inserted] = await tx.insert(payments).values({
            inspectionId,
            quoteId,
            customerId,
            amount: String(amount),
            currency: quote.currency,
            status: "initiated",
            gateway: "stripe",
            gatewayRef: intent.id
          }).returning();
          await tx.update(laqitInspections).set({ status: "payment_pending", updatedAt: /* @__PURE__ */ new Date() }).where(eq(laqitInspections.inspectionId, inspectionId));
          return inserted;
        });
      } catch (insertErr) {
        if (insertErr?.code === "23505") {
          return res.status(409).json({ error: "\u064A\u0648\u062C\u062F \u062F\u0641\u0639 \u0646\u0634\u0637 \u0644\u0647\u0630\u0627 \u0627\u0644\u0637\u0644\u0628 \u0628\u0627\u0644\u0641\u0639\u0644" });
        }
        throw insertErr;
      }
      res.json({ success: true, payment, clientSecret: intent.clientSecret });
    } catch (err) {
      console.error("Create payment error:", err?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062F\u0641\u0639" });
    }
  });
  app2.post("/api/webhooks/payment", async (req, res) => {
    try {
      const paymentWebhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
      if (paymentWebhookSecret) {
        const sigHeader = req.headers["stripe-signature"];
        if (!sigHeader) {
          console.warn("Payment webhook: missing stripe-signature header \u2014 rejecting");
          return res.sendStatus(401);
        }
        const rawBody = req.rawBody;
        if (!rawBody) {
          console.warn("Payment webhook: raw body unavailable \u2014 rejecting");
          return res.sendStatus(400);
        }
        const parts = {};
        for (const part of sigHeader.split(",")) {
          const [k, v] = part.split("=");
          if (k && v) parts[k.trim()] = v.trim();
        }
        const timestamp2 = parts["t"];
        const v1Signature = parts["v1"];
        if (!timestamp2 || !v1Signature) {
          console.warn("Payment webhook: malformed stripe-signature header \u2014 rejecting");
          return res.sendStatus(401);
        }
        const tsDiff = Math.abs(Date.now() / 1e3 - parseInt(timestamp2, 10));
        if (tsDiff > 300) {
          console.warn(`Payment webhook: timestamp too old (${tsDiff}s) \u2014 rejecting`);
          return res.sendStatus(401);
        }
        const signedPayload = `${timestamp2}.${rawBody.toString("utf-8")}`;
        const expected = createHmac2("sha256", paymentWebhookSecret).update(signedPayload).digest("hex");
        const expectedBuf = Buffer.from(expected, "hex");
        const actualBuf = Buffer.from(v1Signature, "hex");
        if (expectedBuf.length !== actualBuf.length || !timingSafeEqual2(expectedBuf, actualBuf)) {
          console.warn("Payment webhook: signature mismatch \u2014 rejecting");
          return res.sendStatus(401);
        }
      } else {
        if (process.env.NODE_ENV !== "development") {
          console.error("Payment webhook: PAYMENT_WEBHOOK_SECRET not set in production \u2014 rejecting unsigned request");
          return res.sendStatus(401);
        }
        console.warn("Payment webhook: PAYMENT_WEBHOOK_SECRET not set \u2014 skipping signature verification (development mode only)");
      }
      const event = req.body;
      const eventType = event?.type ?? event?.status ?? "";
      if (eventType === "payment_intent.succeeded" || eventType === "captured") {
        const gatewayRef = event?.data?.object?.id ?? event?.gatewayRef ?? "";
        if (!gatewayRef) return res.sendStatus(200);
        const [payment] = await db.select().from(payments).where(eq(payments.gatewayRef, gatewayRef)).limit(1);
        if (!payment) return res.sendStatus(200);
        if (payment.status === "captured") return res.sendStatus(200);
        const [webhookInsp] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, payment.inspectionId)).limit(1);
        if (!webhookInsp || webhookInsp.status !== "payment_pending") return res.sendStatus(200);
        const [paymentQuote] = await db.select().from(quotes).where(and(eq(quotes.quoteId, payment.quoteId), eq(quotes.inspectionId, payment.inspectionId))).limit(1);
        if (!paymentQuote || paymentQuote.status !== "accepted") {
          console.warn(`Payment webhook: quote ${payment.quoteId} is no longer accepted \u2014 skipping paid transition`);
          return res.sendStatus(200);
        }
        await db.update(payments).set({ status: "captured", paidAt: /* @__PURE__ */ new Date() }).where(eq(payments.paymentId, payment.paymentId));
        await db.update(laqitInspections).set({ status: "paid", updatedAt: /* @__PURE__ */ new Date() }).where(eq(laqitInspections.inspectionId, payment.inspectionId));
        const [acceptedQuote] = await db.select().from(quotes).where(eq(quotes.quoteId, payment.quoteId)).limit(1);
        if (acceptedQuote) {
          const [primaryUser] = await db.select().from(vendorUsers).where(
            and(
              eq(vendorUsers.vendorId, acceptedQuote.vendorId),
              eq(vendorUsers.isWhatsappPrimary, true)
            )
          ).limit(1);
          if (primaryUser) {
            const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, payment.inspectionId)).limit(1);
            if (inspection) {
              const msg = `\u0644\u0642\u064A\u062A - \u062A\u0645 \u0627\u0644\u062F\u0641\u0639 \u0644\u0641\u062D\u0635 \u0631\u0642\u0645 ${inspection.inspectionNo}. \u064A\u0631\u062C\u0649 \u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0642\u0637\u0639 \u0644\u0644\u0627\u0633\u062A\u0644\u0627\u0645. \u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0639\u0627\u0645\u0644\u0643\u0645 \u0645\u0639\u0646\u0627.`;
              await sendWhatsAppMessage(
                primaryUser.whatsappE164,
                msg,
                void 0,
                payment.inspectionId
              );
              await db.insert(notifications).values({
                recipientType: "vendor",
                vendorUserId: primaryUser.vendorUserId,
                channel: "whatsapp",
                status: "sent",
                inspectionId: payment.inspectionId,
                body: msg,
                sentAt: /* @__PURE__ */ new Date()
              });
            }
          }
        }
      }
      res.sendStatus(200);
    } catch (err) {
      console.error("Payment webhook error:", err?.message);
      res.sendStatus(200);
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/seed.ts
import { eq as eq2 } from "drizzle-orm";
import { pathToFileURL } from "url";
async function seedReferenceData() {
  console.log("Seeding reference data...");
  const cityData = [
    { nameAr: "\u0627\u0644\u0631\u064A\u0627\u0636", nameEn: "Riyadh" },
    { nameAr: "\u062C\u062F\u0629", nameEn: "Jeddah" },
    { nameAr: "\u0627\u0644\u062F\u0645\u0627\u0645", nameEn: "Dammam" },
    { nameAr: "\u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u0646\u0648\u0631\u0629", nameEn: "Medina" },
    { nameAr: "\u0645\u0643\u0629 \u0627\u0644\u0645\u0643\u0631\u0645\u0629", nameEn: "Mecca" },
    { nameAr: "\u0627\u0644\u062E\u0628\u0631", nameEn: "Khobar" },
    { nameAr: "\u062A\u0628\u0648\u0643", nameEn: "Tabuk" },
    { nameAr: "\u0623\u0628\u0647\u0627", nameEn: "Abha" },
    { nameAr: "\u0627\u0644\u0642\u0635\u064A\u0645", nameEn: "Qassim" },
    { nameAr: "\u062D\u0627\u0626\u0644", nameEn: "Hail" }
  ];
  const insertedCities = await db.insert(cities).values(cityData.map((c) => ({ nameAr: c.nameAr, nameEn: c.nameEn, countryCode: "SA" }))).onConflictDoNothing().returning();
  const allCities = await db.select().from(cities);
  console.log(`Cities: ${allCities.length} rows`);
  const makesData = [
    { makeName: "Toyota", nameAr: "\u062A\u0648\u064A\u0648\u062A\u0627" },
    { makeName: "Honda", nameAr: "\u0647\u0648\u0646\u062F\u0627" },
    { makeName: "Nissan", nameAr: "\u0646\u064A\u0633\u0627\u0646" },
    { makeName: "Hyundai", nameAr: "\u0647\u064A\u0648\u0646\u062F\u0627\u064A" },
    { makeName: "Kia", nameAr: "\u0643\u064A\u0627" },
    { makeName: "Renault", nameAr: "\u0631\u064A\u0646\u0648" },
    { makeName: "Mercedes-Benz", nameAr: "\u0645\u0631\u0633\u064A\u062F\u0633 \u0628\u0646\u0632" },
    { makeName: "BMW", nameAr: "\u0628\u064A \u0625\u0645 \u062F\u0628\u0644\u064A\u0648" },
    { makeName: "Lexus", nameAr: "\u0644\u0643\u0632\u0633" },
    { makeName: "Chevrolet", nameAr: "\u0634\u064A\u0641\u0631\u0648\u0644\u064A\u0647" },
    { makeName: "Ford", nameAr: "\u0641\u0648\u0631\u062F" },
    { makeName: "GMC", nameAr: "\u062C\u064A \u0625\u0645 \u0633\u064A" },
    { makeName: "Audi", nameAr: "\u0623\u0648\u062F\u064A" },
    { makeName: "Mitsubishi", nameAr: "\u0645\u064A\u062A\u0633\u0648\u0628\u064A\u0634\u064A" },
    { makeName: "Cadillac", nameAr: "\u0643\u0627\u062F\u064A\u0644\u0627\u0643" },
    { makeName: "Land Rover", nameAr: "\u0644\u0627\u0646\u062F \u0631\u0648\u0641\u0631" },
    { makeName: "Jeep", nameAr: "\u062C\u064A\u0628" },
    { makeName: "Infiniti", nameAr: "\u0625\u0646\u0641\u064A\u0646\u064A\u062A\u064A" },
    { makeName: "Volkswagen", nameAr: "\u0641\u0648\u0644\u0643\u0633 \u0648\u0627\u062C\u0646" },
    { makeName: "Mazda", nameAr: "\u0645\u0627\u0632\u062F\u0627" },
    { makeName: "Dodge", nameAr: "\u062F\u0648\u062F\u062C" },
    { makeName: "RAM", nameAr: "\u0631\u0627\u0645" },
    { makeName: "Suzuki", nameAr: "\u0633\u0648\u0632\u0648\u0643\u064A" },
    { makeName: "MG", nameAr: "\u0625\u0645 \u062C\u064A" },
    { makeName: "Porsche", nameAr: "\u0628\u0648\u0631\u0634\u0647" },
    { makeName: "Volvo", nameAr: "\u0641\u0648\u0644\u0641\u0648" },
    { makeName: "Lincoln", nameAr: "\u0644\u064A\u0646\u0643\u0648\u0644\u0646" },
    // ── Korean ────────────────────────────────────────────────────────────────
    { makeName: "Genesis", nameAr: "\u062C\u064A\u0646\u064A\u0633\u064A\u0633" },
    // ── Japanese ──────────────────────────────────────────────────────────────
    { makeName: "Subaru", nameAr: "\u0633\u0648\u0628\u0627\u0631\u0648" },
    { makeName: "Isuzu", nameAr: "\u0625\u064A\u0633\u0648\u0632\u0648" },
    // ── Chinese ───────────────────────────────────────────────────────────────
    { makeName: "BYD", nameAr: "\u0628\u064A \u0648\u0627\u064A \u062F\u064A" },
    { makeName: "Geely", nameAr: "\u062C\u064A\u0644\u064A" },
    { makeName: "Chery", nameAr: "\u0634\u064A\u0631\u064A" },
    { makeName: "Haval", nameAr: "\u0647\u0627\u0641\u0627\u0644" },
    { makeName: "Changan", nameAr: "\u0634\u0627\u0646\u063A\u0627\u0646" },
    { makeName: "JETOUR", nameAr: "\u062C\u064A\u062A\u0648\u0631" },
    { makeName: "GAC", nameAr: "\u062C\u0627\u0643" },
    { makeName: "Exeed", nameAr: "\u0625\u0643\u0633\u064A\u062F" }
  ];
  for (const m of makesData) {
    await db.insert(carMakes).values({ makeName: m.makeName, nameAr: m.nameAr }).onConflictDoNothing();
    await db.update(carMakes).set({ nameAr: m.nameAr }).where(eq2(carMakes.makeName, m.makeName));
  }
  const allMakes = await db.select().from(carMakes);
  console.log(`Car makes: ${allMakes.length} rows`);
  const makeMap = {};
  allMakes.forEach((m) => makeMap[m.makeName] = m.makeId);
  const modelsData = [
    { make: "Toyota", models: ["Camry", "Corolla", "Land Cruiser", "Hilux", "RAV4", "Yaris", "Prado", "Rush", "FJ Cruiser", "Fortuner"] },
    { make: "Honda", models: ["Accord", "Civic", "CR-V", "Pilot", "Odyssey", "HR-V"] },
    { make: "Nissan", models: ["Altima", "Patrol", "Sentra", "Pathfinder", "X-Trail", "Sunny", "Navara", "Kicks", "Xterra"] },
    { make: "Hyundai", models: ["Elantra", "Sonata", "Tucson", "Accent", "Santa Fe", "Creta", "Palisade", "i10", "i20", "i30", "Azera", "Staria"] },
    { make: "Kia", models: ["Sportage", "Optima", "Sorento", "Picanto", "Cerato", "Carnival", "Telluride", "Stinger"] },
    { make: "Renault", models: ["Duster", "Logan", "Symbol", "Megane", "Fluence", "Koleos", "Captur", "Sandero"] },
    { make: "Mercedes-Benz", models: ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLS", "A-Class", "CLA", "G-Class"] },
    { make: "BMW", models: ["3 Series", "5 Series", "7 Series", "X3", "X5", "X6", "X7", "M3", "M5"] },
    { make: "Lexus", models: ["LX", "GX", "RX", "ES", "IS", "LS", "NX", "UX"] },
    { make: "Chevrolet", models: ["Malibu", "Tahoe", "Suburban", "Silverado", "Captiva", "TrailBlazer", "Spark"] },
    { make: "Ford", models: ["F-150", "Explorer", "Expedition", "Ranger", "Bronco", "Edge", "Mustang", "Escape", "Fusion", "Taurus", "Transit", "Everest"] },
    { make: "GMC", models: ["Yukon", "Sierra", "Terrain", "Acadia", "Suburban", "Canyon"] },
    { make: "Audi", models: ["A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron"] },
    { make: "Mitsubishi", models: ["Pajero", "L200", "Eclipse Cross", "ASX", "Outlander", "Attrage"] },
    { make: "Cadillac", models: ["Escalade", "Escalade ESV", "CT5", "XT5", "XT6"] },
    { make: "Land Rover", models: ["Range Rover", "Range Rover Sport", "Range Rover Evoque", "Defender", "Discovery", "Discovery Sport"] },
    { make: "Jeep", models: ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Renegade", "Gladiator"] },
    { make: "Infiniti", models: ["QX80", "QX60", "QX50", "Q50", "Q60", "QX30"] },
    { make: "Volkswagen", models: ["Passat", "Tiguan", "Golf", "Touareg", "Polo", "Jetta"] },
    { make: "Mazda", models: ["CX-5", "CX-9", "Mazda3", "Mazda6", "CX-3", "BT-50"] },
    { make: "Dodge", models: ["Charger", "Challenger", "Durango", "Journey"] },
    { make: "RAM", models: ["1500", "2500", "3500", "ProMaster"] },
    { make: "Suzuki", models: ["Vitara", "Swift", "Jimny", "Ertiga", "Baleno", "Ciaz"] },
    { make: "MG", models: ["MG5", "MG6", "HS", "ZS", "RX5", "T60"] },
    { make: "Porsche", models: ["Cayenne", "Macan", "Panamera", "911", "Taycan"] },
    { make: "Volvo", models: ["XC90", "XC60", "XC40", "S90", "S60", "V90"] },
    { make: "Lincoln", models: ["Navigator", "Aviator", "Nautilus", "Corsair", "Continental"] },
    // ── Korean ────────────────────────────────────────────────────────────────
    { make: "Genesis", models: ["G70", "G80", "G90", "GV70", "GV80", "GV60"] },
    // ── Japanese ──────────────────────────────────────────────────────────────
    { make: "Subaru", models: ["Outback", "Forester", "XV", "Impreza", "Legacy", "BRZ"] },
    { make: "Isuzu", models: ["D-Max", "MU-X", "Trooper", "Elf"] },
    // ── Chinese ───────────────────────────────────────────────────────────────
    { make: "BYD", models: ["Seal", "Atto 3", "Han", "Tang", "Song Plus", "Dolphin", "Seal U", "Sea Lion 6"] },
    { make: "Geely", models: ["Coolray", "Tugella", "Okavango", "Preface", "Monjaro", "Emgrand"] },
    { make: "Chery", models: ["Tiggo 4 Pro", "Tiggo 7 Pro", "Tiggo 8 Pro", "Arrizo 6 Pro", "Arrizo 8"] },
    { make: "Haval", models: ["H6", "Jolion", "H2", "Dargo", "Big Dog", "Raptor"] },
    { make: "Changan", models: ["CS35 Plus", "CS55 Plus", "CS75 Plus", "Alsvin", "Uni-K", "Uni-T", "Hunter"] },
    { make: "JETOUR", models: ["X70 Plus", "X90 Plus", "Dashing", "T2", "X70S", "Traveler"] },
    { make: "GAC", models: ["GS3", "GS4", "GS8", "GA4", "Trumpchi GS4", "Emkoo"] },
    { make: "Exeed", models: ["TXL", "VX", "RX", "LX", "Sterra ES", "Sterra ET"] }
  ];
  const modelInserts = [];
  for (const entry of modelsData) {
    const makeId = makeMap[entry.make];
    if (!makeId) continue;
    for (const model of entry.models) {
      modelInserts.push({ makeId, modelName: model });
    }
  }
  await db.insert(carModels).values(modelInserts).onConflictDoNothing();
  const allModels = await db.select().from(carModels);
  console.log(`Car models: ${allModels.length} rows`);
  const modelMap = {};
  allModels.forEach((m) => modelMap[`${m.makeId}:${m.modelName}`] = m.carModelId);
  const agentsData = [
    { makeName: "Toyota", agentNameEn: "Abdul Latif Jameel Motors", agentNameAr: "\u0639\u0628\u062F \u0627\u0644\u0644\u0637\u064A\u0641 \u062C\u0645\u064A\u0644 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "toyota.com.sa", phone: "920000655", headquartersCity: "Jeddah" },
    { makeName: "Lexus", agentNameEn: "Abdul Latif Jameel Motors", agentNameAr: "\u0639\u0628\u062F \u0627\u0644\u0644\u0637\u064A\u0641 \u062C\u0645\u064A\u0644 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "lexus-alj.com", phone: "920000655", headquartersCity: "Jeddah" },
    { makeName: "JETOUR", agentNameEn: "Abdul Latif Jameel Motors", agentNameAr: "\u0639\u0628\u062F \u0627\u0644\u0644\u0637\u064A\u0641 \u062C\u0645\u064A\u0644 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "jetour-ksa.com", phone: "920000655", headquartersCity: "Jeddah" },
    { makeName: "Honda", agentNameEn: "Abdullah Hashim Company", agentNameAr: "\u0634\u0631\u0643\u0629 \u0639\u0628\u062F\u0627\u0644\u0644\u0647 \u0647\u0627\u0634\u0645", website: "hondasaudi.com", phone: "920002208", headquartersCity: "Jeddah" },
    { makeName: "Nissan", agentNameEn: "E.A. Juffali & Brothers", agentNameAr: "\u0625.\u0623. \u062C\u0641\u0627\u0644\u064A \u0648\u0625\u062E\u0648\u0627\u0646\u0647", website: "nissan.com.sa", phone: "920001666", headquartersCity: "Riyadh" },
    { makeName: "Infiniti", agentNameEn: "Al Jazirah Vehicles Agencies", agentNameAr: "\u0627\u0644\u062C\u0632\u064A\u0631\u0629 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "al-jazirah.com", phone: "920002100", headquartersCity: "Riyadh" },
    { makeName: "Mercedes-Benz", agentNameEn: "SAMACO Automotive", agentNameAr: "\u0633\u0627\u0645\u0643\u0648 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "mercedes-benz-arabia.com", phone: "920000724", headquartersCity: "Riyadh" },
    { makeName: "BMW", agentNameEn: "Mohamed Yousuf Naghi Motors", agentNameAr: "\u0645\u062D\u0645\u062F \u064A\u0648\u0633\u0641 \u0646\u0627\u063A\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "bmwksa.com", phone: "920003040", headquartersCity: "Jeddah" },
    { makeName: "Hyundai", agentNameEn: "Olayan Financing Company", agentNameAr: "\u0634\u0631\u0643\u0629 \u0623\u0648\u0644\u064A\u0627\u0646 \u0644\u0644\u062A\u0645\u0648\u064A\u0644", website: "hyundai.com.sa", phone: "920001234", headquartersCity: "Riyadh" },
    { makeName: "Genesis", agentNameEn: "Almajdouie Motors", agentNameAr: "\u0627\u0644\u0645\u062C\u062F\u0648\u0639\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "genesis.com/sa", phone: "920001000", headquartersCity: "Dammam" },
    { makeName: "Kia", agentNameEn: "Al Jabr Trading & NMC", agentNameAr: "\u0627\u0644\u062C\u0627\u0628\u0631 \u0644\u0644\u062A\u062C\u0627\u0631\u0629", website: "kia.com.sa", phone: "920001522", headquartersCity: "Riyadh" },
    { makeName: "Renault", agentNameEn: "Wallan Trading Company", agentNameAr: "\u0634\u0631\u0643\u0629 \u0648\u0639\u0644\u0627\u0646 \u0644\u0644\u062A\u062C\u0627\u0631\u0629", website: "renault.sa", phone: "920000525", headquartersCity: "Jeddah" },
    { makeName: "Geely", agentNameEn: "Wallan Trading Company", agentNameAr: "\u0634\u0631\u0643\u0629 \u0648\u0639\u0644\u0627\u0646 \u0644\u0644\u062A\u062C\u0627\u0631\u0629", website: "geely.com.sa", phone: "920000525", headquartersCity: "Jeddah" },
    { makeName: "Ford", agentNameEn: "Mohamed Yousuf Naghi Motors", agentNameAr: "\u0645\u062D\u0645\u062F \u064A\u0648\u0633\u0641 \u0646\u0627\u063A\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "my-naghi.com", phone: "920003040", headquartersCity: "Jeddah" },
    { makeName: "Lincoln", agentNameEn: "Mohamed Yousuf Naghi Motors", agentNameAr: "\u0645\u062D\u0645\u062F \u064A\u0648\u0633\u0641 \u0646\u0627\u063A\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "my-naghi.com", phone: "920003040", headquartersCity: "Jeddah" },
    { makeName: "Chevrolet", agentNameEn: "Mohamed Yousuf Naghi Motors", agentNameAr: "\u0645\u062D\u0645\u062F \u064A\u0648\u0633\u0641 \u0646\u0627\u063A\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "my-naghi.com", phone: "920003040", headquartersCity: "Jeddah" },
    { makeName: "GMC", agentNameEn: "Mohamed Yousuf Naghi Motors", agentNameAr: "\u0645\u062D\u0645\u062F \u064A\u0648\u0633\u0641 \u0646\u0627\u063A\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "my-naghi.com", phone: "920003040", headquartersCity: "Jeddah" },
    { makeName: "Cadillac", agentNameEn: "Mohamed Yousuf Naghi Motors", agentNameAr: "\u0645\u062D\u0645\u062F \u064A\u0648\u0633\u0641 \u0646\u0627\u063A\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "my-naghi.com", phone: "920003040", headquartersCity: "Jeddah" },
    { makeName: "Land Rover", agentNameEn: "Mohamed Yousuf Naghi Motors", agentNameAr: "\u0645\u062D\u0645\u062F \u064A\u0648\u0633\u0641 \u0646\u0627\u063A\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "my-naghi.com", phone: "920003040", headquartersCity: "Jeddah" },
    { makeName: "Volvo", agentNameEn: "Mohamed Yousuf Naghi Motors", agentNameAr: "\u0645\u062D\u0645\u062F \u064A\u0648\u0633\u0641 \u0646\u0627\u063A\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "my-naghi.com", phone: "920003040", headquartersCity: "Jeddah" },
    { makeName: "Chery", agentNameEn: "Mohamed Yousuf Naghi Motors", agentNameAr: "\u0645\u062D\u0645\u062F \u064A\u0648\u0633\u0641 \u0646\u0627\u063A\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "chery-saudi.com", phone: "920003040", headquartersCity: "Jeddah" },
    { makeName: "Exeed", agentNameEn: "Mohamed Yousuf Naghi Motors", agentNameAr: "\u0645\u062D\u0645\u062F \u064A\u0648\u0633\u0641 \u0646\u0627\u063A\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "exeed-saudi.com", phone: "920003040", headquartersCity: "Jeddah" },
    { makeName: "Haval", agentNameEn: "Mohamed Yousuf Naghi Motors", agentNameAr: "\u0645\u062D\u0645\u062F \u064A\u0648\u0633\u0641 \u0646\u0627\u063A\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "haval-saudi.com", phone: "920003040", headquartersCity: "Jeddah" },
    { makeName: "Subaru", agentNameEn: "Mohamed Yousuf Naghi Motors", agentNameAr: "\u0645\u062D\u0645\u062F \u064A\u0648\u0633\u0641 \u0646\u0627\u063A\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "subaru-saudi.com", phone: "920003040", headquartersCity: "Jeddah" },
    { makeName: "Audi", agentNameEn: "Al Jazirah Vehicles Agencies", agentNameAr: "\u0627\u0644\u062C\u0632\u064A\u0631\u0629 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "al-jazirah.com", phone: "920002100", headquartersCity: "Riyadh" },
    { makeName: "Volkswagen", agentNameEn: "Al Jazirah Vehicles Agencies", agentNameAr: "\u0627\u0644\u062C\u0632\u064A\u0631\u0629 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "al-jazirah.com", phone: "920002100", headquartersCity: "Riyadh" },
    { makeName: "Porsche", agentNameEn: "Al Jazirah Vehicles Agencies", agentNameAr: "\u0627\u0644\u062C\u0632\u064A\u0631\u0629 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "al-jazirah.com", phone: "920002100", headquartersCity: "Riyadh" },
    { makeName: "Jeep", agentNameEn: "Al Jazirah Vehicles Agencies", agentNameAr: "\u0627\u0644\u062C\u0632\u064A\u0631\u0629 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "al-jazirah.com", phone: "920002100", headquartersCity: "Riyadh" },
    { makeName: "Dodge", agentNameEn: "Al Jazirah Vehicles Agencies", agentNameAr: "\u0627\u0644\u062C\u0632\u064A\u0631\u0629 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "al-jazirah.com", phone: "920002100", headquartersCity: "Riyadh" },
    { makeName: "RAM", agentNameEn: "Al Jazirah Vehicles Agencies", agentNameAr: "\u0627\u0644\u062C\u0632\u064A\u0631\u0629 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "al-jazirah.com", phone: "920002100", headquartersCity: "Riyadh" },
    { makeName: "Mitsubishi", agentNameEn: "Algosaibi Motors", agentNameAr: "\u0634\u0631\u0643\u0629 \u0627\u0644\u063A\u0635\u064A\u0628\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "algosaibi-motors.com", phone: "920002202", headquartersCity: "Riyadh" },
    { makeName: "MG", agentNameEn: "SAMACO Automotive", agentNameAr: "\u0633\u0627\u0645\u0643\u0648 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "samaco.com.sa", phone: "920000724", headquartersCity: "Riyadh" },
    { makeName: "Mazda", agentNameEn: "Al Jazirah Vehicles Agencies", agentNameAr: "\u0627\u0644\u062C\u0632\u064A\u0631\u0629 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "mazda.sa", phone: "920002100", headquartersCity: "Riyadh" },
    { makeName: "Suzuki", agentNameEn: "National Auto Company", agentNameAr: "\u0627\u0644\u0634\u0631\u0643\u0629 \u0627\u0644\u0648\u0637\u0646\u064A\u0629 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "suzuki.sa", phone: "920001900", headquartersCity: "Riyadh" },
    { makeName: "BYD", agentNameEn: "Al-Futtaim Electric Mobility", agentNameAr: "\u0627\u0644\u0641\u0637\u064A\u0645 \u0644\u0644\u062A\u0646\u0642\u0644 \u0627\u0644\u0643\u0647\u0631\u0628\u0627\u0626\u064A", website: "byd.sa", phone: "8003020006", headquartersCity: "Riyadh" },
    { makeName: "Changan", agentNameEn: "Almajdouie Motors", agentNameAr: "\u0627\u0644\u0645\u062C\u062F\u0648\u0639\u064A \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "changanauto.com.sa", phone: "920001000", headquartersCity: "Dammam" },
    { makeName: "GAC", agentNameEn: "Aljomaih Automotive", agentNameAr: "\u0627\u0644\u062C\u0645\u064A\u062D \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A", website: "gac-motor.com.sa", phone: "920001199", headquartersCity: "Riyadh" },
    { makeName: "Isuzu", agentNameEn: "Xenel Industries / Isuzu Arabia", agentNameAr: "\u0632\u064A\u0646\u064A\u0644 / \u0625\u064A\u0633\u0648\u0632\u0648 \u0627\u0644\u0639\u0631\u0628\u064A\u0629", website: "isuzuarabia.com", phone: "920002255", headquartersCity: "Riyadh" }
  ];
  for (const a of agentsData) {
    const makeId = makeMap[a.makeName];
    if (!makeId) continue;
    await db.insert(carMakeAgents).values({
      makeId,
      agentNameEn: a.agentNameEn,
      agentNameAr: a.agentNameAr,
      website: a.website,
      phone: a.phone,
      headquartersCity: a.headquartersCity
    }).onConflictDoNothing();
  }
  console.log(`Car make agents: seeded ${agentsData.length} entries`);
  const riyadhCity = allCities.find((c) => c.nameEn === "Riyadh");
  const jeddahCity = allCities.find((c) => c.nameEn === "Jeddah");
  const dammamCity = allCities.find((c) => c.nameEn === "Dammam");
  if (!riyadhCity || !jeddahCity || !dammamCity) {
    console.log("Cities not found \u2014 skipping vendor seed");
    return;
  }
  const vendorsSeed = [
    {
      vendorName: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0646\u062C\u0645\u0629 \u0644\u0642\u0637\u0639 \u0627\u0644\u063A\u064A\u0627\u0631",
      city: riyadhCity,
      whatsapp: "+966501111001",
      mobile: "+966501111001",
      email: "star@example.com"
    },
    {
      vendorName: "\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u062E\u0644\u064A\u062C \u0644\u0642\u0637\u0639 \u0627\u0644\u0633\u064A\u0627\u0631\u0627\u062A",
      city: riyadhCity,
      whatsapp: "+966501111002",
      mobile: "+966501111002",
      email: "gulf@example.com"
    },
    {
      vendorName: "\u0645\u062E\u0627\u0632\u0646 \u062C\u062F\u0629 \u0644\u0644\u0642\u0637\u0639",
      city: jeddahCity,
      whatsapp: "+966501111003",
      mobile: "+966501111003",
      email: "jeddah@example.com"
    },
    {
      vendorName: "\u0634\u0631\u0643\u0629 \u0627\u0644\u0634\u0631\u0642\u064A\u0629 \u0644\u0644\u0633\u064A\u0627\u0631\u0627\u062A",
      city: dammamCity,
      whatsapp: "+966501111004",
      mobile: "+966501111004",
      email: "eastern@example.com"
    }
  ];
  for (const v of vendorsSeed) {
    const existing = await db.select().from(vendors).where(eq2(vendors.vendorName, v.vendorName)).limit(1);
    if (existing.length > 0) continue;
    const [vendor] = await db.insert(vendors).values({ vendorName: v.vendorName, status: "active" }).returning();
    const [vendorUser] = await db.insert(vendorUsers).values({
      vendorId: vendor.vendorId,
      fullName: `\u0645\u062F\u064A\u0631 ${v.vendorName}`,
      mobileE164: v.mobile,
      email: v.email,
      whatsappE164: v.whatsapp,
      isWhatsappPrimary: true,
      role: "owner",
      status: "active"
    }).returning();
    await db.insert(vendorLocations).values({
      vendorId: vendor.vendorId,
      cityId: v.city.cityId,
      isPrimary: true
    });
    const toyotaId = makeMap["Toyota"];
    const nissanId = makeMap["Nissan"];
    const hyundaiId = makeMap["Hyundai"];
    const camryId = toyotaId ? modelMap[`${toyotaId}:Camry`] : void 0;
    const corollaId = toyotaId ? modelMap[`${toyotaId}:Corolla`] : void 0;
    const altimalId = nissanId ? modelMap[`${nissanId}:Altima`] : void 0;
    const elantraId = hyundaiId ? modelMap[`${hyundaiId}:Elantra`] : void 0;
    const supportedModelIds = [camryId, corollaId, altimalId, elantraId].filter(Boolean);
    for (const carModelId of supportedModelIds) {
      await db.insert(vendorSupportedModels).values({ vendorId: vendor.vendorId, carModelId }).onConflictDoNothing();
    }
    console.log(`Seeded vendor: ${v.vendorName}`);
  }
  console.log("Seeding complete.");
}
var SEED_ADVISORY_LOCK_KEY = 742193;
async function seedIfEmpty() {
  try {
    const existing = await db.select().from(carMakes).limit(1);
    if (existing.length > 0) return;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        "SELECT pg_try_advisory_lock($1) AS locked",
        [SEED_ADVISORY_LOCK_KEY]
      );
      if (!rows[0]?.locked) return;
      const recheck = await db.select().from(carMakes).limit(1);
      if (recheck.length > 0) return;
      console.log("Reference data is empty \u2014 running auto-seed...");
      await seedReferenceData();
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [SEED_ADVISORY_LOCK_KEY]).catch(() => {
      });
      client.release();
    }
  } catch (err) {
    console.error("Auto-seed check failed:", err);
  }
}
var DEDUPE_ADVISORY_LOCK_KEY = 742194;
async function dedupeCities() {
  try {
    const { rows } = await pool.query(
      "SELECT count(*)::int AS total, count(DISTINCT name_en)::int AS uniq FROM cities WHERE name_en IS NOT NULL"
    );
    if (!rows[0] || rows[0].total === rows[0].uniq) return;
    const client = await pool.connect();
    try {
      const lock = await client.query(
        "SELECT pg_try_advisory_lock($1) AS locked",
        [DEDUPE_ADVISORY_LOCK_KEY]
      );
      if (!lock.rows[0]?.locked) return;
      try {
        await client.query("BEGIN");
        const recheck = await client.query(
          "SELECT count(*)::int AS total, count(DISTINCT name_en)::int AS uniq FROM cities WHERE name_en IS NOT NULL"
        );
        if (!recheck.rows[0] || recheck.rows[0].total === recheck.rows[0].uniq) {
          await client.query("COMMIT");
          return;
        }
        console.log(
          `Deduplicating cities (${recheck.rows[0].total} rows, ${recheck.rows[0].uniq} unique)...`
        );
        await client.query(`
          WITH canon AS (
            SELECT name_en, MIN(city_id::text)::uuid AS keep_id
            FROM cities WHERE name_en IS NOT NULL GROUP BY name_en
          ),
          mapped AS (
            SELECT vl.ctid AS rid, vl.vendor_id, canon.keep_id AS target_city
            FROM vendor_locations vl
            JOIN cities c ON c.city_id = vl.city_id
            JOIN canon ON canon.name_en = c.name_en
          ),
          ranked AS (
            SELECT rid,
              ROW_NUMBER() OVER (PARTITION BY vendor_id, target_city ORDER BY rid) AS rn
            FROM mapped
          )
          DELETE FROM vendor_locations vl
          USING ranked
          WHERE vl.ctid = ranked.rid AND ranked.rn > 1
        `);
        const repoint = (table) => `
          WITH canon AS (
            SELECT name_en, MIN(city_id::text)::uuid AS keep_id
            FROM cities WHERE name_en IS NOT NULL GROUP BY name_en
          ),
          dups AS (
            SELECT c.city_id AS dup_id, canon.keep_id
            FROM cities c JOIN canon ON c.name_en = canon.name_en
            WHERE c.city_id <> canon.keep_id
          )
          UPDATE ${table} t SET city_id = d.keep_id
          FROM dups d WHERE t.city_id = d.dup_id
        `;
        for (const table of [
          "customers",
          "vendor_locations",
          "laqit_inspections"
        ]) {
          await client.query(repoint(table));
        }
        await client.query(`
          WITH canon AS (
            SELECT name_en, MIN(city_id::text)::uuid AS keep_id
            FROM cities WHERE name_en IS NOT NULL GROUP BY name_en
          )
          DELETE FROM cities c
          USING canon
          WHERE c.name_en = canon.name_en AND c.city_id <> canon.keep_id
        `);
        await client.query("COMMIT");
        console.log("City deduplication complete.");
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {
        });
        throw e;
      } finally {
        await client.query("SELECT pg_advisory_unlock($1)", [DEDUPE_ADVISORY_LOCK_KEY]).catch(() => {
        });
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("dedupeCities failed:", err);
  }
}
var __entry = process.argv[1] ?? "";
var __isDirectSeedRun = !!process.argv[1] && import.meta.url === pathToFileURL(__entry).href && /(^|[\\/])seed\.(ts|js|mjs|cjs)$/.test(__entry);
if (__isDirectSeedRun) {
  seedReferenceData().then(() => process.exit(0)).catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
}

// server/index.ts
import * as fs from "fs";
import * as path2 from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false, limit: "10mb" }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path3.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (process.env.NODE_ENV !== "production" && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function serveExpoManifest(platform, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function configureExpoAndLanding(app2) {
  const isDev = process.env.NODE_ENV === "development";
  log("Serving static Expo files with dynamic manifest routing");
  app2.get("/robots.txt", (req, res) => {
    const forwardedProto = req.header("x-forwarded-proto");
    const protocol = forwardedProto || req.protocol || "https";
    const forwardedHost = req.header("x-forwarded-host");
    const host = forwardedHost || req.get("host");
    const baseUrl = `${protocol}://${host}`;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.send(
      `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`
    );
  });
  app2.get("/sitemap.xml", (req, res) => {
    const forwardedProto = req.header("x-forwarded-proto");
    const protocol = forwardedProto || req.protocol || "https";
    const forwardedHost = req.header("x-forwarded-host");
    const host = forwardedHost || req.get("host");
    const baseUrl = `${protocol}://${host}`;
    const now = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="${baseUrl}/"/>
  </url>
  <url>
    <loc>${baseUrl}/web-app</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`
    );
  });
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    next();
  });
  app2.use("/assets", express.static(path2.resolve(process.cwd(), "assets")));
  app2.get("/admin", (_req, res) => {
    const templatePath = path2.resolve(process.cwd(), "server", "templates", "admin-agents.html");
    if (fs.existsSync(templatePath)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.sendFile(templatePath);
    } else {
      res.status(404).send("Admin page not found");
    }
  });
  if (isDev) {
    const expoProxy = createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: false,
      ws: true,
      on: {
        error: (_err, _req, res) => {
          res.status(502).send("Expo web server not ready yet. Please wait a moment and refresh.");
        }
      }
    });
    app2.use((req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      expoProxy(req, res, next);
    });
  } else {
    const webDir = path2.resolve(process.cwd(), "static-build", "web");
    app2.get("/", (req, res) => {
      const indexPath = path2.join(webDir, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Not found");
      }
    });
    app2.use(express.static(webDir));
    app2.get("/web-app", (req, res, next) => {
      const indexPath = path2.join(webDir, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
    app2.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      const indexPath = path2.join(webDir, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  }
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, _next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
}
function validateProductionSecrets() {
  if (process.env.NODE_ENV === "development") return;
  const required = [
    { key: "WHATSAPP_WEBHOOK_SECRET", description: "WhatsApp webhook HMAC secret" },
    { key: "PAYMENT_WEBHOOK_SECRET", description: "Stripe payment webhook signing secret" }
  ];
  const missing = required.filter(({ key }) => !process.env[key]);
  if (missing.length > 0) {
    const list = missing.map(({ key, description }) => `  - ${key}: ${description}`).join("\n");
    log(
      `
\u26A0\uFE0F  SECURITY: Missing required webhook secrets in non-development environment:
${list}
  Webhook endpoints will reject all unsigned requests until these are set.
`
    );
  }
}
(async () => {
  app.set("trust proxy", 1);
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  validateProductionSecrets();
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
      seedIfEmpty().then(() => dedupeCities()).catch((e) => log("startup data reconcile error", e));
    }
  );
})();
