import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  userId: varchar("user_id").notNull().references(() => users.id),
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
