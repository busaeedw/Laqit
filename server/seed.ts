import { db, pool } from "./db";
import {
  cities,
  carMakes,
  carModels,
  carMakeAgents,
  vendors,
  vendorUsers,
  vendorLocations,
  vendorSupportedModels,
} from "../shared/schema";
import { eq } from "drizzle-orm";
import { pathToFileURL } from "url";

/**
 * Upsert the car makes and models catalog.
 * Safe to call on every server startup — fully idempotent.
 * New makes/models added to the seed list will appear automatically
 * without wiping any existing data.
 */
export async function syncCarCatalog() {
  const makesData: { makeName: string; nameAr: string }[] = [
    { makeName: "Toyota",        nameAr: "تويوتا" },
    { makeName: "Honda",         nameAr: "هوندا" },
    { makeName: "Nissan",        nameAr: "نيسان" },
    { makeName: "Hyundai",       nameAr: "هيونداي" },
    { makeName: "Kia",           nameAr: "كيا" },
    { makeName: "Renault",       nameAr: "رينو" },
    { makeName: "Mercedes-Benz", nameAr: "مرسيدس بنز" },
    { makeName: "BMW",           nameAr: "بي إم دبليو" },
    { makeName: "Lexus",         nameAr: "لكزس" },
    { makeName: "Chevrolet",     nameAr: "شيفروليه" },
    { makeName: "Ford",          nameAr: "فورد" },
    { makeName: "GMC",           nameAr: "جي إم سي" },
    { makeName: "Audi",          nameAr: "أودي" },
    { makeName: "Mitsubishi",    nameAr: "ميتسوبيشي" },
    { makeName: "Cadillac",      nameAr: "كاديلاك" },
    { makeName: "Land Rover",    nameAr: "لاند روفر" },
    { makeName: "Jeep",          nameAr: "جيب" },
    { makeName: "Infiniti",      nameAr: "إنفينيتي" },
    { makeName: "Volkswagen",    nameAr: "فولكس واجن" },
    { makeName: "Mazda",         nameAr: "مازدا" },
    { makeName: "Dodge",         nameAr: "دودج" },
    { makeName: "RAM",           nameAr: "رام" },
    { makeName: "Suzuki",        nameAr: "سوزوكي" },
    { makeName: "MG",            nameAr: "إم جي" },
    { makeName: "Porsche",       nameAr: "بورشه" },
    { makeName: "Volvo",         nameAr: "فولفو" },
    { makeName: "Lincoln",       nameAr: "لينكولن" },
    { makeName: "Genesis",       nameAr: "جينيسيس" },
    { makeName: "Subaru",        nameAr: "سوبارو" },
    { makeName: "Isuzu",         nameAr: "إيسوزو" },
    { makeName: "BYD",           nameAr: "بي واي دي" },
    { makeName: "Geely",         nameAr: "جيلي" },
    { makeName: "Chery",         nameAr: "شيري" },
    { makeName: "Haval",         nameAr: "هافال" },
    { makeName: "Changan",       nameAr: "شانغان" },
    { makeName: "JETOUR",        nameAr: "جيتور" },
    { makeName: "GAC",           nameAr: "جاك" },
    { makeName: "Exeed",         nameAr: "إكسيد" },
  ];

  for (const m of makesData) {
    await db
      .insert(carMakes)
      .values({ makeName: m.makeName, nameAr: m.nameAr })
      .onConflictDoNothing();
    await db
      .update(carMakes)
      .set({ nameAr: m.nameAr })
      .where(eq(carMakes.makeName, m.makeName));
  }

  const allMakes = await db.select().from(carMakes);
  console.log(`Car makes: ${allMakes.length} rows`);

  const makeMap: Record<string, string> = {};
  allMakes.forEach((m) => (makeMap[m.makeName] = m.makeId));

  const modelsData: { make: string; models: string[] }[] = [
    { make: "Toyota",        models: ["Camry", "Corolla", "Land Cruiser", "Hilux", "RAV4", "Yaris", "Prado", "Rush", "FJ Cruiser", "Fortuner"] },
    { make: "Honda",         models: ["Accord", "Civic", "CR-V", "Pilot", "Odyssey", "HR-V"] },
    { make: "Nissan",        models: ["Altima", "Patrol", "Sentra", "Pathfinder", "X-Trail", "Sunny", "Navara", "Kicks", "Xterra"] },
    { make: "Hyundai",       models: ["Elantra", "Sonata", "Tucson", "Accent", "Santa Fe", "Creta", "Palisade", "i10", "i20", "i30", "Azera", "Staria"] },
    { make: "Kia",           models: ["Sportage", "Optima", "Sorento", "Picanto", "Cerato", "Carnival", "Telluride", "Stinger"] },
    { make: "Renault",       models: ["Duster", "Logan", "Symbol", "Megane", "Fluence", "Koleos", "Captur", "Sandero"] },
    { make: "Mercedes-Benz", models: ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLS", "A-Class", "CLA", "G-Class"] },
    { make: "BMW",           models: ["3 Series", "5 Series", "7 Series", "X3", "X5", "X6", "X7", "M3", "M5"] },
    { make: "Lexus",         models: ["LX", "GX", "RX", "ES", "IS", "LS", "NX", "UX"] },
    { make: "Chevrolet",     models: ["Malibu", "Tahoe", "Suburban", "Silverado", "Captiva", "TrailBlazer", "Spark"] },
    { make: "Ford",          models: ["F-150", "Explorer", "Expedition", "Ranger", "Bronco", "Edge", "Mustang", "Escape", "Fusion", "Taurus", "Transit", "Everest"] },
    { make: "GMC",           models: ["Yukon", "Sierra", "Terrain", "Acadia", "Suburban", "Canyon"] },
    { make: "Audi",          models: ["A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8", "e-tron"] },
    { make: "Mitsubishi",    models: ["Pajero", "L200", "Eclipse Cross", "ASX", "Outlander", "Attrage"] },
    { make: "Cadillac",      models: ["Escalade", "Escalade ESV", "CT5", "XT5", "XT6"] },
    { make: "Land Rover",    models: ["Range Rover", "Range Rover Sport", "Range Rover Evoque", "Defender", "Discovery", "Discovery Sport"] },
    { make: "Jeep",          models: ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Renegade", "Gladiator"] },
    { make: "Infiniti",      models: ["QX80", "QX60", "QX50", "Q50", "Q60", "QX30"] },
    { make: "Volkswagen",    models: ["Passat", "Tiguan", "Golf", "Touareg", "Polo", "Jetta"] },
    { make: "Mazda",         models: ["CX-5", "CX-9", "Mazda3", "Mazda6", "CX-3", "BT-50"] },
    { make: "Dodge",         models: ["Charger", "Challenger", "Durango", "Journey"] },
    { make: "RAM",           models: ["1500", "2500", "3500", "ProMaster"] },
    { make: "Suzuki",        models: ["Vitara", "Swift", "Jimny", "Ertiga", "Baleno", "Ciaz"] },
    { make: "MG",            models: ["MG5", "MG6", "HS", "ZS", "RX5", "T60"] },
    { make: "Porsche",       models: ["Cayenne", "Macan", "Panamera", "911", "Taycan"] },
    { make: "Volvo",         models: ["XC90", "XC60", "XC40", "S90", "S60", "V90"] },
    { make: "Lincoln",       models: ["Navigator", "Aviator", "Nautilus", "Corsair", "Continental"] },
    { make: "Genesis",       models: ["G70", "G80", "G90", "GV70", "GV80", "GV60"] },
    { make: "Subaru",        models: ["Outback", "Forester", "XV", "Impreza", "Legacy", "BRZ"] },
    { make: "Isuzu",         models: ["D-Max", "MU-X", "Trooper", "Elf"] },
    { make: "BYD",           models: ["Seal", "Atto 3", "Han", "Tang", "Song Plus", "Dolphin", "Seal U", "Sea Lion 6"] },
    { make: "Geely",         models: ["Coolray", "Tugella", "Okavango", "Preface", "Monjaro", "Emgrand"] },
    { make: "Chery",         models: ["Tiggo 4 Pro", "Tiggo 7 Pro", "Tiggo 8 Pro", "Arrizo 6 Pro", "Arrizo 8"] },
    { make: "Haval",         models: ["H6", "Jolion", "H2", "Dargo", "Big Dog", "Raptor"] },
    { make: "Changan",       models: ["CS35 Plus", "CS55 Plus", "CS75 Plus", "Alsvin", "Uni-K", "Uni-T", "Hunter"] },
    { make: "JETOUR",        models: ["X70 Plus", "X90 Plus", "Dashing", "T2", "X70S", "Traveler"] },
    { make: "GAC",           models: ["GS3", "GS4", "GS8", "GA4", "Trumpchi GS4", "Emkoo"] },
    { make: "Exeed",         models: ["TXL", "VX", "RX", "LX", "Sterra ES", "Sterra ET"] },
  ];

  const modelInserts: { makeId: string; modelName: string }[] = [];
  for (const entry of modelsData) {
    const makeId = makeMap[entry.make];
    if (!makeId) continue;
    for (const model of entry.models) {
      modelInserts.push({ makeId, modelName: model });
    }
  }

  if (modelInserts.length > 0) {
    await db.insert(carModels).values(modelInserts).onConflictDoNothing();
  }

  const allModels = await db.select().from(carModels);
  console.log(`Car models: ${allModels.length} rows`);
}

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

  // ── Car Makes + Models ───────────────────────────────────────────────────
  await syncCarCatalog();

  const allMakes = await db.select().from(carMakes);
  const makeMap: Record<string, string> = {};
  allMakes.forEach((m) => (makeMap[m.makeName] = m.makeId));

  const allModels = await db.select().from(carModels);
  const modelMap: Record<string, string> = {};
  allModels.forEach((m) => (modelMap[`${m.makeId}:${m.modelName}`] = m.carModelId));

  // ── Car Make Agents (authorized Saudi distributors) ───────────────────────
  const agentsData: {
    makeName: string;
    agentNameEn: string;
    agentNameAr: string;
    website: string;
    phone: string;
    headquartersCity: string;
  }[] = [
    { makeName: "Toyota",        agentNameEn: "Abdul Latif Jameel Motors",          agentNameAr: "عبد اللطيف جميل للسيارات",      website: "toyota.com.sa",          phone: "920000655",  headquartersCity: "Jeddah" },
    { makeName: "Lexus",         agentNameEn: "Abdul Latif Jameel Motors",          agentNameAr: "عبد اللطيف جميل للسيارات",      website: "lexus-alj.com",          phone: "920000655",  headquartersCity: "Jeddah" },
    { makeName: "JETOUR",        agentNameEn: "Abdul Latif Jameel Motors",          agentNameAr: "عبد اللطيف جميل للسيارات",      website: "jetour-ksa.com",         phone: "920000655",  headquartersCity: "Jeddah" },
    { makeName: "Honda",         agentNameEn: "Abdullah Hashim Company",            agentNameAr: "شركة عبدالله هاشم",             website: "hondasaudi.com",         phone: "920002208",  headquartersCity: "Jeddah" },
    { makeName: "Nissan",        agentNameEn: "E.A. Juffali & Brothers",            agentNameAr: "إ.أ. جفالي وإخوانه",            website: "nissan.com.sa",          phone: "920001666",  headquartersCity: "Riyadh" },
    { makeName: "Infiniti",      agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",         phone: "920002100",  headquartersCity: "Riyadh" },
    { makeName: "Mercedes-Benz", agentNameEn: "SAMACO Automotive",                  agentNameAr: "سامكو للسيارات",                website: "mercedes-benz-arabia.com",phone: "920000724", headquartersCity: "Riyadh" },
    { makeName: "BMW",           agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "bmwksa.com",             phone: "920003040",  headquartersCity: "Jeddah" },
    { makeName: "Hyundai",       agentNameEn: "Olayan Financing Company",           agentNameAr: "شركة أوليان للتمويل",           website: "hyundai.com.sa",         phone: "920001234",  headquartersCity: "Riyadh" },
    { makeName: "Genesis",       agentNameEn: "Almajdouie Motors",                  agentNameAr: "المجدوعي للسيارات",             website: "genesis.com/sa",         phone: "920001000",  headquartersCity: "Dammam" },
    { makeName: "Kia",           agentNameEn: "Al Jabr Trading & NMC",              agentNameAr: "الجابر للتجارة",                website: "kia.com.sa",             phone: "920001522",  headquartersCity: "Riyadh" },
    { makeName: "Renault",       agentNameEn: "Wallan Trading Company",             agentNameAr: "شركة وعلان للتجارة",            website: "renault.sa",             phone: "920000525",  headquartersCity: "Jeddah" },
    { makeName: "Geely",         agentNameEn: "Wallan Trading Company",             agentNameAr: "شركة وعلان للتجارة",            website: "geely.com.sa",           phone: "920000525",  headquartersCity: "Jeddah" },
    { makeName: "Ford",          agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",           phone: "920003040",  headquartersCity: "Jeddah" },
    { makeName: "Lincoln",       agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",           phone: "920003040",  headquartersCity: "Jeddah" },
    { makeName: "Chevrolet",     agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",           phone: "920003040",  headquartersCity: "Jeddah" },
    { makeName: "GMC",           agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",           phone: "920003040",  headquartersCity: "Jeddah" },
    { makeName: "Cadillac",      agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",           phone: "920003040",  headquartersCity: "Jeddah" },
    { makeName: "Land Rover",    agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",           phone: "920003040",  headquartersCity: "Jeddah" },
    { makeName: "Volvo",         agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",           phone: "920003040",  headquartersCity: "Jeddah" },
    { makeName: "Chery",         agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "chery-saudi.com",        phone: "920003040",  headquartersCity: "Jeddah" },
    { makeName: "Exeed",         agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "exeed-saudi.com",        phone: "920003040",  headquartersCity: "Jeddah" },
    { makeName: "Haval",         agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "haval-saudi.com",        phone: "920003040",  headquartersCity: "Jeddah" },
    { makeName: "Subaru",        agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "subaru-saudi.com",       phone: "920003040",  headquartersCity: "Jeddah" },
    { makeName: "Audi",          agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",         phone: "920002100",  headquartersCity: "Riyadh" },
    { makeName: "Volkswagen",    agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",         phone: "920002100",  headquartersCity: "Riyadh" },
    { makeName: "Porsche",       agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",         phone: "920002100",  headquartersCity: "Riyadh" },
    { makeName: "Jeep",          agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",         phone: "920002100",  headquartersCity: "Riyadh" },
    { makeName: "Dodge",         agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",         phone: "920002100",  headquartersCity: "Riyadh" },
    { makeName: "RAM",           agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",         phone: "920002100",  headquartersCity: "Riyadh" },
    { makeName: "Mitsubishi",    agentNameEn: "Algosaibi Motors",                   agentNameAr: "شركة الغصيبي للسيارات",         website: "algosaibi-motors.com",   phone: "920002202",  headquartersCity: "Riyadh" },
    { makeName: "MG",            agentNameEn: "SAMACO Automotive",                  agentNameAr: "سامكو للسيارات",                website: "samaco.com.sa",          phone: "920000724",  headquartersCity: "Riyadh" },
    { makeName: "Mazda",         agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "mazda.sa",               phone: "920002100",  headquartersCity: "Riyadh" },
    { makeName: "Suzuki",        agentNameEn: "National Auto Company",              agentNameAr: "الشركة الوطنية للسيارات",       website: "suzuki.sa",              phone: "920001900",  headquartersCity: "Riyadh" },
    { makeName: "BYD",           agentNameEn: "Al-Futtaim Electric Mobility",       agentNameAr: "الفطيم للتنقل الكهربائي",       website: "byd.sa",                 phone: "8003020006", headquartersCity: "Riyadh" },
    { makeName: "Changan",       agentNameEn: "Almajdouie Motors",                  agentNameAr: "المجدوعي للسيارات",             website: "changanauto.com.sa",     phone: "920001000",  headquartersCity: "Dammam" },
    { makeName: "GAC",           agentNameEn: "Aljomaih Automotive",                agentNameAr: "الجميح للسيارات",               website: "gac-motor.com.sa",       phone: "920001199",  headquartersCity: "Riyadh" },
    { makeName: "Isuzu",         agentNameEn: "Xenel Industries / Isuzu Arabia",    agentNameAr: "زينيل / إيسوزو العربية",        website: "isuzuarabia.com",        phone: "920002255",  headquartersCity: "Riyadh" },
  ];

  for (const a of agentsData) {
    const makeId = makeMap[a.makeName];
    if (!makeId) continue;
    await db
      .insert(carMakeAgents)
      .values({
        makeId,
        agentNameEn: a.agentNameEn,
        agentNameAr: a.agentNameAr,
        website: a.website,
        phone: a.phone,
        email: "wahclaw@gmail.com",
        headquartersCity: a.headquartersCity,
      })
      .onConflictDoNothing();
  }

  console.log(`Car make agents: seeded ${agentsData.length} entries`);

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
      vendorNameEn: "Al Najma Auto Parts Co.",
      phone: "0114001001",
      website: "https://alnajma-parts.sa",
      email: "info@alnajma-parts.sa",
      city: riyadhCity,
      whatsapp: "+966501111001",
      mobile: "+966501111001",
    },
    {
      vendorName: "مؤسسة الخليج لقطع السيارات",
      vendorNameEn: "Gulf Auto Parts Est.",
      phone: "0114002002",
      website: "https://gulf-autoparts.sa",
      email: "info@gulf-autoparts.sa",
      city: riyadhCity,
      whatsapp: "+966501111002",
      mobile: "+966501111002",
    },
    {
      vendorName: "مخازن جدة للقطع",
      vendorNameEn: "Jeddah Parts Warehouses",
      phone: "0122003003",
      website: null,
      email: "info@jeddah-parts.sa",
      city: jeddahCity,
      whatsapp: "+966501111003",
      mobile: "+966501111003",
    },
    {
      vendorName: "شركة الشرقية للسيارات",
      vendorNameEn: "Eastern Auto Parts Co.",
      phone: "0138004004",
      website: "https://eastern-auto.sa",
      email: "info@eastern-auto.sa",
      city: dammamCity,
      whatsapp: "+966501111004",
      mobile: "+966501111004",
    },
  ];

  for (const v of vendorsSeed) {
    const existing = await db
      .select()
      .from(vendors)
      .where(eq(vendors.vendorName, v.vendorName))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(vendors)
        .set({
          vendorNameEn: v.vendorNameEn,
          phone: v.phone,
          website: v.website ?? null,
          email: v.email,
        })
        .where(eq(vendors.vendorName, v.vendorName));
      continue;
    }

    const [vendor] = await db
      .insert(vendors)
      .values({
        vendorName: v.vendorName,
        vendorNameEn: v.vendorNameEn,
        phone: v.phone,
        website: v.website ?? null,
        email: v.email,
        status: "active",
      })
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

export async function ensureMigrations() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS car_make_agents (
          agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          make_id UUID NOT NULL UNIQUE REFERENCES car_makes(make_id),
          agent_name_en VARCHAR(200) NOT NULL,
          agent_name_ar VARCHAR(200),
          website VARCHAR(300),
          phone VARCHAR(30),
          headquarters_city VARCHAR(100),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("ensureMigrations error:", (err as Error)?.message);
  }
}

const AGENTS_ADVISORY_LOCK_KEY = 742195;

/**
 * Seeds car make agents when the table is empty, independently of seedIfEmpty.
 * Handles the case where the production DB already has cities/makes (so
 * seedIfEmpty exits early) but agents were added after the initial deploy.
 */
export async function seedAgentsIfEmpty() {
  try {
    const existing = await db.select().from(carMakeAgents).limit(1);
    if (existing.length > 0) return;

    const client = await pool.connect();
    try {
      const { rows } = await client.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS locked",
        [AGENTS_ADVISORY_LOCK_KEY],
      );
      if (!rows[0]?.locked) return;

      const recheck = await db.select().from(carMakeAgents).limit(1);
      if (recheck.length > 0) return;

      const allMakes = await db.select().from(carMakes);
      const makeMap: Record<string, string> = {};
      allMakes.forEach((m) => (makeMap[m.makeName] = m.makeId));

      const agentsData = [
        { makeName: "Toyota",        agentNameEn: "Abdul Latif Jameel Motors",          agentNameAr: "عبد اللطيف جميل للسيارات",      website: "toyota.com.sa",           phone: "920000655",  headquartersCity: "Jeddah" },
        { makeName: "Lexus",         agentNameEn: "Abdul Latif Jameel Motors",          agentNameAr: "عبد اللطيف جميل للسيارات",      website: "lexus-alj.com",           phone: "920000655",  headquartersCity: "Jeddah" },
        { makeName: "JETOUR",        agentNameEn: "Abdul Latif Jameel Motors",          agentNameAr: "عبد اللطيف جميل للسيارات",      website: "jetour-ksa.com",          phone: "920000655",  headquartersCity: "Jeddah" },
        { makeName: "Honda",         agentNameEn: "Abdullah Hashim Company",            agentNameAr: "شركة عبدالله هاشم",             website: "hondasaudi.com",          phone: "920002208",  headquartersCity: "Jeddah" },
        { makeName: "Nissan",        agentNameEn: "E.A. Juffali & Brothers",            agentNameAr: "إ.أ. جفالي وإخوانه",            website: "nissan.com.sa",           phone: "920001666",  headquartersCity: "Riyadh" },
        { makeName: "Infiniti",      agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",          phone: "920002100",  headquartersCity: "Riyadh" },
        { makeName: "Mercedes-Benz", agentNameEn: "SAMACO Automotive",                  agentNameAr: "سامكو للسيارات",                website: "mercedes-benz-arabia.com", phone: "920000724", headquartersCity: "Riyadh" },
        { makeName: "BMW",           agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "bmwksa.com",              phone: "920003040",  headquartersCity: "Jeddah" },
        { makeName: "Hyundai",       agentNameEn: "Olayan Financing Company",           agentNameAr: "شركة أوليان للتمويل",           website: "hyundai.com.sa",          phone: "920001234",  headquartersCity: "Riyadh" },
        { makeName: "Genesis",       agentNameEn: "Almajdouie Motors",                  agentNameAr: "المجدوعي للسيارات",             website: "genesis.com/sa",          phone: "920001000",  headquartersCity: "Dammam" },
        { makeName: "Kia",           agentNameEn: "Al Jabr Trading & NMC",              agentNameAr: "الجابر للتجارة",                website: "kia.com.sa",              phone: "920001522",  headquartersCity: "Riyadh" },
        { makeName: "Renault",       agentNameEn: "Wallan Trading Company",             agentNameAr: "شركة وعلان للتجارة",            website: "renault.sa",              phone: "920000525",  headquartersCity: "Jeddah" },
        { makeName: "Geely",         agentNameEn: "Wallan Trading Company",             agentNameAr: "شركة وعلان للتجارة",            website: "geely.com.sa",            phone: "920000525",  headquartersCity: "Jeddah" },
        { makeName: "Ford",          agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",            phone: "920003040",  headquartersCity: "Jeddah" },
        { makeName: "Lincoln",       agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",            phone: "920003040",  headquartersCity: "Jeddah" },
        { makeName: "Chevrolet",     agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",            phone: "920003040",  headquartersCity: "Jeddah" },
        { makeName: "GMC",           agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",            phone: "920003040",  headquartersCity: "Jeddah" },
        { makeName: "Cadillac",      agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",            phone: "920003040",  headquartersCity: "Jeddah" },
        { makeName: "Land Rover",    agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",            phone: "920003040",  headquartersCity: "Jeddah" },
        { makeName: "Volvo",         agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "my-naghi.com",            phone: "920003040",  headquartersCity: "Jeddah" },
        { makeName: "Chery",         agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "chery-saudi.com",         phone: "920003040",  headquartersCity: "Jeddah" },
        { makeName: "Exeed",         agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "exeed-saudi.com",         phone: "920003040",  headquartersCity: "Jeddah" },
        { makeName: "Haval",         agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "haval-saudi.com",         phone: "920003040",  headquartersCity: "Jeddah" },
        { makeName: "Subaru",        agentNameEn: "Mohamed Yousuf Naghi Motors",        agentNameAr: "محمد يوسف ناغي للسيارات",       website: "subaru-saudi.com",        phone: "920003040",  headquartersCity: "Jeddah" },
        { makeName: "Audi",          agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",          phone: "920002100",  headquartersCity: "Riyadh" },
        { makeName: "Volkswagen",    agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",          phone: "920002100",  headquartersCity: "Riyadh" },
        { makeName: "Porsche",       agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",          phone: "920002100",  headquartersCity: "Riyadh" },
        { makeName: "Jeep",          agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",          phone: "920002100",  headquartersCity: "Riyadh" },
        { makeName: "Dodge",         agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",          phone: "920002100",  headquartersCity: "Riyadh" },
        { makeName: "RAM",           agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "al-jazirah.com",          phone: "920002100",  headquartersCity: "Riyadh" },
        { makeName: "Mitsubishi",    agentNameEn: "Algosaibi Motors",                   agentNameAr: "شركة الغصيبي للسيارات",         website: "algosaibi-motors.com",    phone: "920002202",  headquartersCity: "Riyadh" },
        { makeName: "MG",            agentNameEn: "SAMACO Automotive",                  agentNameAr: "سامكو للسيارات",                website: "samaco.com.sa",           phone: "920000724",  headquartersCity: "Riyadh" },
        { makeName: "Mazda",         agentNameEn: "Al Jazirah Vehicles Agencies",       agentNameAr: "الجزيرة للسيارات",              website: "mazda.sa",                phone: "920002100",  headquartersCity: "Riyadh" },
        { makeName: "Suzuki",        agentNameEn: "National Auto Company",              agentNameAr: "الشركة الوطنية للسيارات",       website: "suzuki.sa",               phone: "920001900",  headquartersCity: "Riyadh" },
        { makeName: "BYD",           agentNameEn: "Al-Futtaim Electric Mobility",       agentNameAr: "الفطيم للتنقل الكهربائي",       website: "byd.sa",                  phone: "8003020006", headquartersCity: "Riyadh" },
        { makeName: "Changan",       agentNameEn: "Almajdouie Motors",                  agentNameAr: "المجدوعي للسيارات",             website: "changanauto.com.sa",      phone: "920001000",  headquartersCity: "Dammam" },
        { makeName: "GAC",           agentNameEn: "Aljomaih Automotive",                agentNameAr: "الجميح للسيارات",               website: "gac-motor.com.sa",        phone: "920001199",  headquartersCity: "Riyadh" },
        { makeName: "Isuzu",         agentNameEn: "Xenel Industries / Isuzu Arabia",    agentNameAr: "زينيل / إيسوزو العربية",        website: "isuzuarabia.com",         phone: "920002255",  headquartersCity: "Riyadh" },
      ];

      let seeded = 0;
      for (const a of agentsData) {
        const makeId = makeMap[a.makeName];
        if (!makeId) continue;
        await db
          .insert(carMakeAgents)
          .values({ makeId, agentNameEn: a.agentNameEn, agentNameAr: a.agentNameAr, website: a.website, phone: a.phone, email: "wahclaw@gmail.com", headquartersCity: a.headquartersCity })
          .onConflictDoNothing();
        seeded++;
      }
      console.log(`Car make agents: seeded ${seeded} entries`);
    } finally {
      await client
        .query("SELECT pg_advisory_unlock($1)", [AGENTS_ADVISORY_LOCK_KEY])
        .catch(() => {});
      client.release();
    }
  } catch (err) {
    console.error("seedAgentsIfEmpty error:", (err as Error)?.message);
  }
}

export async function seedIfEmpty() {
  try {
    // Guard on `cities`, NOT `car_makes` — because syncCarCatalog() runs
    // before seedIfEmpty() and always populates car_makes, so checking
    // car_makes would permanently prevent cities/vendors from being seeded
    // on a fresh database.
    const existing = await db.select().from(cities).limit(1);
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
      const recheck = await db.select().from(cities).limit(1);
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

/**
 * One-time, idempotent repair for duplicate `cities` rows.
 *
 * A prior production incident (the seed CLI block firing inside the bundled
 * server) ran `seedReferenceData()` many times, and because `cities` has no
 * unique constraint it accumulated dozens of duplicate rows per city. This
 * collapses duplicates down to one canonical row (lowest city_id) per English
 * name, repointing any foreign-key references first so the deletes are safe.
 * It is a no-op once the data is clean, so it is safe to run on every boot.
 */
const DEDUPE_ADVISORY_LOCK_KEY = 742194;

export async function dedupeCities() {
  try {
    const { rows } = await pool.query<{ total: number; uniq: number }>(
      "SELECT count(*)::int AS total, count(DISTINCT name_en)::int AS uniq FROM cities WHERE name_en IS NOT NULL",
    );
    if (!rows[0] || rows[0].total === rows[0].uniq) return; // already clean

    const client = await pool.connect();
    try {
      // Cross-instance mutual exclusion so concurrent boots don't race.
      const lock = await client.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS locked",
        [DEDUPE_ADVISORY_LOCK_KEY],
      );
      if (!lock.rows[0]?.locked) return; // another instance is repairing

      try {
        await client.query("BEGIN");

        // Re-check under the lock to avoid duplicate work.
        const recheck = await client.query<{ total: number; uniq: number }>(
          "SELECT count(*)::int AS total, count(DISTINCT name_en)::int AS uniq FROM cities WHERE name_en IS NOT NULL",
        );
        if (!recheck.rows[0] || recheck.rows[0].total === recheck.rows[0].uniq) {
          await client.query("COMMIT");
          return;
        }
        console.log(
          `Deduplicating cities (${recheck.rows[0].total} rows, ${recheck.rows[0].uniq} unique)...`,
        );

        // vendor_locations has a UNIQUE(vendor_id, city_id). If a vendor has
        // rows pointing at different duplicates that collapse to the same
        // canonical city, repointing would violate that constraint. Drop the
        // redundant rows first (keep one per vendor+canonical-city).
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

        // Repoint remaining FK references from duplicate cities to the
        // canonical (lowest city_id) row per English name. Fixed allowlist.
        const repoint = (table: string) => `
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
          "laqit_inspections",
        ]) {
          await client.query(repoint(table));
        }

        // Delete the now-unreferenced duplicate city rows.
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
        await client.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        await client
          .query("SELECT pg_advisory_unlock($1)", [DEDUPE_ADVISORY_LOCK_KEY])
          .catch(() => {});
      }
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("dedupeCities failed:", err);
  }
}

// CLI runner — only fires when this file is executed directly
// (e.g. `npx tsx server/seed.ts`), not when imported by the server.
// NOTE: the production build bundles this module INTO server_dist/index.js, so
// `import.meta.url === pathToFileURL(process.argv[1]).href` is TRUE there too.
// We must additionally require the invoked entry file to be named `seed.*`,
// otherwise this block would run (and call process.exit) inside the bundled
// server and kill it on startup.
const __entry = process.argv[1] ?? "";
const __isDirectSeedRun =
  !!process.argv[1] &&
  import.meta.url === pathToFileURL(__entry).href &&
  /(^|[\\/])seed\.(ts|js|mjs|cjs)$/.test(__entry);
if (__isDirectSeedRun) {
  seedReferenceData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed error:", err);
      process.exit(1);
    });
}
