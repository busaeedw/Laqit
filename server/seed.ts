import { db, pool } from "./db";
import {
  cities,
  carMakes,
  carModels,
  vendors,
  vendorUsers,
  vendorLocations,
  vendorSupportedModels,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { pathToFileURL } from "url";

export async function seedReferenceData() {
  console.log("Seeding reference data...");

  // ── Cities ────────────────────────────────────────────────────────────────
  const cityData = [
    { nameAr: "الرياض", nameEn: "Riyadh" },
    { nameAr: "جدة", nameEn: "Jeddah" },
    { nameAr: "الدمام", nameEn: "Dammam" },
    { nameAr: "المدينة المنورة", nameEn: "Medina" },
    { nameAr: "مكة المكرمة", nameEn: "Mecca" },
    { nameAr: "الخبر", nameEn: "Khobar" },
    { nameAr: "تبوك", nameEn: "Tabuk" },
    { nameAr: "أبها", nameEn: "Abha" },
    { nameAr: "القصيم", nameEn: "Qassim" },
    { nameAr: "حائل", nameEn: "Hail" },
  ];

  const insertedCities = await db
    .insert(cities)
    .values(cityData.map((c) => ({ nameAr: c.nameAr, nameEn: c.nameEn, countryCode: "SA" })))
    .onConflictDoNothing()
    .returning();

  const allCities = await db.select().from(cities);
  console.log(`Cities: ${allCities.length} rows`);

  // ── Car Makes ─────────────────────────────────────────────────────────────
  const makesData = [
    "Toyota", "Honda", "Nissan", "Hyundai", "Kia",
    "Renault", "Mercedes-Benz", "BMW", "Lexus", "Chevrolet",
    "Ford", "GMC", "Audi", "Mitsubishi", "Cadillac",
  ];

  await db
    .insert(carMakes)
    .values(makesData.map((m) => ({ makeName: m })))
    .onConflictDoNothing();

  const allMakes = await db.select().from(carMakes);
  console.log(`Car makes: ${allMakes.length} rows`);

  const makeMap: Record<string, string> = {};
  allMakes.forEach((m) => (makeMap[m.makeName] = m.makeId));

  // ── Car Models ────────────────────────────────────────────────────────────
  const modelsData: { make: string; models: string[] }[] = [
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
    { make: "Cadillac", models: ["Escalade", "Escalade ESV", "CT4", "CT5", "CT6", "XT4", "XT5", "XT6", "ATS", "CTS", "SRX", "STS", "DTS"] },
  ];

  const modelInserts: { makeId: string; modelName: string }[] = [];
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

  const modelMap: Record<string, string> = {};
  allModels.forEach((m) => (modelMap[`${m.makeId}:${m.modelName}`] = m.carModelId));

  // ── Sample Vendors ────────────────────────────────────────────────────────
  const riyadhCity = allCities.find((c) => c.nameEn === "Riyadh");
  const jeddahCity = allCities.find((c) => c.nameEn === "Jeddah");
  const dammamCity = allCities.find((c) => c.nameEn === "Dammam");

  if (!riyadhCity || !jeddahCity || !dammamCity) {
    console.log("Cities not found — skipping vendor seed");
    return;
  }

  const vendorsSeed = [
    {
      vendorName: "شركة النجمة لقطع الغيار",
      city: riyadhCity,
      whatsapp: "+966501111001",
      mobile: "+966501111001",
      email: "star@example.com",
    },
    {
      vendorName: "مؤسسة الخليج لقطع السيارات",
      city: riyadhCity,
      whatsapp: "+966501111002",
      mobile: "+966501111002",
      email: "gulf@example.com",
    },
    {
      vendorName: "مخازن جدة للقطع",
      city: jeddahCity,
      whatsapp: "+966501111003",
      mobile: "+966501111003",
      email: "jeddah@example.com",
    },
    {
      vendorName: "شركة الشرقية للسيارات",
      city: dammamCity,
      whatsapp: "+966501111004",
      mobile: "+966501111004",
      email: "eastern@example.com",
    },
  ];

  for (const v of vendorsSeed) {
    const existing = await db
      .select()
      .from(vendors)
      .where(eq(vendors.vendorName, v.vendorName))
      .limit(1);
    if (existing.length > 0) continue;

    const [vendor] = await db
      .insert(vendors)
      .values({ vendorName: v.vendorName, status: "active" })
      .returning();

    const [vendorUser] = await db
      .insert(vendorUsers)
      .values({
        vendorId: vendor.vendorId,
        fullName: `مدير ${v.vendorName}`,
        mobileE164: v.mobile,
        email: v.email,
        whatsappE164: v.whatsapp,
        isWhatsappPrimary: true,
        role: "owner",
        status: "active",
      })
      .returning();

    await db.insert(vendorLocations).values({
      vendorId: vendor.vendorId,
      cityId: v.city.cityId,
      isPrimary: true,
    });

    const toyotaId = makeMap["Toyota"];
    const nissanId = makeMap["Nissan"];
    const hyundaiId = makeMap["Hyundai"];

    const camryId = toyotaId ? modelMap[`${toyotaId}:Camry`] : undefined;
    const corollaId = toyotaId ? modelMap[`${toyotaId}:Corolla`] : undefined;
    const altimalId = nissanId ? modelMap[`${nissanId}:Altima`] : undefined;
    const elantraId = hyundaiId ? modelMap[`${hyundaiId}:Elantra`] : undefined;

    const supportedModelIds = [camryId, corollaId, altimalId, elantraId].filter(Boolean) as string[];
    for (const carModelId of supportedModelIds) {
      await db
        .insert(vendorSupportedModels)
        .values({ vendorId: vendor.vendorId, carModelId })
        .onConflictDoNothing();
    }

    console.log(`Seeded vendor: ${v.vendorName}`);
  }

  console.log("Seeding complete.");
}

/**
 * Seeds reference data only when the catalog is empty. Safe to call on every
 * server startup — it self-heals a fresh production database (which starts
 * empty even though its schema is migrated by the Publish flow) without
 * re-inserting on subsequent boots.
 */
// Arbitrary constant key for the Postgres advisory lock that guards seeding.
const SEED_ADVISORY_LOCK_KEY = 742193;

export async function seedIfEmpty() {
  try {
    const existing = await db.select().from(carMakes).limit(1);
    if (existing.length > 0) return;

    // Cross-instance mutual exclusion: hold a session advisory lock on a
    // dedicated pooled connection so that if multiple instances cold-start
    // against the same empty database, only one performs the seed.
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS locked",
        [SEED_ADVISORY_LOCK_KEY],
      );
      if (!rows[0]?.locked) return; // another instance is seeding

      // Re-check now that the lock is held, to avoid a TOCTOU double-seed.
      const recheck = await db.select().from(carMakes).limit(1);
      if (recheck.length > 0) return;

      console.log("Reference data is empty — running auto-seed...");
      await seedReferenceData();
    } finally {
      await client
        .query("SELECT pg_advisory_unlock($1)", [SEED_ADVISORY_LOCK_KEY])
        .catch(() => {});
      client.release();
    }
  } catch (err) {
    console.error("Auto-seed check failed:", err);
  }
}

// CLI runner — only fires when this file is executed directly
// (e.g. `npx tsx server/seed.ts`), not when imported by the server.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedReferenceData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}
