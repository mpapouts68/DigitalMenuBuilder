/**
 * Loads shisha catalog from CSV (product/ or repo root).
 *
 * Model:
 * - One category "Shisha" with 4 products: Simple, Premium, Cannabis, Refill (base prices from your tier rules).
 * - Flavours (CSV groups 2 & 3) → multi-select **extras** (not options), so multiple flavours / refill flavour picks work.
 * - Simple & Premium: required **Size / type** (Small included … Luxury +€20), then required **bowls** (CSV group 4).
 * - Cannabis: required **bowls** only. Refill: no option groups (bowl already set).
 * - Other add-ons (group 5) → extras, excluding legacy "Refill Simple / Refill Premium" rows (those tiers are the Refill product + flavour extras).
 *
 * Run: npm run import-shisha
 */
import fs from "fs";
import path from "path";
import { initializeDatabase } from "../server/db";
import { storage } from "../server/storage";
import type { ModifierExtraInput, ModifierOptionGroupInput } from "../server/storage";

type CsvRow = Record<string, string>;

function parseCsv(content: string): CsvRow[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const rows: CsvRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = lines[li].split(",");
    if (cols.length < header.length) continue;
    const row: CsvRow = {};
    for (let i = 0; i < header.length; i++) {
      row[header[i]] = (cols[i] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

function num(row: CsvRow, key: string): number {
  const v = row[key]?.replace(",", ".").replace(/^\$/, "").trim() ?? "0";
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function findCsvFile(dir: string, predicate: (name: string) => boolean): string | null {
  if (!fs.existsSync(dir)) return null;
  for (const name of fs.readdirSync(dir)) {
    if (!name.toLowerCase().endsWith(".csv")) continue;
    if (predicate(name)) return path.join(dir, name);
  }
  return null;
}

function resolveCsvPaths(): { groups: string; products: string; extras: string } {
  const dirs = [path.join(process.cwd(), "product"), process.cwd()];
  for (const dir of dirs) {
    const groups = findCsvFile(dir, (n) => n.toLowerCase().includes("product_groups"));
    const products = findCsvFile(
      dir,
      (n) =>
        n.toLowerCase().startsWith("products") &&
        !n.toLowerCase().includes("product_groups"),
    );
    const extras = findCsvFile(dir, (n) => n.toLowerCase().startsWith("extras"));
    if (groups && products && extras) {
      console.log(`Using CSV directory: ${dir}`);
      return { groups, products, extras };
    }
  }
  throw new Error(
    "Could not find CSV set. Place product_groups*.csv, products*.csv, and extras*.csv in ./product/ or project root.",
  );
}

/** Size / head tier — Simple & Premium only (before bowl). */
function buildSizeTypeGroup(): ModifierOptionGroupInput {
  return {
    name: "Size / type",
    isRequired: 1,
    sortOrder: 0,
    options: [
      { name: "Small (included)", priceDelta: 0, sortOrder: 0, isDefault: 1 },
      { name: "Medium", priceDelta: 5, sortOrder: 1, isDefault: 0 },
      { name: "Big", priceDelta: 10, sortOrder: 2, isDefault: 0 },
      { name: "Premium", priceDelta: 15, sortOrder: 3, isDefault: 0 },
      { name: "Luxury", priceDelta: 20, sortOrder: 4, isDefault: 0 },
    ],
  };
}

function buildBowlGroup(rows: CsvRow[], groupSortOrder: number): ModifierOptionGroupInput {
  const sorted = [...rows].sort((a, b) => num(a, "Product_ID") - num(b, "Product_ID"));
  const defaultIndex = Math.max(sorted.findIndex((row) => num(row, "Price") <= 0), 0);
  return {
    name: "Bowl choices",
    isRequired: 1,
    sortOrder: groupSortOrder,
    options: sorted.map((r, i) => ({
      name: r.Description?.trim() || `Bowl ${i + 1}`,
      priceDelta: num(r, "Price"),
      sortOrder: i,
      isDefault: i === defaultIndex ? 1 : 0,
    })),
  };
}

function rowsToFlavourExtras(
  rows: CsvRow[],
  priceFor: (row: CsvRow) => number,
  sortBase: number,
): ModifierExtraInput[] {
  const sorted = [...rows].sort((a, b) => num(a, "Product_ID") - num(b, "Product_ID"));
  return sorted.map((r, i) => {
    const name = (r.Description || "").trim();
    return {
      name: name || `Flavour ${i + 1}`,
      priceDelta: priceFor(r),
      sortOrder: sortBase + i,
    };
  });
}

function isLegacyRefillProductLine(row: CsvRow): boolean {
  return /refill\s*simple|refill\s*premium/i.test(row.Description || "");
}

function buildAddonExtras(rows: CsvRow[]): ModifierExtraInput[] {
  const sorted = [...rows].filter((r) => !isLegacyRefillProductLine(r)).sort(
    (a, b) => num(a, "Product_ID") - num(b, "Product_ID"),
  );
  return sorted.map((r, i) => ({
    name: (r.Description || "").trim() || `Add-on ${i + 1}`,
    priceDelta: num(r, "Price"),
    sortOrder: 500 + i,
  }));
}

type BaseKey = "simple" | "premium" | "cannabis" | "refill";

function combinedExtras(
  key: BaseKey,
  simpleRows: CsvRow[],
  premiumRows: CsvRow[],
  addonExtras: ModifierExtraInput[],
): ModifierExtraInput[] {
  const out: ModifierExtraInput[] = [];

  if (key === "simple") {
    out.push(
      ...rowsToFlavourExtras(simpleRows, (r) => (num(r, "Price") > 0 ? num(r, "Price") : 0), 0),
      ...rowsToFlavourExtras(premiumRows, () => 10, 100),
    );
  } else if (key === "premium") {
    out.push(
      ...rowsToFlavourExtras(premiumRows, () => 0, 0),
      ...rowsToFlavourExtras(simpleRows, () => 0, 100),
    );
  } else if (key === "cannabis") {
    out.push(
      { name: "Cannabis flavour (add details in notes if needed)", priceDelta: 0, sortOrder: 0 },
      ...rowsToFlavourExtras(simpleRows, () => 0, 10),
      ...rowsToFlavourExtras(premiumRows, () => 0, 200),
    );
  } else {
    // refill: pick simple and/or premium flavour; premium row +€5 vs simple-refill base (20−15)
    out.push(
      ...rowsToFlavourExtras(simpleRows, () => 0, 0),
      ...rowsToFlavourExtras(premiumRows, () => 5, 100),
    );
  }

  out.push(...addonExtras);
  return out;
}

async function main() {
  const { groups: _groupsPath, products: productsPath, extras: extrasPath } = resolveCsvPaths();

  const productLines = parseCsv(fs.readFileSync(productsPath, "utf-8"));
  const extraLines = parseCsv(fs.readFileSync(extrasPath, "utf-8"));
  const allRows = [...productLines, ...extraLines];

  const byGroup = new Map<number, CsvRow[]>();
  for (const r of allRows) {
    const gid = Math.round(num(r, "ProductGroup_ID"));
    if (!gid) continue;
    const list = byGroup.get(gid) ?? [];
    list.push(r);
    byGroup.set(gid, list);
  }

  const simpleRows = byGroup.get(2) ?? [];
  const premiumRows = byGroup.get(3) ?? [];
  const bowlRows = byGroup.get(4) ?? [];
  const extraRows = byGroup.get(5) ?? [];

  if (bowlRows.length === 0) {
    throw new Error("No rows with ProductGroup_ID = 4 (bowl choices). Check extras CSV.");
  }
  if (simpleRows.length === 0 && premiumRows.length === 0) {
    throw new Error("No flavour rows in groups 2 or 3. Check extras CSV.");
  }

  const sizeTypeGroup = buildSizeTypeGroup();
  const addonExtras = buildAddonExtras(extraRows);

  await initializeDatabase();
  console.log("Clearing menu (categories, products, modifiers)...");
  await storage.clearMenuCatalog();

  const category = await storage.createCategory({
    name: "Shisha",
    order: 1,
  });
  console.log(`Category: ${category.name}`);

  const bases: Array<{
    key: BaseKey;
    name: string;
    price: number;
    description: string;
  }> = [
    {
      key: "simple",
      name: "Simple",
      price: 20,
      description:
        "Simple shisha (€20). Choose size/type, bowl, then one or more flavours and optional add-ons.",
    },
    {
      key: "premium",
      name: "Premium",
      price: 30,
      description:
        "Premium shisha (€30). Choose size/type, bowl, flavour(s), and optional add-ons. Simple flavours are included at no extra charge.",
    },
    {
      key: "cannabis",
      name: "Cannabis",
      price: 40,
      description:
        "Cannabis session (€40). Select flavour(s) and bowl; use notes for specifics where needed.",
    },
    {
      key: "refill",
      name: "Refill",
      price: 15,
      description:
        "Refill (€15 simple tier). Pick flavour(s): simple flavours included; premium flavours add €5 each. Optional add-ons below — no bowl choice (already from your session).",
    },
  ];

  let created = 0;
  for (const b of bases) {
    const product = await storage.createProduct({
      name: b.name,
      price: b.price,
      description: b.description,
      details: "",
      imageUrl: "",
      categoryId: category.id,
    });
    const extras = combinedExtras(b.key, simpleRows, premiumRows, addonExtras);
    let optionGroups: ModifierOptionGroupInput[];
    if (b.key === "refill") {
      optionGroups = [];
    } else if (b.key === "simple" || b.key === "premium") {
      optionGroups = [sizeTypeGroup, buildBowlGroup(bowlRows, 1)];
    } else {
      optionGroups = [buildBowlGroup(bowlRows, 0)];
    }
    await storage.replaceProductModifiers(product.id, optionGroups, extras);
    created += 1;
    const og =
      b.key === "refill" ? "none" : b.key === "simple" || b.key === "premium" ? "size+bowl" : "bowl";
    console.log(`  + ${b.name} (€${b.price}) — ${extras.length} extras; options: ${og}`);
  }

  console.log(`Done. ${created} base products; flavours are multi-select extras; defaults set for size and bowl.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
