import { db } from "../db";
import { exportSchedules, customers, cities } from "../../shared/schema";
import { eq, lte, and } from "drizzle-orm";
import { sendCustomerExportEmail } from "./email";

function buildCustomerCsv(
  rows: Array<{
    fullName: string | null;
    mobileE164: string;
    email: string | null;
    cityId: string | null;
    isAdmin: boolean | null;
    createdAt: Date | null;
  }>,
  cityMap: Map<string, string>,
): string {
  const escape = (v: string | null | undefined) => {
    const s = v ?? "";
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const header = ["الاسم", "رقم الجوال", "البريد الإلكتروني", "المدينة", "مشرف", "تاريخ التسجيل"];
  const csvRows = [header.join(",")];
  for (const c of rows) {
    const row = [
      escape(c.fullName),
      escape(c.mobileE164),
      escape(c.email),
      escape(c.cityId ? (cityMap.get(c.cityId) ?? "") : ""),
      c.isAdmin ? "نعم" : "لا",
      escape(c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : ""),
    ];
    csvRows.push(row.join(","));
  }
  return "\uFEFF" + csvRows.join("\r\n");
}

function computeNextRunAt(frequency: string, from: Date = new Date()): Date {
  const next = new Date(from);
  if (frequency === "daily") {
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(5, 0, 0, 0);
  } else {
    const daysUntilMonday = (8 - next.getUTCDay()) % 7 || 7;
    next.setUTCDate(next.getUTCDate() + daysUntilMonday);
    next.setUTCHours(5, 0, 0, 0);
  }
  return next;
}

export function computeInitialNextRunAt(frequency: string): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setUTCHours(5, 0, 0, 0);

  if (frequency === "daily") {
    if (candidate <= now) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }
    return candidate;
  }

  const dayOfWeek = candidate.getUTCDay();
  const daysUntilMonday = dayOfWeek === 1 ? 0 : (8 - dayOfWeek) % 7;
  candidate.setUTCDate(candidate.getUTCDate() + daysUntilMonday);
  if (candidate <= now) {
    candidate.setUTCDate(candidate.getUTCDate() + 7);
  }
  return candidate;
}

async function runSchedule(schedule: typeof exportSchedules.$inferSelect): Promise<void> {
  const recipients = schedule.recipientEmails as string[];
  if (!recipients || recipients.length === 0) {
    console.log(`[ExportScheduler] Schedule ${schedule.scheduleId} has no recipients, skipping`);
    return;
  }

  try {
    const cityRows = await db
      .select({ cityId: cities.cityId, nameAr: cities.nameAr })
      .from(cities);
    const cityMap = new Map(cityRows.map((c) => [c.cityId, c.nameAr]));

    const rows = await db
      .select({
        fullName: customers.fullName,
        mobileE164: customers.mobileE164,
        email: customers.email,
        isAdmin: customers.isAdmin,
        createdAt: customers.createdAt,
        cityId: customers.cityId,
      })
      .from(customers)
      .orderBy(customers.createdAt);

    const csv = buildCustomerCsv(rows, cityMap);
    const filename = `customers_${new Date().toISOString().slice(0, 10)}.csv`;

    const result = await sendCustomerExportEmail(recipients, csv, filename);
    if (result.success) {
      console.log(`[ExportScheduler] Sent export to ${recipients.join(", ")} (msgId: ${result.messageId})`);
    } else {
      console.error(`[ExportScheduler] Email failed: ${result.error}`);
    }
  } catch (err: any) {
    console.error(`[ExportScheduler] runSchedule error: ${err?.message}`);
  }
}

async function tick(): Promise<void> {
  try {
    const now = new Date();
    const due = await db
      .select()
      .from(exportSchedules)
      .where(
        and(
          eq(exportSchedules.isActive, true),
          lte(exportSchedules.nextRunAt, now),
        ),
      );

    for (const schedule of due) {
      await runSchedule(schedule);
      const nextRunAt = computeNextRunAt(schedule.frequency);
      await db
        .update(exportSchedules)
        .set({ lastRunAt: now, nextRunAt })
        .where(eq(exportSchedules.scheduleId, schedule.scheduleId));
    }
  } catch (err: any) {
    console.error("[ExportScheduler] tick error:", err?.message);
  }
}

const TICK_INTERVAL_MS = 10 * 60 * 1000;

export function startExportScheduler(): void {
  console.log("[ExportScheduler] Starting (interval: 10 min)");
  setInterval(() => {
    tick().catch((e) => console.error("[ExportScheduler] unhandled:", e?.message));
  }, TICK_INTERVAL_MS);
  tick().catch((e) => console.error("[ExportScheduler] initial tick error:", e?.message));
}
