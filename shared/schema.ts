import { sql, relations } from "drizzle-orm";
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
  uniqueIndex,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Existing tables (kept for backward compatibility) ────────────────────────

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mobile: text("mobile").notNull().unique(),
  email: text("email"),
  termsAccepted: timestamp("terms_accepted").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  inspectionNumber: varchar("inspection_number").notNull().unique(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  carMake: text("car_make").notNull(),
  carMakeAr: text("car_make_ar"),
  carModel: text("car_model").notNull(),
  carModelAr: text("car_model_ar"),
  carYear: text("car_year"),
  parts: text("parts").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  mobile: true,
  email: true,
});

export const insertInspectionSchema = createInsertSchema(inspections).pick({
  userId: true,
  carMake: true,
  carMakeAr: true,
  carModel: true,
  carModelAr: true,
  carYear: true,
  parts: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type Inspection = typeof inspections.$inferSelect;

// ─── Chat tables (kept for backward compatibility) ────────────────────────────

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Enums ────────────────────────────────────────────────────────────────────

export const inspectionStatusEnum = pgEnum("inspection_status", [
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
  "closed",
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "queued",
  "sent",
  "failed",
]);

export const messageDirectionEnum = pgEnum("message_direction", [
  "outbound",
  "inbound",
]);

export const quoteStatusEnum = pgEnum("quote_status", [
  "received",
  "parsed",
  "unparsed",
  "presented",
  "accepted",
  "rejected",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "initiated",
  "authorized",
  "captured",
  "failed",
  "refunded",
]);

export const userRoleEnum = pgEnum("user_role", ["owner", "staff"]);

export const userStatusEnum = pgEnum("user_status", ["active", "blocked"]);

export const vendorStatusEnum = pgEnum("vendor_status", [
  "pending_verification",
  "active",
  "suspended",
  "rejected",
]);

export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "blocked",
]);

export const mediaTypeEnum = pgEnum("media_type", [
  "car_photo",
  "damage_photo",
  "other",
]);

export const partSourceEnum = pgEnum("part_source", ["ai", "user"]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "sms",
  "whatsapp",
  "push",
  "email",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "queued",
  "sent",
  "failed",
  "delivered",
]);

// ─── Reference tables ─────────────────────────────────────────────────────────

