var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

// server/routes.ts
import { createServer } from "node:http";
import OpenAI2 from "openai";

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  auditLog: () => auditLog,
  carMakes: () => carMakes,
  carModels: () => carModels,
  cities: () => cities,
  conversations: () => conversations,
  customerStatusEnum: () => customerStatusEnum,
  customers: () => customers,
  deliveryStatusEnum: () => deliveryStatusEnum,
  insertAuditLogSchema: () => insertAuditLogSchema,
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
    index("idx_quotes_status").on(t.status)
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
    index("idx_payments_status").on(t.status)
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

// server/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
var db = drizzle(pool, { schema: schema_exports });

// server/routes.ts
import { eq, and, desc, inArray } from "drizzle-orm";

// server/services/whatsapp.ts
async function sendWhatsAppMessage(toE164, text2, pdfUrl, inspectionId) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!apiKey || !phoneNumberId) {
    console.log(`[WhatsApp STUB] Would send to ${toE164}:`);
    console.log(`  Text: ${text2.substring(0, 100)}...`);
    if (pdfUrl)
      console.log(`  PDF: ${pdfUrl}`);
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

// server/services/sms.ts
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
      model: "gpt-4o",
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
      max_tokens: 500
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

// server/routes.ts
var openai2 = new OpenAI2({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
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
  app2.post("/api/login", async (req, res) => {
    try {
      const { name, mobile } = req.body;
      if (!name || !mobile) {
        return res.status(400).json({ error: "\u0627\u0644\u0627\u0633\u0645 \u0648\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      }
      const [user] = await db.select().from(users).where(
        and(eq(users.name, name), eq(users.mobile, mobile))
      ).limit(1);
      if (!user) {
        return res.status(401).json({ error: "\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u063A\u064A\u0631 \u0635\u062D\u064A\u062D" });
      }
      res.json({ success: true, user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email } });
    } catch (error) {
      console.error("Login error:", error?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
    }
  });
  app2.post("/api/inspections", async (req, res) => {
    try {
      const { userId, carMake, carMakeAr, carModel, carModelAr, carYear, parts } = req.body;
      if (!userId || !carMake || !carModel || !parts) {
        return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0641\u062D\u0635 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629" });
      }
      const now = /* @__PURE__ */ new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
      const randomNum = Math.floor(1e3 + Math.random() * 9e3);
      const inspectionNumber = `INS-${dateStr}-${randomNum}`;
      const [newInspection] = await db.insert(inspections).values({
        inspectionNumber,
        userId,
        carMake,
        carMakeAr: carMakeAr || null,
        carModel,
        carModelAr: carModelAr || null,
        carYear: carYear || null,
        parts: JSON.stringify(parts)
      }).returning();
      res.json({
        success: true,
        inspection: {
          id: newInspection.id,
          inspectionNumber: newInspection.inspectionNumber,
          carMake: newInspection.carMake,
          carMakeAr: newInspection.carMakeAr,
          carModel: newInspection.carModel,
          carModelAr: newInspection.carModelAr,
          carYear: newInspection.carYear,
          parts: JSON.parse(newInspection.parts),
          createdAt: newInspection.createdAt
        }
      });
    } catch (error) {
      console.error("Save inspection error:", error?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062D\u0641\u0638 \u0627\u0644\u0641\u062D\u0635" });
    }
  });
  app2.get("/api/inspections/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0645\u0637\u0644\u0648\u0628" });
      }
      const userInspections = await db.select().from(inspections).where(eq(inspections.userId, userId)).orderBy(desc(inspections.createdAt));
      const formattedInspections = userInspections.map((inspection) => ({
        id: inspection.id,
        inspectionNumber: inspection.inspectionNumber,
        carMake: inspection.carMake,
        carMakeAr: inspection.carMakeAr,
        carModel: inspection.carModel,
        carModelAr: inspection.carModelAr,
        carYear: inspection.carYear,
        parts: JSON.parse(inspection.parts),
        createdAt: inspection.createdAt
      }));
      res.json({ success: true, inspections: formattedInspections });
    } catch (error) {
      console.error("Get inspections error:", error?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062C\u0644\u0628 \u0627\u0644\u0641\u062D\u0648\u0635\u0627\u062A" });
    }
  });
  app2.post("/api/analyze", async (req, res) => {
    try {
      const { imageUri, carInfo } = req.body;
      console.log("Received analyze request");
      console.log("Image URI length:", imageUri?.length || 0);
      console.log("Image starts with:", imageUri?.substring(0, 50));
      const systemPrompt = `You are an expert automotive damage and missing parts detection system. You MUST analyze the image and identify the car, then detect any missing, damaged, broken, or worn parts.

IMPORTANT: You MUST ALWAYS return valid JSON in the exact format specified below. NEVER return error messages or plain text.

STEP 1 - Identify the car:
- Look for visible text on the car (brand names like "ODYSSEY", "FLEX", "CAMRY", etc.)
- Look for brand logos/emblems (Honda "H", Ford oval, Toyota logo, etc.)
- Study the body shape, taillights, and distinctive features
- Estimate the year based on the generation/design

STEP 2 - Detect missing or damaged parts:
- Look carefully for any MISSING parts (e.g., missing bumper, missing mirror, missing headlight, missing trim piece, missing emblem, missing grille)
- Look for DAMAGED parts (cracked bumpers, broken lights, dented panels, scratched paint, broken mirrors, cracked windshield)
- Look for WORN parts (faded paint, worn tires, rusted areas, deteriorated rubber seals)
- For each issue found, describe the condition: "missing", "damaged", "cracked", "broken", "dented", "scratched", "worn", "faded", etc.
- Provide realistic replacement/repair prices in Saudi Riyals (SAR)

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
- Focus on finding MISSING and DAMAGED parts - this is a damage inspection tool
- If the car appears in good condition with no visible damage, still check carefully for minor issues like scratches, worn tires, faded paint, etc.
- If truly no damage is found, return an empty parts array
- ALWAYS provide Arabic translations (makeAr, modelAr, nameAr, descriptionAr, conditionAr, primaryUseAr)
- Confidence should reflect how certain you are about the damage (60-100)
- Prices should be realistic replacement/repair estimates in SAR
- NEVER return an error message - always return the JSON structure above`;
      const userMessage = carInfo ? `The user has selected: ${carInfo.make} ${carInfo.model} ${carInfo.year}. Inspect the car image carefully for any missing, damaged, broken, worn, or defective parts.` : `Identify the car make, model, year, then inspect the image carefully for any missing, damaged, broken, worn, or defective parts.`;
      console.log("Calling OpenAI API with model gpt-4o...");
      const response = await openai2.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userMessage },
              {
                type: "image_url",
                image_url: { url: imageUri }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 2048
      });
      console.log("OpenAI API response received");
      const content = response.choices[0]?.message?.content || "{}";
      console.log("Response content:", content.substring(0, 300));
      const result = JSON.parse(content);
      if (!result.carInfo || !result.parts) {
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
  app2.post("/api/identify-car", async (req, res) => {
    try {
      const { imageUri } = req.body;
      if (!imageUri)
        return res.status(400).json({ error: "imageUri required" });
      const response = await openai2.chat.completions.create({
        model: "gpt-4o",
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
        max_tokens: 256
      });
      const raw = response.choices[0]?.message?.content ?? "{}";
      const result = JSON.parse(raw);
      res.json(result);
    } catch (err) {
      console.error("identify-car error:", err?.message);
      res.status(500).json({ error: "\u0641\u0634\u0644 \u0641\u064A \u062A\u062D\u0644\u064A\u0644 \u0635\u0648\u0631\u0629 \u0627\u0644\u0633\u064A\u0627\u0631\u0629" });
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
      const result = await db.select().from(carMakes).orderBy(carMakes.makeName);
      res.json({ makes: result });
    } catch (err) {
      console.error("GET /api/car-makes error:", err?.message);
      res.status(500).json({ error: "\u062E\u0637\u0623 \u0641\u064A \u062C\u0644\u0628 \u0627\u0644\u0645\u0627\u0631\u0643\u0627\u062A" });
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
      const { fullName, mobileE164, email, cityId } = req.body;
      if (!mobileE164 || !email || !cityId) {
        return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0648\u0627\u0644\u0628\u0631\u064A\u062F \u0648\u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0645\u0637\u0644\u0648\u0628\u0629" });
      }
      const [customer] = await db.insert(customers).values({ fullName: fullName ?? null, mobileE164, email, cityId }).returning();
      res.json({ success: true, customer });
    } catch (err) {
      if (err?.code === "23505") {
        return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0623\u0648 \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0645\u0633\u062C\u0644 \u0645\u0633\u0628\u0642\u0627\u064B" });
      }
      console.error("Customer register error:", err?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u0633\u062C\u064A\u0644" });
    }
  });
  app2.post("/api/customers/login", async (req, res) => {
    try {
      const { mobileE164 } = req.body;
      if (!mobileE164)
        return res.status(400).json({ error: "\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644 \u0645\u0637\u0644\u0648\u0628" });
      const [customer] = await db.select().from(customers).where(eq(customers.mobileE164, mobileE164)).limit(1);
      if (!customer)
        return res.status(404).json({ error: "\u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      await db.update(customers).set({ lastLoginAt: /* @__PURE__ */ new Date() }).where(eq(customers.customerId, customer.customerId));
      res.json({ success: true, customer });
    } catch (err) {
      console.error("Customer login error:", err?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644" });
    }
  });
  app2.get("/api/customers/:id", async (req, res) => {
    try {
      const [customer] = await db.select().from(customers).where(eq(customers.customerId, req.params.id)).limit(1);
      if (!customer)
        return res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      res.json({ customer });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.patch("/api/customers/:id", async (req, res) => {
    try {
      const { fullName, cityId } = req.body;
      const [updated] = await db.update(customers).set({ ...fullName && { fullName }, ...cityId && { cityId } }).where(eq(customers.customerId, req.params.id)).returning();
      res.json({ success: true, customer: updated });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.get("/api/vendors", async (_req, res) => {
    try {
      const result = await db.select().from(vendors).orderBy(vendors.createdAt);
      res.json({ vendors: result });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/vendors", async (req, res) => {
    try {
      const { vendorName, legalName, crNumber, vatNumber } = req.body;
      if (!vendorName)
        return res.status(400).json({ error: "\u0627\u0633\u0645 \u0627\u0644\u0645\u0648\u0631\u062F \u0645\u0637\u0644\u0648\u0628" });
      const [vendor] = await db.insert(vendors).values({ vendorName, legalName, crNumber, vatNumber }).returning();
      res.json({ success: true, vendor });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.get("/api/vendor-users", async (_req, res) => {
    try {
      const result = await db.select().from(vendorUsers).orderBy(vendorUsers.createdAt);
      res.json({ vendorUsers: result });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/vendor-users", async (req, res) => {
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
  app2.post("/api/laqit-inspections", async (req, res) => {
    try {
      const { customerId, carModelId, carYear, carType } = req.body;
      if (!customerId || !carModelId) {
        return res.status(400).json({ error: "\u0645\u0639\u0631\u0641 \u0627\u0644\u0639\u0645\u064A\u0644 \u0648\u0627\u0644\u0645\u0648\u062F\u064A\u0644 \u0645\u0637\u0644\u0648\u0628\u0627\u0646" });
      }
      const [customer] = await db.select().from(customers).where(eq(customers.customerId, customerId)).limit(1);
      if (!customer)
        return res.status(404).json({ error: "\u0627\u0644\u0639\u0645\u064A\u0644 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      let inspectionNo = generateInspectionNo();
      let attempts = 0;
      while (attempts < 5) {
        const clash = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionNo, inspectionNo)).limit(1);
        if (clash.length === 0)
          break;
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
  app2.get("/api/laqit-inspections/customer/:customerId", async (req, res) => {
    try {
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
  app2.get("/api/laqit-inspections/:id", async (req, res) => {
    try {
      const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, req.params.id)).limit(1);
      if (!inspection)
        return res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const media = await db.select().from(inspectionMedia).where(eq(inspectionMedia.inspectionId, req.params.id));
      const parts = await db.select().from(inspectionParts).where(eq(inspectionParts.inspectionId, req.params.id));
      const quotesList = await db.select().from(quotes).where(eq(quotes.inspectionId, req.params.id)).orderBy(desc(quotes.createdAt));
      res.json({ inspection, media, parts, quotes: quotesList });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/laqit-inspections/:id/media", async (req, res) => {
    try {
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
  app2.post("/api/laqit-inspections/:id/parts", async (req, res) => {
    try {
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
  app2.patch("/api/laqit-inspections/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const [updated] = await db.update(laqitInspections).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq(laqitInspections.inspectionId, req.params.id)).returning();
      res.json({ success: true, inspection: updated });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/laqit-inspections/:id/submit", async (req, res) => {
    try {
      const inspectionId = req.params.id;
      const [inspection] = await db.select().from(laqitInspections).where(eq(laqitInspections.inspectionId, inspectionId)).limit(1);
      if (!inspection)
        return res.status(404).json({ error: "\u0627\u0644\u0641\u062D\u0635 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const locationRows = await db.select({ vendorId: vendorLocations.vendorId }).from(vendorLocations).where(eq(vendorLocations.cityId, inspection.cityId));
      const cityVendorIds = locationRows.map((r) => r.vendorId);
      if (cityVendorIds.length === 0) {
        await db.update(laqitInspections).set({ status: "rfq_sent", updatedAt: /* @__PURE__ */ new Date() }).where(eq(laqitInspections.inspectionId, inspectionId));
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
        if (!primaryUser)
          continue;
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
        if (sendResult.success)
          vendorsNotified++;
      }
      await db.update(laqitInspections).set({ status: "rfq_sent", updatedAt: /* @__PURE__ */ new Date() }).where(eq(laqitInspections.inspectionId, inspectionId));
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
      const entry = body?.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];
      if (!message)
        return res.sendStatus(200);
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
  app2.get("/api/laqit-inspections/:id/quotes", async (req, res) => {
    try {
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
  app2.get("/api/quotes/:quoteId", async (req, res) => {
    try {
      const [quote] = await db.select().from(quotes).where(eq(quotes.quoteId, req.params.quoteId)).limit(1);
      if (!quote)
        return res.status(404).json({ error: "\u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const [vendor] = await db.select().from(vendors).where(eq(vendors.vendorId, quote.vendorId)).limit(1);
      res.json({ quote: { ...quote, vendorName: vendor?.vendorName ?? "" } });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/laqit-inspections/:id/quotes/:quoteId/accept", async (req, res) => {
    try {
      const { id: inspectionId, quoteId } = req.params;
      const allQuotes = await db.select().from(quotes).where(eq(quotes.inspectionId, inspectionId));
      for (const q of allQuotes) {
        if (q.quoteId !== quoteId) {
          await db.update(quotes).set({ status: "rejected" }).where(eq(quotes.quoteId, q.quoteId));
        }
      }
      await db.update(quotes).set({ status: "accepted", acceptedAt: /* @__PURE__ */ new Date() }).where(eq(quotes.quoteId, quoteId));
      await db.update(laqitInspections).set({ status: "quote_accepted", updatedAt: /* @__PURE__ */ new Date() }).where(eq(laqitInspections.inspectionId, inspectionId));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err?.message });
    }
  });
  app2.post("/api/payments", async (req, res) => {
    try {
      const { inspectionId, quoteId, customerId } = req.body;
      if (!inspectionId || !quoteId || !customerId) {
        return res.status(400).json({ error: "\u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u062F\u0641\u0639 \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629" });
      }
      const [quote] = await db.select().from(quotes).where(eq(quotes.quoteId, quoteId)).limit(1);
      if (!quote)
        return res.status(404).json({ error: "\u0627\u0644\u0639\u0631\u0636 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F" });
      const amount = parseFloat(quote.totalAmount ?? "0");
      const intent = await createPaymentIntent(amount, quote.currency, {
        inspectionId,
        quoteId,
        customerId
      });
      const [payment] = await db.insert(payments).values({
        inspectionId,
        quoteId,
        customerId,
        amount: String(amount),
        currency: quote.currency,
        status: "initiated",
        gateway: "stripe",
        gatewayRef: intent.id
      }).returning();
      await db.update(laqitInspections).set({ status: "payment_pending", updatedAt: /* @__PURE__ */ new Date() }).where(eq(laqitInspections.inspectionId, inspectionId));
      res.json({ success: true, payment, clientSecret: intent.clientSecret });
    } catch (err) {
      console.error("Create payment error:", err?.message);
      res.status(500).json({ error: "\u062D\u062F\u062B \u062E\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062F\u0641\u0639" });
    }
  });
  app2.post("/api/webhooks/payment", async (req, res) => {
    try {
      const event = req.body;
      const eventType = event?.type ?? event?.status ?? "";
      if (eventType === "payment_intent.succeeded" || eventType === "captured") {
        const gatewayRef = event?.data?.object?.id ?? event?.gatewayRef ?? "";
        if (!gatewayRef)
          return res.sendStatus(200);
        const [payment] = await db.select().from(payments).where(eq(payments.gatewayRef, gatewayRef)).limit(1);
        if (!payment)
          return res.sendStatus(200);
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
    "Toyota",
    "Honda",
    "Nissan",
    "Hyundai",
    "Kia",
    "Renault",
    "Mercedes-Benz",
    "BMW",
    "Lexus",
    "Chevrolet",
    "Ford",
    "GMC",
    "Audi",
    "Mitsubishi",
    "Cadillac"
  ];
  await db.insert(carMakes).values(makesData.map((m) => ({ makeName: m }))).onConflictDoNothing();
  const allMakes = await db.select().from(carMakes);
  console.log(`Car makes: ${allMakes.length} rows`);
  const makeMap = {};
  allMakes.forEach((m) => makeMap[m.makeName] = m.makeId);
  const modelsData = [
    { make: "Toyota", models: ["Camry", "Corolla", "Land Cruiser", "Hilux", "RAV4", "Yaris", "Prado", "Rush"] },
    { make: "Honda", models: ["Accord", "Civic", "CR-V", "Pilot", "Odyssey"] },
    { make: "Nissan", models: ["Altima", "Patrol", "Sentra", "Pathfinder", "X-Trail", "Sunny"] },
    { make: "Hyundai", models: ["Elantra", "Sonata", "Tucson", "Accent", "Santa Fe", "Creta", "Palisade", "i10", "i20", "i30"] },
    { make: "Kia", models: ["Sportage", "Optima", "Sorento", "Picanto", "Cerato", "Carnival"] },
    { make: "Renault", models: ["Duster", "Logan", "Symbol", "Megane", "Fluence"] },
    { make: "Mercedes-Benz", models: ["C-Class", "E-Class", "S-Class", "GLC", "GLE"] },
    { make: "BMW", models: ["3 Series", "5 Series", "7 Series", "X5", "X6"] },
    { make: "Lexus", models: ["LX", "GX", "RX", "ES", "IS"] },
    { make: "Chevrolet", models: ["Malibu", "Tahoe", "Suburban", "Silverado", "Captiva"] },
    { make: "Ford", models: ["F-150", "F-250", "F-350", "Explorer", "Expedition", "Expedition MAX", "Escape", "Fusion", "Edge", "Flex", "Bronco", "Bronco Sport", "Maverick", "Ranger", "Mustang", "Mustang Mach-E", "EcoSport", "Kuga", "Everest", "Focus", "Fiesta", "Mondeo", "Taurus", "Transit", "Transit Connect", "Galaxy", "S-Max", "Puma", "Territory"] },
    { make: "GMC", models: ["Yukon", "Sierra", "Terrain", "Acadia"] },
    { make: "Audi", models: ["A4", "A6", "Q5", "Q7"] },
    { make: "Mitsubishi", models: ["Pajero", "L200", "Eclipse Cross", "ASX"] },
    { make: "Cadillac", models: ["Escalade", "Escalade ESV", "CT4", "CT5", "CT6", "XT4", "XT5", "XT6", "ATS", "CTS", "SRX", "STS", "DTS"] }
  ];
  const modelInserts = [];
  for (const entry of modelsData) {
    const makeId = makeMap[entry.make];
    if (!makeId)
      continue;
    for (const model of entry.models) {
      modelInserts.push({ makeId, modelName: model });
    }
  }
  await db.insert(carModels).values(modelInserts).onConflictDoNothing();
  const allModels = await db.select().from(carModels);
  console.log(`Car models: ${allModels.length} rows`);
  const modelMap = {};
  allModels.forEach((m) => modelMap[`${m.makeId}:${m.modelName}`] = m.carModelId);
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
    if (existing.length > 0)
      continue;
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
    if (existing.length > 0)
      return;
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        "SELECT pg_try_advisory_lock($1) AS locked",
        [SEED_ADVISORY_LOCK_KEY]
      );
      if (!rows[0]?.locked)
        return;
      const recheck = await db.select().from(carMakes).limit(1);
      if (recheck.length > 0)
        return;
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
    if (!rows[0] || rows[0].total === rows[0].uniq)
      return;
    const client = await pool.connect();
    try {
      const lock = await client.query(
        "SELECT pg_try_advisory_lock($1) AS locked",
        [DEDUPE_ADVISORY_LOCK_KEY]
      );
      if (!lock.rows[0]?.locked)
        return;
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
import * as path from "path";
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
      res.header("Access-Control-Allow-Headers", "Content-Type");
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
      limit: "50mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false, limit: "50mb" }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api"))
        return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
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
  const manifestPath = path.resolve(
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
function getSeoLandingHtml(req) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const templatePath = path.resolve(process.cwd(), "server", "templates", "seo-landing.html");
  const template = fs.readFileSync(templatePath, "utf-8");
  return template.replace(/BASE_URL_PLACEHOLDER/g, baseUrl);
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
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
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
      if (req.path.startsWith("/api"))
        return next();
      expoProxy(req, res, next);
    });
  } else {
    const webDir = path.resolve(process.cwd(), "static-build", "web");
    app2.get("/", (req, res) => {
      try {
        const html = getSeoLandingHtml(req);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.status(200).send(html);
      } catch {
        const indexPath = path.join(webDir, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send("Not found");
        }
      }
    });
    app2.use(express.static(webDir));
    app2.get("/web-app", (req, res, next) => {
      const indexPath = path.join(webDir, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
    app2.get("*", (req, res, next) => {
      if (req.path.startsWith("/api"))
        return next();
      const indexPath = path.join(webDir, "index.html");
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
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
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
