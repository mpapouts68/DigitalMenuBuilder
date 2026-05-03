/**
 * Wipes menu and loads attached_assets/shisha_catalog.json (legacy / hand-edited).
 * Prefer: npm run import-shisha (CSV from ./product/).
 */
import fs from "fs";
import path from "path";
import { initializeDatabase } from "../server/db";
import { storage } from "../server/storage";
import type { ModifierExtraInput, ModifierOptionGroupInput } from "../server/storage";

interface CatalogOption {
  name: string;
  priceDelta: number;
}

interface CatalogGroup {
  name: string;
  isRequired?: number;
  sortOrder?: number;
  options: CatalogOption[];
}

interface CatalogCategory {
  name: string;
  order: number;
  price: number;
  flavours: string[];
}

interface ShishaCatalogFile {
  categories: CatalogCategory[];
  shishaTypeGroup: CatalogGroup;
  bowlTypeGroup: CatalogGroup;
  extras: CatalogOption[];
}

function toModifierGroups(catalog: ShishaCatalogFile): ModifierOptionGroupInput[] {
  const mapGroup = (g: CatalogGroup, fallbackSort: number): ModifierOptionGroupInput => ({
    name: g.name,
    isRequired: g.isRequired ?? 1,
    sortOrder: g.sortOrder ?? fallbackSort,
    options: g.options.map((o, i) => ({
      name: o.name,
      priceDelta: o.priceDelta,
      sortOrder: i,
    })),
  });

  return [
    mapGroup(catalog.shishaTypeGroup, 0),
    mapGroup(catalog.bowlTypeGroup, 1),
  ];
}

function toExtras(catalog: ShishaCatalogFile): ModifierExtraInput[] {
  return catalog.extras.map((e, i) => ({
    name: e.name,
    priceDelta: e.priceDelta,
    sortOrder: i,
  }));
}

async function main() {
  const catalogPath = path.join(process.cwd(), "attached_assets", "shisha_catalog.json");
  const raw = fs.readFileSync(catalogPath, "utf-8");
  const catalog = JSON.parse(raw) as ShishaCatalogFile;

  if (!Array.isArray(catalog.categories) || catalog.categories.length === 0) {
    throw new Error("shisha_catalog.json: missing categories");
  }

  await initializeDatabase();

  console.log("Clearing menu (categories, products, modifiers)...");
  await storage.clearMenuCatalog();

  const optionGroups = toModifierGroups(catalog);
  const extras = toExtras(catalog);

  let productCount = 0;
  for (const cat of catalog.categories) {
    const category = await storage.createCategory({
      name: cat.name,
      order: cat.order,
    });
    console.log(`Category: ${cat.name} (€${cat.price})`);

    for (const flavourName of cat.flavours) {
      const name = flavourName.trim();
      if (!name) continue;

      const product = await storage.createProduct({
        name,
        price: cat.price,
        description: `${name} — ${cat.name}. Choose shisha type, bowl, and optional extras.`,
        details: "",
        imageUrl: "",
        categoryId: category.id,
      });

      await storage.replaceProductModifiers(product.id, optionGroups, extras);
      productCount += 1;
      console.log(`  + ${name}`);
    }
  }

  console.log(`Done. ${catalog.categories.length} categories, ${productCount} flavours (shared modifier template on each).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