export const cities = pgTable(
  "cities",
  {
    cityId: uuid("city_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    nameAr: varchar("name_ar", { length: 80 }).notNull(),
    nameEn: varchar("name_en", { length: 80 }),
    countryCode: char("country_code", { length: 2 }).notNull().default("SA"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_cities_country_code").on(t.countryCode)]
);

// ─── Car catalog ──────────────────────────────────────────────────────────────

export const carMakes = pgTable("car_makes", {
  makeId: uuid("make_id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  makeName: varchar("make_name", { length: 50 }).notNull().unique(),
  nameAr: varchar("name_ar", { length: 80 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const carModels = pgTable(
  "car_models",
  {
    carModelId: uuid("car_model_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    makeId: uuid("make_id")
      .notNull()
      .references(() => carMakes.makeId),
    modelName: varchar("model_name", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_car_models_make_id").on(t.makeId),
    uniqueIndex("uq_car_models_make_model").on(t.makeId, t.modelName),
  ]
);

// ─── Customers ────────────────────────────────────────────────────────────────

export const customers = pgTable(
  "customers",
  {
    customerId: uuid("customer_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fullName: varchar("full_name", { length: 150 }),
    mobileE164: varchar("mobile_e164", { length: 20 }).notNull().unique(),
    email: varchar("email", { length: 254 }).notNull().unique(),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.cityId),
    status: customerStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    isAdmin: boolean("is_admin").notNull().default(false),
  },
  (t) => [index("idx_customers_city_id").on(t.cityId)]
);

// ─── Vendors ──────────────────────────────────────────────────────────────────

export const vendors = pgTable(
  "vendors",
  {
    vendorId: uuid("vendor_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vendorName: varchar("vendor_name", { length: 150 }).notNull(),
    vendorNameEn: varchar("vendor_name_en", { length: 200 }),
    legalName: varchar("legal_name", { length: 150 }),
    crNumber: varchar("cr_number", { length: 50 }),
    vatNumber: varchar("vat_number", { length: 50 }),
    phone: varchar("phone", { length: 30 }),
    website: varchar("website", { length: 300 }),
    email: varchar("email", { length: 254 }),
    vendorType: varchar("vendor_type", { length: 100 }),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    district: varchar("district", { length: 150 }),
    status: vendorStatusEnum("status").notNull().default("pending_verification"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_vendors_status").on(t.status)]
);

export const vendorUsers = pgTable(
  "vendor_users",
  {
    vendorUserId: uuid("vendor_user_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.vendorId),
    fullName: varchar("full_name", { length: 150 }),
    mobileE164: varchar("mobile_e164", { length: 20 }).notNull().unique(),
    email: varchar("email", { length: 254 }).unique(),
    whatsappE164: varchar("whatsapp_e164", { length: 20 }).notNull().unique(),
    whatsappVerifiedAt: timestamp("whatsapp_verified_at", {
      withTimezone: true,
    }),
    isWhatsappPrimary: boolean("is_whatsapp_primary").notNull().default(false),
    role: userRoleEnum("role").notNull().default("owner"),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [
    index("idx_vendor_users_vendor_id").on(t.vendorId),
    index("idx_vendor_users_is_primary").on(t.isWhatsappPrimary),
    uniqueIndex("uq_vendor_one_primary_whatsapp")
      .on(t.vendorId)
      .where(sql`${t.isWhatsappPrimary} = true`),
  ]
);

// ─── Vendor coverage ──────────────────────────────────────────────────────────

export const vendorLocations = pgTable(
  "vendor_locations",
  {
    vendorLocationId: uuid("vendor_location_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.vendorId),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.cityId),
    addressLine: varchar("address_line", { length: 255 }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_vendor_locations_vendor_city").on(t.vendorId, t.cityId),
    index("idx_vendor_locations_city_vendor").on(t.cityId, t.vendorId),
  ]
);

export const vendorSupportedModels = pgTable(
  "vendor_supported_models",
  {
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.vendorId),
    carModelId: uuid("car_model_id")
      .notNull()
      .references(() => carModels.carModelId),
    yearFrom: smallint("year_from"),
    yearTo: smallint("year_to"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_vsm_car_model_vendor").on(t.carModelId, t.vendorId)]
);

// ─── Laqit inspections (new full-featured table) ──────────────────────────────

export const laqitInspections = pgTable(
  "laqit_inspections",
  {
    inspectionId: uuid("inspection_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    inspectionNo: varchar("inspection_no", { length: 30 }).notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.customerId),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.cityId),
    carModelId: uuid("car_model_id")
      .notNull()
      .references(() => carModels.carModelId),
    carYear: smallint("car_year"),
    carType: varchar("car_type", { length: 40 }),
    status: inspectionStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_laqit_inspections_customer_created").on(
      t.customerId,
      t.createdAt
    ),
    index("idx_laqit_inspections_city_model").on(t.cityId, t.carModelId),
    index("idx_laqit_inspections_status").on(t.status),
  ]
);

// ─── Inspection media & parts ─────────────────────────────────────────────────

export const inspectionMedia = pgTable(
  "inspection_media",
  {
    mediaId: uuid("media_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => laqitInspections.inspectionId),
    mediaType: mediaTypeEnum("media_type").notNull(),
    fileUrl: text("file_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_inspection_media_inspection_type").on(
      t.inspectionId,
      t.mediaType
    ),
  ]
);

export const inspectionParts = pgTable(
  "inspection_parts",
  {
    inspectionPartId: uuid("inspection_part_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => laqitInspections.inspectionId),
    partName: varchar("part_name", { length: 120 }).notNull(),
    quantity: integer("quantity").notNull().default(1),
    source: partSourceEnum("source").notNull().default("ai"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_inspection_parts_inspection_id").on(t.inspectionId)]
);

// ─── RFQ documents & recipients ───────────────────────────────────────────────

export const rfqDocuments = pgTable(
  "rfq_documents",
  {
    rfqId: uuid("rfq_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    inspectionId: uuid("inspection_id")
      .notNull()
      .unique()
      .references(() => laqitInspections.inspectionId),
    pdfUrl: text("pdf_url").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("idx_rfq_documents_generated_at").on(t.generatedAt)]
);

export const rfqRecipients = pgTable(
  "rfq_recipients",
  {
    rfqRecipientId: uuid("rfq_recipient_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => laqitInspections.inspectionId),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.vendorId),
    vendorUserId: uuid("vendor_user_id")
      .notNull()
      .references(() => vendorUsers.vendorUserId),
    channel: varchar("channel", { length: 20 }).notNull().default("whatsapp"),
    status: deliveryStatusEnum("status").notNull().default("queued"),
    providerMessageId: varchar("provider_message_id", { length: 120 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_rfq_recipients_inspection_id").on(t.inspectionId),
    index("idx_rfq_recipients_vendor_id").on(t.vendorId),
    index("idx_rfq_recipients_status").on(t.status),
  ]
);

// ─── WhatsApp messages ────────────────────────────────────────────────────────

export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    messageId: uuid("message_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    direction: messageDirectionEnum("direction").notNull(),
    vendorId: uuid("vendor_id").references(() => vendors.vendorId),
    vendorUserId: uuid("vendor_user_id").references(
      () => vendorUsers.vendorUserId
    ),
    vendorWhatsappE164: varchar("vendor_whatsapp_e164", {
      length: 20,
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_whatsapp_messages_whatsapp_e164").on(t.vendorWhatsappE164),
    index("idx_whatsapp_messages_inspection_no").on(t.inspectionNoExtracted),
    index("idx_whatsapp_messages_inspection_id").on(t.inspectionId),
  ]
);

// ─── Quotes ───────────────────────────────────────────────────────────────────

export const quotes = pgTable(
  "quotes",
  {
    quoteId: uuid("quote_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => laqitInspections.inspectionId),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.vendorId),
    vendorUserId: uuid("vendor_user_id")
      .notNull()
      .references(() => vendorUsers.vendorUserId),
    quoteImageUrl: text("quote_image_url"),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }),
    currency: char("currency", { length: 3 }).notNull().default("SAR"),
    status: quoteStatusEnum("status").notNull().default("received"),
    ocrRawText: text("ocr_raw_text"),
    presentedAt: timestamp("presented_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_quotes_inspection_id").on(t.inspectionId),
    index("idx_quotes_vendor_id").on(t.vendorId),
    index("idx_quotes_status").on(t.status),
    uniqueIndex("uq_one_accepted_quote_per_inspection")
      .on(t.inspectionId)
      .where(sql`status = 'accepted'`),
  ]
);

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    paymentId: uuid("payment_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    inspectionId: uuid("inspection_id")
      .notNull()
      .references(() => laqitInspections.inspectionId),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.quoteId),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.customerId),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("SAR"),
    status: paymentStatusEnum("status").notNull().default("initiated"),
    gateway: varchar("gateway", { length: 50 }),
    gatewayRef: varchar("gateway_ref", { length: 120 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_payments_inspection_id").on(t.inspectionId),
    index("idx_payments_customer_id").on(t.customerId),
    index("idx_payments_status").on(t.status),
    uniqueIndex("uq_one_live_payment_per_inspection")
      .on(t.inspectionId)
      .where(sql`status IN ('initiated', 'captured')`),
  ]
);

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    notificationId: uuid("notification_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_notifications_customer_id").on(t.customerId),
    index("idx_notifications_vendor_user_id").on(t.vendorUserId),
    index("idx_notifications_status").on(t.status),
  ]
);

// ─── Audit log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable(
  "audit_log",
  {
    auditId: uuid("audit_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    actorType: varchar("actor_type", { length: 30 }),
    actorId: uuid("actor_id"),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }),
    entityId: uuid("entity_id"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("idx_audit_log_actor").on(t.actorType, t.actorId),
    index("idx_audit_log_entity").on(t.entityType, t.entityId),
    index("idx_audit_log_created_at").on(t.createdAt),
  ]
);

// ─── Car make agents (authorized Saudi distributors) ─────────────────────────

export const carMakeAgents = pgTable(
  "car_make_agents",
  {
    agentId: uuid("agent_id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    makeId: uuid("make_id")
      .notNull()
      .unique()
      .references(() => carMakes.makeId),
    agentNameEn: varchar("agent_name_en", { length: 200 }).notNull(),
    agentNameAr: varchar("agent_name_ar", { length: 200 }),
    website: varchar("website", { length: 300 }),
    phone: varchar("phone", { length: 30 }),
    email: varchar("email", { length: 254 }),
    headquartersCity: varchar("headquarters_city", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

// ─── Insert schemas & types for new tables ────────────────────────────────────

export const insertCitySchema = createInsertSchema(cities).omit({
  cityId: true,
  createdAt: true,
});
export type InsertCity = z.infer<typeof insertCitySchema>;
export type City = typeof cities.$inferSelect;

export const insertCarMakeSchema = createInsertSchema(carMakes).omit({
  makeId: true,
  createdAt: true,
});
export type InsertCarMake = z.infer<typeof insertCarMakeSchema>;
export type CarMake = typeof carMakes.$inferSelect;

export const insertCarModelSchema = createInsertSchema(carModels).omit({
  carModelId: true,
  createdAt: true,
});
export type InsertCarModel = z.infer<typeof insertCarModelSchema>;
export type CarModel = typeof carModels.$inferSelect;

export const insertCustomerSchema = createInsertSchema(customers).omit({
  customerId: true,
  createdAt: true,
  lastLoginAt: true,
});
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export const insertVendorSchema = createInsertSchema(vendors).omit({
  vendorId: true,
  createdAt: true,
});
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

export const insertVendorUserSchema = createInsertSchema(vendorUsers).omit({
  vendorUserId: true,
  createdAt: true,
  lastLoginAt: true,
  whatsappVerifiedAt: true,
});
export type InsertVendorUser = z.infer<typeof insertVendorUserSchema>;
export type VendorUser = typeof vendorUsers.$inferSelect;

export const insertVendorLocationSchema = createInsertSchema(
  vendorLocations
).omit({ vendorLocationId: true, createdAt: true });
export type InsertVendorLocation = z.infer<typeof insertVendorLocationSchema>;
export type VendorLocation = typeof vendorLocations.$inferSelect;

export const insertVendorSupportedModelSchema = createInsertSchema(
  vendorSupportedModels
).omit({ createdAt: true });
export type InsertVendorSupportedModel = z.infer<
  typeof insertVendorSupportedModelSchema
>;
export type VendorSupportedModel = typeof vendorSupportedModels.$inferSelect;

export const insertLaqitInspectionSchema = createInsertSchema(
  laqitInspections
).omit({ inspectionId: true, createdAt: true, updatedAt: true });
export type InsertLaqitInspection = z.infer<typeof insertLaqitInspectionSchema>;
export type LaqitInspection = typeof laqitInspections.$inferSelect;

export const insertInspectionMediaSchema = createInsertSchema(
  inspectionMedia
).omit({ mediaId: true, createdAt: true });
export type InsertInspectionMedia = z.infer<typeof insertInspectionMediaSchema>;
export type InspectionMedia = typeof inspectionMedia.$inferSelect;

export const insertInspectionPartSchema = createInsertSchema(
  inspectionParts
).omit({ inspectionPartId: true, createdAt: true });
export type InsertInspectionPart = z.infer<typeof insertInspectionPartSchema>;
export type InspectionPart = typeof inspectionParts.$inferSelect;

export const insertRfqDocumentSchema = createInsertSchema(rfqDocuments).omit({
  rfqId: true,
  generatedAt: true,
});
export type InsertRfqDocument = z.infer<typeof insertRfqDocumentSchema>;
export type RfqDocument = typeof rfqDocuments.$inferSelect;

export const insertRfqRecipientSchema = createInsertSchema(rfqRecipients).omit(
  { rfqRecipientId: true, createdAt: true, sentAt: true }
);
export type InsertRfqRecipient = z.infer<typeof insertRfqRecipientSchema>;
export type RfqRecipient = typeof rfqRecipients.$inferSelect;

export const insertWhatsappMessageSchema = createInsertSchema(
  whatsappMessages
).omit({ messageId: true, createdAt: true });
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;

export const insertQuoteSchema = createInsertSchema(quotes).omit({
  quoteId: true,
  createdAt: true,
  presentedAt: true,
  acceptedAt: true,
});
export type InsertQuote = z.infer<typeof insertQuoteSchema>;
export type Quote = typeof quotes.$inferSelect;

export const insertPaymentSchema = createInsertSchema(payments).omit({
  paymentId: true,
  createdAt: true,
  paidAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  notificationId: true,
  createdAt: true,
  sentAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  auditId: true,
  createdAt: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

export const insertCarMakeAgentSchema = createInsertSchema(carMakeAgents).omit({
  agentId: true,
  createdAt: true,
});
export type InsertCarMakeAgent = z.infer<typeof insertCarMakeAgentSchema>;
export type CarMakeAgent = typeof carMakeAgents.$inferSelect;

// ─── Export Schedules ──────────────────────────────────────────────────────────

export const exportSchedules = pgTable("export_schedules", {
  scheduleId: uuid("schedule_id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  frequency: text("frequency").notNull(),
  recipientEmails: jsonb("recipient_emails").notNull().$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertExportScheduleSchema = createInsertSchema(exportSchedules).omit({
  scheduleId: true,
  createdAt: true,
  lastRunAt: true,
  nextRunAt: true,
});
export type InsertExportSchedule = z.infer<typeof insertExportScheduleSchema>;
export type ExportSchedule = typeof exportSchedules.$inferSelect;
