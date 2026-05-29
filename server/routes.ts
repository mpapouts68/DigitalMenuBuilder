import type { Express } from "express";
import { createServer, type Server } from "http";
import net from "net";
import { storage } from "./storage";
import {
  insertBannerSchema,
  insertBrandingSettingsSchema,
  insertCategorySchema,
  insertPaymentSettingsSchema,
  insertPrinterSettingsSchema,
  insertProductSchema,
  insertQrGroupSchema,
  type InsertProduct,
} from "@shared/schema";
import {
  getCurrentUser,
  isAdmin,
  isAuthenticated,
  isPrinterOrAdmin,
  login,
  loginWithPasscode,
  logout,
  updateAdminPasscode,
  verifyAdminPasscode,
} from "./auth";
import { z } from "zod";
import { hasVivaCredentials } from "./viva/config";
import { registerVivaPaymentRoutes } from "./viva/routes";

export async function registerRoutes(app: Express): Promise<Server> {
  const embeddedPrinterEnabled =
    process.env.EMBEDDED_PRINTER_ENABLED === "1" ||
    (process.env.EMBEDDED_PRINTER_ENABLED !== "0" && process.env.NODE_ENV !== "production");

  const isCardPaymentEnabled = async () => {
    const settings = await storage.getPaymentSettings();
    return Number(settings?.cardEnabled ?? 1) === 1;
  };

  const resolveDefaultBeepMode = (normalizedProfile: string): "off" | "bel" | "esc_b" | "esc_p" | "both" | "both_plus_p" => {
    if (
      normalizedProfile === "samsung_srp" ||
      normalizedProfile === "samsung_srp_font_b" ||
      normalizedProfile === "samsung_srp_legacy"
    ) {
      return "both_plus_p";
    }
    if (normalizedProfile === "gprinter_escpos") {
      return "bel";
    }
    return "off";
  };

  const buildBeepCommand = (mode: string, count = 4, timing = 3): string => {
    const escPBuzzer = "\x1Bp\x00\x40\x40"; // ESC p m t1 t2
    const n = Math.max(1, Math.min(9, Math.round(Number(count) || 4)));
    const t = Math.max(1, Math.min(9, Math.round(Number(timing) || 3)));
    const escBBeep = `\x1B\x42${String.fromCharCode(n)}${String.fromCharCode(t)}`; // ESC B n t
    const beepMode = (mode || "off").trim().toLowerCase();
    return beepMode === "bel"
      ? "\x07\x07\x07"
      : beepMode === "esc_b"
        ? escBBeep
        : beepMode === "esc_p"
          ? `${escPBuzzer}${escPBuzzer}`
          : beepMode === "both_plus_p"
            ? `\x07\x07\x07${escBBeep}${escPBuzzer}${escPBuzzer}`
            : beepMode === "both"
              ? `\x07\x07\x07${escBBeep}`
              : "";
  };

  const formatReceipt = (
    payload: any,
    printerProfile = "generic_escpos",
    beepModeOverride: string | undefined = undefined,
    beepCountOverride: number | undefined = undefined,
    beepTimingOverride: number | undefined = undefined,
  ): string => {
    const normalizedProfile = String(printerProfile || "generic_escpos").trim().toLowerCase();
    const alignCenter = "\x1Ba\x01";
    const alignLeft = "\x1Ba\x00";
    const boldOn = "\x1BE\x01";
    const boldOff = "\x1BE\x00";
    const fontA = "\x1BM\x00";
    const fontB = "\x1BM\x01";
    const gsSizeNormal = "\x1D!\x00";
    const gsSizeTall = "\x1D!\x01";
    const gsSizeWide = "\x1D!\x10";
    const gsSizeBig = "\x1D!\x11";
    const largeOn = "\x1B!\x30";
    const mediumOn = "\x1B!\x10";
    const normal = "\x1B!\x00";
    const profileDefaults =
      normalizedProfile === "samsung_srp"
        ? {
            centerTitle: true,
            boldTitle: true,
            largeTitle: true,
            defaultBeep: resolveDefaultBeepMode(normalizedProfile),
            bodyMode: `${fontA}${normal}${gsSizeNormal}`,
            bodyReset: `${gsSizeNormal}`,
          }
        : normalizedProfile === "samsung_srp_font_b"
          ? {
              centerTitle: true,
              boldTitle: true,
              largeTitle: true,
              defaultBeep: resolveDefaultBeepMode(normalizedProfile),
              bodyMode: `${fontB}\x0F${normal}${gsSizeTall}`,
              bodyReset: `\x12${gsSizeNormal}`,
            }
          : normalizedProfile === "samsung_srp_legacy"
            ? {
                centerTitle: true,
                boldTitle: true,
                largeTitle: true,
                defaultBeep: resolveDefaultBeepMode(normalizedProfile),
                bodyMode: `${fontA}${mediumOn}${gsSizeTall}`,
                bodyReset: `${gsSizeNormal}`,
              }
            : normalizedProfile === "gprinter_escpos"
              ? {
                  centerTitle: true,
                  boldTitle: true,
                  largeTitle: true,
                  defaultBeep: resolveDefaultBeepMode(normalizedProfile),
                  bodyMode: `${fontA}${mediumOn}${gsSizeTall}`,
                  bodyReset: `${gsSizeNormal}`,
                }
              : {
                  centerTitle: false,
                  boldTitle: false,
                  largeTitle: true,
                  defaultBeep: resolveDefaultBeepMode(normalizedProfile),
                  bodyMode: `${fontA}${mediumOn}${gsSizeNormal}`,
                  bodyReset: `${gsSizeNormal}`,
                };

    if (!("bodyReset" in profileDefaults)) {
      (profileDefaults as any).bodyReset = "";
    }
    const selectedBeepMode = beepModeOverride && beepModeOverride !== "auto" ? beepModeOverride : process.env.PRINTER_BEEP_MODE || profileDefaults.defaultBeep;
    const beepMode = selectedBeepMode.trim().toLowerCase();
    const beepCommand = buildBeepCommand(beepMode, beepCountOverride, beepTimingOverride);

    if (payload?.type === "printer_test") {
      const testBodyMode = profileDefaults.bodyMode;
      const testLines = [
        "------------------------------",
        `Time: ${new Date().toLocaleString()}`,
        `Profile: ${normalizedProfile}`,
        `Beep mode: ${beepMode}`,
        "FONT CHECK: 1234567890 ABCDEFG",
        "WRAP CHECK: 12345678901234567890123456789012345678901234567890",
        "Connection OK",
        "------------------------------",
        "",
      ];
      const titleAlignOn = profileDefaults.centerTitle ? alignCenter : alignLeft;
      const titleAlignOff = alignLeft;
      const titleWeightOn = boldOn;
      const titleWeightOff = boldOff;
      const titleSizeOn = gsSizeBig;
      return [
        beepCommand,
        titleAlignOn,
        titleWeightOn,
        titleSizeOn,
        "PRINTER TEST",
        "\n",
        titleWeightOff,
        titleAlignOff,
        testBodyMode,
        testLines.join("\n"),
        "\n",
        fontA,
        normal,
        gsSizeNormal,
        "GS!00 NORMAL SAMPLE",
        "\n",
        fontA,
        normal,
        gsSizeTall,
        "GS!01 TALL SAMPLE",
        "\n",
        fontA,
        normal,
        gsSizeTall,
        "GS!01 TALL SAMPLE (replacing GS!10)",
        "\n",
        fontA,
        normal,
        gsSizeBig,
        "GS!11 BIG SAMPLE",
        "\n",
        fontA,
        mediumOn,
        "BODY MEDIUM SAMPLE",
        "\n",
        fontB,
        normal,
        "BODY FONT-B SAMPLE",
        "\n",
        profileDefaults.bodyReset,
        normal,
      ].join("");
    }

    if (payload?.type === "cash_payment_notice" && payload?.order) {
      const o = payload.order;
      const lines = [
        "------------------------------",
        `Order: ${o.orderNumber || o.id}`,
        `Time: ${new Date(o.createdAt || Date.now()).toLocaleString()}`,
        `Service: ${String(o.serviceMode || "pickup").toUpperCase()}`,
        `Total: EUR ${Number(o.total || 0).toFixed(2)}`,
        "",
        "AWAITING PAYMENT",
        "Order continues after payment",
        "at the Shisha bar.",
        "Press PAID to release order print.",
        "",
      ];
      const titleAlignOn = profileDefaults.centerTitle ? alignCenter : alignLeft;
      const titleAlignOff = alignLeft;
      const titleWeightOn = boldOn;
      const titleWeightOff = boldOff;
      const titleSizeOn = profileDefaults.largeTitle ? largeOn : mediumOn;
      return [
        beepCommand,
        titleAlignOn,
        titleWeightOn,
        titleSizeOn,
        "CASH ORDER RECEIVED",
        "\n",
        titleWeightOff,
        titleAlignOff,
        profileDefaults.bodyMode,
        gsSizeTall,
        lines.join("\n"),
        "\n",
        profileDefaults.bodyReset,
        normal,
      ].join("");
    }

    const order = payload?.order;
    const items = payload?.items ?? [];
    if (!order) return "";

    const orderInfoLines: string[] = [];
    orderInfoLines.push("------------------------------");
    orderInfoLines.push(`Order: ${order.orderNumber}`);
    orderInfoLines.push(`Time: ${new Date(order.createdAt).toLocaleString()}`);
    orderInfoLines.push(`Service: ${String(order.serviceMode || "pickup").toUpperCase()}`);
    if (order.serviceMode === "table") {
      if (order.tableCode) orderInfoLines.push(`Table: ${order.tableCode}`);
      if (order.tableLabel) orderInfoLines.push(`Table label: ${order.tableLabel}`);
    } else if (order.pickupPoint) {
      orderInfoLines.push(`Pickup: ${order.pickupPoint}`);
    }
    if (order.customerName) orderInfoLines.push(`Name: ${order.customerName}`);
    if (order.customerPhone) orderInfoLines.push(`Phone: ${order.customerPhone}`);
    orderInfoLines.push("------------------------------");

    const itemBlockLines: string[] = [];
    for (const item of items) {
      // ITEM TITLE = GS!11
      itemBlockLines.push(`${boldOn}${gsSizeBig}${item.quantity}x ${item.productName}${boldOff}`);
      const modifiers = item.modifiers ?? [];
      // ITEM EXTRAS/OPTIONS = GS!01
      for (const modifier of modifiers) {
        const modifierPrice = Number(modifier.priceDelta || 0);
        const modifierSuffix = modifierPrice > 0 ? ` (+${modifierPrice.toFixed(2)})` : "";
        const mq = Math.max(1, Math.round(Number((modifier as { quantity?: number }).quantity ?? 1)));
        const qtyPrefix = mq > 1 ? `${mq}x ` : "";
        const groupPrefix =
          (modifier as { modifierType?: string }).modifierType === "extra" &&
          (modifier as { modifierGroupName?: string | null }).modifierGroupName
            ? `[${String((modifier as { modifierGroupName?: string | null }).modifierGroupName)}] `
            : "";
        itemBlockLines.push(
          `${gsSizeTall}  - ${groupPrefix}${qtyPrefix}${modifier.modifierName}${modifierSuffix}`,
        );
      }
      if (item.notes) itemBlockLines.push(`${gsSizeTall}  Note: ${item.notes}`);
      itemBlockLines.push(`${gsSizeTall}  Line: EUR ${Number(item.lineTotal || 0).toFixed(2)}`);
      itemBlockLines.push("");
    }

    const footerLines: string[] = [];
    footerLines.push("------------------------------");
    // TOTAL = GS!11
    footerLines.push(`${boldOn}${gsSizeBig}TOTAL: EUR ${Number(order.total || 0).toFixed(2)}${boldOff}`);
    if (order.notes) footerLines.push(`${gsSizeTall}Order note: ${order.notes}`);
    footerLines.push(`${gsSizeTall}Thank you`);
    footerLines.push("");
    const titleAlignOn = profileDefaults.centerTitle ? alignCenter : alignLeft;
    const titleAlignOff = alignLeft;
    const titleWeightOn = boldOn;
    const titleWeightOff = boldOff;
    const titleSizeOn = gsSizeBig;
    return [
      beepCommand,
      titleAlignOn,
      titleWeightOn,
      titleSizeOn,
      "TICKET",
      "\n",
      titleWeightOff,
      titleAlignOff,
      profileDefaults.bodyMode,
      // ORDER INFO = GS!01
      gsSizeTall,
      orderInfoLines.join("\n"),
      "\n",
      itemBlockLines.join("\n"),
      "\n",
      footerLines.join("\n"),
      "\n",
      profileDefaults.bodyReset,
      gsSizeNormal,
      normal,
    ].join("");
  };

  const sendToNetworkPrinter = (host: string, port: number, content: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port }, () => {
        const feedCommand = "\x1Bd\x05"; // feed 5 lines to avoid tail cut-off
        const cutCommand = "\x1dV\x00";
        // ESC/POS control bytes must be sent as raw 8-bit bytes.
        socket.write(content, "latin1");
        socket.write(feedCommand, "binary");
        socket.write(cutCommand, "binary");
        socket.end();
      });

      socket.setTimeout(7000);
      socket.on("timeout", () => {
        socket.destroy();
        reject(new Error("Printer connection timed out"));
      });
      socket.on("error", (error) => reject(error));
      socket.on("close", () => resolve());
    });
  };

  const EMBEDDED_PRINTER_LOCK_TOKEN = "embedded-printer-worker";
  let embeddedPrinterBusy = false;
  const triggerEmbeddedPrinterTick = () => {
    if (!embeddedPrinterEnabled) return;
    // Fire-and-forget kick to reduce print latency right after queueing jobs.
    setTimeout(() => {
      runEmbeddedPrinterTick().catch((error) => {
        const message = error instanceof Error ? error.message : "Unknown embedded printer error";
        console.error("Embedded printer tick failed:", message);
      });
    }, 0);
  };

  const runEmbeddedPrinterTick = async () => {
    if (embeddedPrinterBusy) return;
    embeddedPrinterBusy = true;
    try {
      const settings = await storage.getPrinterSettings();
      if (!settings || !settings.enabled || !settings.printerIp) {
        return;
      }

      const now = Date.now();
      const externalLockActive =
        !!settings.lockToken &&
        settings.lockToken !== EMBEDDED_PRINTER_LOCK_TOKEN &&
        !!settings.lockExpiresAt &&
        settings.lockExpiresAt >= now;
      if (externalLockActive) {
        // Dedicated printer page owns dispatch at the moment.
        return;
      }

      const acquired = await storage.acquirePrinterLock(
        EMBEDDED_PRINTER_LOCK_TOKEN,
        "server@embedded",
        15000,
      );
      if (!acquired.acquired) return;

      const [nextJob] = await storage.getDispatchablePrintJobs(1);
      if (!nextJob) {
        await storage.updatePrinterHeartbeat("idle");
        return;
      }

      let parsedPayload: any = {};
      try {
        parsedPayload = JSON.parse(nextJob.payload);
      } catch {
        await storage.failPrintJob(nextJob.id, "Invalid print payload JSON");
        await storage.updatePrinterHeartbeat("error", "Invalid print payload JSON");
        return;
      }

      const receipt = formatReceipt(
        parsedPayload,
        settings.printerProfile ?? "generic_escpos",
        settings.printerBeepMode ?? "auto",
        settings.printerBeepCount ?? 4,
        settings.printerBeepTiming ?? 3,
      );
      if (!receipt) {
        await storage.failPrintJob(nextJob.id, "Missing order payload");
        await storage.updatePrinterHeartbeat("error", "Missing order payload");
        return;
      }

      try {
        await sendToNetworkPrinter(settings.printerIp, settings.printerPort, receipt);
        await storage.completePrintJob(nextJob.id);
        await storage.updatePrinterHeartbeat("printed");
      } catch (printerError) {
        const message = printerError instanceof Error ? printerError.message : "Printer dispatch failed";
        await storage.failPrintJob(nextJob.id, message);
        await storage.updatePrinterHeartbeat("error", message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown embedded printer error";
      console.error("Embedded printer worker error:", message);
    } finally {
      await storage.releasePrinterLock(EMBEDDED_PRINTER_LOCK_TOKEN);
      embeddedPrinterBusy = false;
    }
  };

  if (embeddedPrinterEnabled) {
    // Fallback worker: progress queue even when /printer page is closed.
    setInterval(() => {
      runEmbeddedPrinterTick().catch((error) => {
        const message = error instanceof Error ? error.message : "Unknown embedded printer error";
        console.error("Embedded printer interval tick failed:", message);
      });
    }, 3000);
  }

  const modifierOptionSchema = z.object({
    name: z.string().min(1),
    priceDelta: z.number().default(0),
    sortOrder: z.number().int().optional(),
    isActive: z.number().int().min(0).max(1).optional(),
    isDefault: z.number().int().min(0).max(1).optional(),
    imageUrl: z.string().max(12_000_000).optional().nullable(),
  });

  const modifierGroupSchema = z.object({
    name: z.string().min(1),
    isRequired: z.number().int().min(0).max(1).optional(),
    sortOrder: z.number().int().optional(),
    options: z.array(modifierOptionSchema),
  });

  const modifierExtraSchema = z.object({
    name: z.string().min(1),
    priceDelta: z.number().default(0),
    sortOrder: z.number().int().optional(),
    isActive: z.number().int().min(0).max(1).optional(),
    imageUrl: z.string().max(12_000_000).optional().nullable(),
    groupName: z.string().max(120).optional().nullable(),
    maxQuantity: z.number().int().min(1).max(99).optional(),
  });

  const updateModifiersSchema = z.object({
    optionGroups: z.array(modifierGroupSchema).default([]),
    extras: z.array(modifierExtraSchema).default([]),
    maxFlavourSelections: z.number().int().min(0).max(50).optional(),
    maxAddonSelections: z.number().int().min(0).max(50).optional(),
    flavourSectionTitle: z.string().max(80).optional(),
    flavourSectionDescription: z.string().max(240).optional(),
    addonSectionTitle: z.string().max(80).optional(),
    addonSectionDescription: z.string().max(240).optional(),
  });

  const orderItemSchema = z.object({
    productId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
    selectedOptions: z.array(z.object({
      groupName: z.string().optional(),
      name: z.string().min(1),
      priceDelta: z.number().optional(),
    })).optional(),
    selectedExtras: z.array(z.object({
      name: z.string().min(1),
      priceDelta: z.number().optional(),
      quantity: z.number().int().positive().optional(),
      groupName: z.string().max(120).optional(),
    })).optional(),
  });

  const createOrderSchema = z.object({
    payment: z
      .object({
        method: z.enum(["cash", "card"]).optional(),
        status: z.enum(["not_required", "pending", "authorized", "succeeded", "failed"]).optional(),
        provider: z.string().optional(),
        intentId: z.string().optional(),
      })
      .optional(),
    serviceMode: z.enum(["table", "pickup"]).optional(),
    tableCode: z.string().optional(),
    tableLabel: z.string().optional(),
    pickupPoint: z.string().optional(),
    sourceToken: z.string().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(orderItemSchema).min(1),
  }).superRefine((value, ctx) => {
    if (value.serviceMode === "table" && !value.tableCode?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "tableCode is required when serviceMode is table",
        path: ["tableCode"],
      });
    }
  });

  const closeDaySchema = z.object({
    businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    purgeBeforeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  });
  const printerHeartbeatSchema = z.object({
    status: z.string().min(1),
    errorMessage: z.string().optional(),
    lockToken: z.string().min(8),
  });
  const printerLockSchema = z.object({
    lockToken: z.string().min(8),
    holder: z.string().min(1),
    leaseMs: z.number().int().min(5000).max(120000).optional(),
  });
  const printerLockReleaseSchema = z.object({
    lockToken: z.string().min(8),
  });
  const printerDispatchSchema = z.object({
    lockToken: z.string().min(8),
  });
  const printerJobActionSchema = z.object({
    lockToken: z.string().min(8),
    errorMessage: z.string().min(1).optional(),
  });
  const updateOrderStatusSchema = z.object({
    status: z.enum(["preparing", "ready", "served"]),
  });
  const updateAdminPasscodeSchema = z.object({
    currentPasscode: z.string().min(1),
    newPasscode: z.string().min(4),
  });
  const updateQrGroupSchema = insertQrGroupSchema.partial().superRefine((value, ctx) => {
    if (value.tableStart !== undefined && value.tableEnd !== undefined && value.tableEnd < value.tableStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tableEnd"],
        message: "tableEnd must be greater than or equal to tableStart",
      });
    }
  });

  // Auth routes
  app.post('/api/auth/login', login);
  app.post('/api/auth/passcode', loginWithPasscode);
  app.post('/api/auth/logout', logout);
  app.get('/api/auth/user', isAuthenticated, getCurrentUser);
  app.put("/api/admin/security/passcode", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const payload = updateAdminPasscodeSchema.parse(req.body);
      const validCurrent = await verifyAdminPasscode(payload.currentPasscode);
      if (!validCurrent) {
        return res.status(401).json({ message: "Current passcode is incorrect" });
      }
      await updateAdminPasscode(payload.newPasscode);
      return res.json({ status: "ok", message: "Admin passcode updated" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid passcode payload", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to update admin passcode" });
    }
  });

  // Categories (public read, protected write)
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid category data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  app.put("/api/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, categoryData);
      if (!category) {
        res.status(404).json({ message: "Category not found" });
      } else {
        res.json(category);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid category data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update category" });
      }
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteCategory(id);
      if (!deleted) {
        res.status(404).json({ message: "Category not found" });
      } else {
        res.status(204).send();
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Products (public read, protected write)
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/category/:categoryId", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const products = await storage.getProductsByCategory(categoryId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Product modifier routes (public read, protected write)
  app.get("/api/products/:productId/modifiers", async (req, res) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      const modifiers = await storage.getProductModifiers(productId);
      const product = await storage.getProduct(productId);
      const maxFlavourSelections = product
        ? Math.max(0, Math.round(Number((product as any).maxFlavourSelections ?? 0)))
        : 0;
      const maxAddonSelections = product
        ? Math.max(0, Math.round(Number((product as any).maxAddonSelections ?? 0)))
        : 0;
      res.json({
        ...modifiers,
        maxFlavourSelections,
        maxAddonSelections,
        flavourSectionTitle: (product as any)?.flavourSectionTitle ?? null,
        flavourSectionDescription: (product as any)?.flavourSectionDescription ?? null,
        addonSectionTitle: (product as any)?.addonSectionTitle ?? null,
        addonSectionDescription: (product as any)?.addonSectionDescription ?? null,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product modifiers" });
    }
  });

  app.put("/api/products/:productId/modifiers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const productId = parseInt(req.params.productId, 10);
      const payload = updateModifiersSchema.parse(req.body);
      const modifiers = await storage.replaceProductModifiers(productId, payload.optionGroups, payload.extras);
      const productPatch: Partial<InsertProduct> = {};
      if (payload.maxFlavourSelections !== undefined) {
        productPatch.maxFlavourSelections = payload.maxFlavourSelections;
      }
      if (payload.maxAddonSelections !== undefined) {
        productPatch.maxAddonSelections = payload.maxAddonSelections;
      }
      if (payload.flavourSectionTitle !== undefined) {
        productPatch.flavourSectionTitle = payload.flavourSectionTitle.trim() || undefined;
      }
      if (payload.flavourSectionDescription !== undefined) {
        productPatch.flavourSectionDescription = payload.flavourSectionDescription.trim() || undefined;
      }
      if (payload.addonSectionTitle !== undefined) {
        productPatch.addonSectionTitle = payload.addonSectionTitle.trim() || undefined;
      }
      if (payload.addonSectionDescription !== undefined) {
        productPatch.addonSectionDescription = payload.addonSectionDescription.trim() || undefined;
      }
      if (Object.keys(productPatch).length > 0) {
        await storage.updateProduct(productId, productPatch);
      }
      const product = await storage.getProduct(productId);
      const maxFlavourSelections = product
        ? Math.max(0, Math.round(Number((product as any).maxFlavourSelections ?? 0)))
        : 0;
      const maxAddonSelections = product
        ? Math.max(0, Math.round(Number((product as any).maxAddonSelections ?? 0)))
        : 0;
      res.json({
        ...modifiers,
        maxFlavourSelections,
        maxAddonSelections,
        flavourSectionTitle: (product as any)?.flavourSectionTitle ?? null,
        flavourSectionDescription: (product as any)?.flavourSectionDescription ?? null,
        addonSectionTitle: (product as any)?.addonSectionTitle ?? null,
        addonSectionDescription: (product as any)?.addonSectionDescription ?? null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid modifier payload", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update modifiers" });
      }
    }
  });

  app.post("/api/products", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid product data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create product" });
      }
    }
  });

  app.put("/api/products/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, productData);
      if (!product) {
        res.status(404).json({ message: "Product not found" });
      } else {
        res.json(product);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid product data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update product" });
      }
    }
  });

  app.delete("/api/products/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);
      if (!deleted) {
        res.status(404).json({ message: "Product not found" });
      } else {
        res.status(204).send();
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Import/Export
  app.post("/api/import", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { categories, products } = req.body;
      
      const validatedCategories = categories.map((cat: any) => insertCategorySchema.parse(cat));
      const validatedProducts = products.map((prod: any) => insertProductSchema.parse(prod));
      
      await storage.importData(validatedCategories, validatedProducts);
      res.json({ message: "Data imported successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid import data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to import data" });
      }
    }
  });

  app.get("/api/export", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      const products = await storage.getProducts();
      res.json({ categories, products });
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Orders (public submit, protected admin views)
  app.post("/api/orders", async (req, res) => {
    try {
      const orderInput = createOrderSchema.parse(req.body);
      if ((orderInput.payment?.method ?? "cash") === "card") {
        return res.status(400).json({
          message: "Card orders are created after Viva payment via /api/payments/viva/finalize.",
        });
      }
      const order = await storage.createOrder(orderInput);
      triggerEmbeddedPrinterTick();
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid order payload", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create order" });
      }
    }
  });

  app.get("/api/payments/provider", async (_req, res) => {
    const cardEnabled = await isCardPaymentEnabled();
    res.json({
      provider: "viva" as const,
      configured: hasVivaCredentials(),
      mode: "redirect" as const,
      cardEnabled,
    });
  });

  registerVivaPaymentRoutes(app, {
    storage,
    createOrderSchema,
    isCardPaymentEnabled,
    triggerEmbeddedPrinterTick,
  });


  app.get("/api/admin/orders", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const orders = await storage.getOrders(status);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/admin/open-orders/details", isAuthenticated, isPrinterOrAdmin, async (_req, res) => {
    try {
      const openOrders = await storage.getOpenOrderDetails();
      res.json(openOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch open order details" });
    }
  });

  app.get("/api/admin/served-orders/details", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const parsedLimit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
      const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 100;
      const servedOrders = await storage.getServedOrderDetails(limit);
      res.json(servedOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch served order details" });
    }
  });

  app.post("/api/admin/orders/:id/serve", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const updated = await storage.markOrderServed(orderId);
      if (!updated) {
        return res.status(404).json({ message: "Order not found" });
      }
      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Failed to mark order as served" });
    }
  });

  app.post("/api/admin/orders/:id/paid", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const updated = await storage.markOrderPaid(orderId);
      if (!updated) {
        return res.status(404).json({ message: "Order not found" });
      }
      triggerEmbeddedPrinterTick();
      return res.json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Failed to mark order as paid" });
    }
  });

  app.post("/api/admin/orders/:id/status", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const payload = updateOrderStatusSchema.parse(req.body);
      const updated = await storage.updateOrderStatus(orderId, payload.status);
      if (!updated) {
        return res.status(404).json({ message: "Order not found" });
      }
      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order status payload", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to update order status" });
    }
  });

  app.get("/api/admin/orders/:id(\\d+)", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const order = await storage.getOrderDetails(orderId);
      if (!order) {
        res.status(404).json({ message: "Order not found" });
      } else {
        res.json(order);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch order details" });
    }
  });

  app.post("/api/admin/orders/:id/print-jobs", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const job = await storage.createPrintJobForOrder(orderId);
      if (!job) {
        res.status(404).json({ message: "Order not found" });
      } else {
        triggerEmbeddedPrinterTick();
        res.status(201).json(job);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to queue print job" });
    }
  });

  app.get("/api/admin/print-jobs/pending", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const jobs = await storage.getPendingPrintJobs(limit);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pending print jobs" });
    }
  });

  app.get("/api/admin/print-jobs/failed", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));
      const jobs = await storage.getFailedPrintJobs(limit);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch failed print jobs" });
    }
  });

  app.post("/api/admin/print-jobs/:id/retry", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id, 10);
      const job = await storage.retryPrintJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Failed print job not found" });
      }
      triggerEmbeddedPrinterTick();
      return res.json(job);
    } catch (error) {
      return res.status(500).json({ message: "Failed to retry print job" });
    }
  });

  app.post("/api/admin/print-jobs/:id/complete", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id, 10);
      const job = await storage.completePrintJob(jobId);
      if (!job) {
        res.status(404).json({ message: "Print job not found" });
      } else {
        res.json(job);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to complete print job" });
    }
  });

  app.post("/api/admin/print-jobs/:id/fail", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const jobId = parseInt(req.params.id, 10);
      const failPayload = z.object({ errorMessage: z.string().min(1) }).parse(req.body);
      const job = await storage.failPrintJob(jobId, failPayload.errorMessage);
      if (!job) {
        res.status(404).json({ message: "Print job not found" });
      } else {
        res.json(job);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid fail payload", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to mark print job as failed" });
      }
    }
  });

  app.get("/api/admin/revenue/daily", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const businessDate = typeof req.query.date === "string"
        ? req.query.date
        : new Date().toISOString().slice(0, 10);
      const stats = await storage.getDailyRevenueStats(businessDate);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch daily revenue stats" });
    }
  });

  app.post("/api/admin/day-close", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const payload = closeDaySchema.parse(req.body);
      const closure = await storage.closeDay(payload.businessDate, payload.purgeBeforeDate);
      res.json(closure);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid day close payload", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to close day" });
      }
    }
  });

  // Branding settings
  app.get("/api/branding", async (req, res) => {
    try {
      const settings = await storage.getBrandingSettings();
      res.json(settings ?? null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch branding settings" });
    }
  });

  app.put("/api/admin/branding", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const payload = insertBrandingSettingsSchema.parse(req.body);
      const settings = await storage.upsertBrandingSettings(payload);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid branding payload", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update branding settings" });
      }
    }
  });

  // Banner routes
  app.get("/api/banners", async (req, res) => {
    try {
      const banners = await storage.getBanners();
      res.json(banners);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch banners" });
    }
  });

  app.get("/api/banners/type/:type", async (req, res) => {
    try {
      const type = req.params.type;
      const banner = await storage.getBannerByType(type);
      if (!banner) {
        res.status(404).json({ message: "Banner not found" });
      } else {
        res.json(banner);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch banner" });
    }
  });

  app.post("/api/banners", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const bannerData = insertBannerSchema.parse(req.body);
      const banner = await storage.createBanner(bannerData);
      res.status(201).json(banner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid banner data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create banner" });
      }
    }
  });

  app.put("/api/banners/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bannerData = insertBannerSchema.partial().parse(req.body);
      const banner = await storage.updateBanner(id, bannerData);
      if (!banner) {
        res.status(404).json({ message: "Banner not found" });
      } else {
        res.json(banner);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid banner data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update banner" });
      }
    }
  });

  app.delete("/api/banners/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteBanner(id);
      if (!deleted) {
        res.status(404).json({ message: "Banner not found" });
      } else {
        res.status(204).send();
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete banner" });
    }
  });

  app.get("/api/admin/printer-settings", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const settings = await storage.getPrinterSettings();
      res.json(settings ?? null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch printer settings" });
    }
  });

  app.put("/api/admin/printer-settings", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const payload = insertPrinterSettingsSchema.parse(req.body);
      const settings = await storage.upsertPrinterSettings(payload);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid printer settings payload", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update printer settings" });
      }
    }
  });

  app.get("/api/admin/payment-settings", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const settings = await storage.getPaymentSettings();
      return res.json(settings ?? { id: 1, cardEnabled: 1, updatedAt: Date.now() });
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch payment settings" });
    }
  });

  app.put("/api/admin/payment-settings", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const payload = insertPaymentSettingsSchema.parse(req.body);
      const updated = await storage.upsertPaymentSettings(payload);
      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment settings payload", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to update payment settings" });
    }
  });

  app.get("/api/admin/qr-groups", isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const groups = await storage.getQrGroups();
      return res.json(groups);
    } catch (error) {
      return res.status(500).json({ message: "Failed to fetch QR groups" });
    }
  });

  app.post("/api/admin/qr-groups", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const payload = insertQrGroupSchema
        .superRefine((value, ctx) => {
          if (value.tableEnd < value.tableStart) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["tableEnd"],
              message: "tableEnd must be greater than or equal to tableStart",
            });
          }
        })
        .parse(req.body);
      const created = await storage.createQrGroup(payload);
      return res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid QR group payload", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to create QR group" });
    }
  });

  app.put("/api/admin/qr-groups/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const payload = updateQrGroupSchema.parse(req.body);
      const updated = await storage.updateQrGroup(id, payload);
      if (!updated) {
        return res.status(404).json({ message: "QR group not found" });
      }
      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid QR group payload", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to update QR group" });
    }
  });

  app.delete("/api/admin/qr-groups/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = await storage.deleteQrGroup(id);
      if (!deleted) {
        return res.status(404).json({ message: "QR group not found" });
      }
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({ message: "Failed to delete QR group" });
    }
  });

  const buildPrinterTestPayload = async () => {
    const settings = await storage.getPrinterSettings();
    const profile = settings?.printerProfile ?? "generic_escpos";
    const checks = {
      hasSettings: Boolean(settings),
      enabled: Boolean(settings?.enabled),
      hasPrinterIp: Boolean(settings?.printerIp),
      hasValidPort: Boolean(settings?.printerPort && settings.printerPort > 0 && settings.printerPort <= 65535),
      profile,
    };
    const errors: string[] = [];
    if (!checks.hasSettings) errors.push("Printer settings are missing.");
    if (!checks.enabled) errors.push("Printer is disabled.");
    if (!checks.hasPrinterIp) errors.push("Printer IP is not configured.");
    if (!checks.hasValidPort) errors.push("Printer port is invalid.");

    if (errors.length > 0 || !settings || !settings.printerIp) {
      return {
        ok: false as const,
        settings,
        checks,
        errors,
      };
    }

    const receipt = formatReceipt(
      { type: "printer_test" },
      profile,
      settings.printerBeepMode ?? "auto",
      settings.printerBeepCount ?? 4,
      settings.printerBeepTiming ?? 3,
    );

    return {
      ok: true as const,
      settings,
      checks,
      receipt,
    };
  };

  app.post("/api/admin/printer/test-payload", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const payload = await buildPrinterTestPayload();
      if (!payload.ok) {
        return res.status(400).json({
          status: "invalid_settings",
          message: "Printer settings check failed.",
          checks: payload.checks,
          errors: payload.errors,
        });
      }

      return res.json({
        status: "ok",
        printerIp: payload.settings.printerIp!,
        printerPort: payload.settings.printerPort,
        receipt: payload.receipt,
        checks: payload.checks,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Printer test payload failed";
      return res.status(500).json({ status: "error", message });
    }
  });

  app.post("/api/admin/printer/test", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const payload = await buildPrinterTestPayload();
      if (!payload.ok) {
        return res.status(400).json({
          status: "invalid_settings",
          message: "Printer settings check failed.",
          checks: payload.checks,
          errors: payload.errors,
        });
      }

      await sendToNetworkPrinter(payload.settings.printerIp!, payload.settings.printerPort, payload.receipt);
      await storage.updatePrinterHeartbeat("test-ok");
      res.json({
        status: "ok",
        message: "Test ticket sent successfully using current printer settings/profile.",
        checks: payload.checks,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Printer test failed";
      await storage.updatePrinterHeartbeat("test-error", message);
      res.status(500).json({ status: "error", message });
    }
  });

  app.post("/api/admin/printer/test-beep", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const settings = await storage.getPrinterSettings();
      if (!settings || !settings.printerIp) {
        return res.status(400).json({ message: "Printer IP is not configured" });
      }
      if (!settings.enabled) {
        return res.status(400).json({ message: "Printer is disabled" });
      }

      const profile = (settings.printerProfile ?? "generic_escpos").toString().trim().toLowerCase();
      const defaultMode = resolveDefaultBeepMode(profile);
      const selectedBeepMode =
        settings.printerBeepMode && settings.printerBeepMode !== "auto"
          ? settings.printerBeepMode
          : process.env.PRINTER_BEEP_MODE || defaultMode;
      const beepMode = selectedBeepMode.trim().toLowerCase();
      const beepCommand = buildBeepCommand(
        beepMode,
        settings.printerBeepCount ?? 4,
        settings.printerBeepTiming ?? 3,
      );
      if (!beepCommand) {
        return res.status(400).json({
          status: "no_beep_command",
          message: "No beep command is active. Set PRINTER_BEEP_MODE to bel, esc_b, esc_p, both or both_plus_p.",
        });
      }

      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ host: settings.printerIp!, port: settings.printerPort }, () => {
          socket.write(beepCommand, "latin1");
          socket.end();
        });
        socket.setTimeout(5000);
        socket.on("timeout", () => {
          socket.destroy();
          reject(new Error("Printer beep test timed out"));
        });
        socket.on("error", (error) => reject(error));
        socket.on("close", () => resolve());
      });

      await storage.updatePrinterHeartbeat("test-ok");
      return res.json({
        status: "ok",
        message: "Beep-only command sent.",
        profile,
        beepMode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Printer beep test failed";
      await storage.updatePrinterHeartbeat("test-error", message);
      return res.status(500).json({ status: "error", message });
    }
  });

  app.get("/api/printer/settings", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const settings = await storage.getPrinterSettings();
      res.json(settings ?? null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch printer settings" });
    }
  });

  app.post("/api/printer/lock/acquire", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const payload = printerLockSchema.parse(req.body);
      const leaseMs = payload.leaseMs ?? 15000;
      const result = await storage.acquirePrinterLock(payload.lockToken, payload.holder, leaseMs);
      if (!result.acquired) {
        return res.status(409).json({
          message: "Printer lock already held by another client",
          lockHolder: result.settings?.lockHolder ?? null,
          lockExpiresAt: result.settings?.lockExpiresAt ?? null,
        });
      }
      return res.json({
        status: "acquired",
        lockHolder: result.settings?.lockHolder ?? payload.holder,
        lockExpiresAt: result.settings?.lockExpiresAt ?? null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid lock acquire payload", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to acquire printer lock" });
    }
  });

  app.post("/api/printer/lock/release", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const payload = printerLockReleaseSchema.parse(req.body);
      const released = await storage.releasePrinterLock(payload.lockToken);
      if (!released) {
        return res.status(404).json({ message: "No matching active lock to release" });
      }
      return res.json({ status: "released" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid lock release payload", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to release printer lock" });
    }
  });

  app.post("/api/printer/dispatch-next", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const dispatchPayload = printerDispatchSchema.parse(req.body);
      const hasLock = await storage.hasValidPrinterLock(dispatchPayload.lockToken);
      if (!hasLock) {
        return res.status(409).json({ status: "error", message: "Printer lock missing or expired" });
      }
      await storage.renewPrinterLock(dispatchPayload.lockToken, 15000);

      const settings = await storage.getPrinterSettings();
      if (!settings || !settings.enabled || !settings.printerIp) {
        return res.status(400).json({ message: "Printer is not configured/enabled" });
      }

      const [nextJob] = await storage.getDispatchablePrintJobs(1);
      if (!nextJob) {
        await storage.updatePrinterHeartbeat("idle");
        return res.json({ status: "idle", message: "No pending jobs" });
      }

      let parsedPayload: any = {};
      try {
        parsedPayload = JSON.parse(nextJob.payload);
      } catch {
        await storage.failPrintJob(nextJob.id, "Invalid print payload JSON");
        return res.status(500).json({ status: "error", message: "Invalid print payload" });
      }

      const receipt = formatReceipt(
        parsedPayload,
        settings.printerProfile ?? "generic_escpos",
        settings.printerBeepMode ?? "auto",
        settings.printerBeepCount ?? 4,
        settings.printerBeepTiming ?? 3,
      );
      if (!receipt) {
        await storage.failPrintJob(nextJob.id, "Missing order payload");
        return res.status(500).json({ status: "error", message: "Missing order payload" });
      }

      try {
        await sendToNetworkPrinter(settings.printerIp, settings.printerPort, receipt);
        await storage.completePrintJob(nextJob.id);
        await storage.updatePrinterHeartbeat("printed");
        return res.json({
          status: "printed",
          jobId: nextJob.id,
          orderId: nextJob.orderId,
        });
      } catch (printerError) {
        const message = printerError instanceof Error ? printerError.message : "Printer dispatch failed";
        await storage.failPrintJob(
          nextJob.id,
          message,
        );
        await storage.updatePrinterHeartbeat("error", message);
        return res.status(500).json({
          status: "error",
          message,
        });
      }
    } catch (error) {
      return res.status(500).json({ message: "Failed to dispatch print job" });
    }
  });

  app.post("/api/printer/claim-next", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const dispatchPayload = printerDispatchSchema.parse(req.body);
      const hasLock = await storage.hasValidPrinterLock(dispatchPayload.lockToken);
      if (!hasLock) {
        return res.status(409).json({ status: "error", message: "Printer lock missing or expired" });
      }
      await storage.renewPrinterLock(dispatchPayload.lockToken, 15000);

      const settings = await storage.getPrinterSettings();
      if (!settings || !settings.enabled || !settings.printerIp) {
        return res.status(400).json({ message: "Printer is not configured/enabled" });
      }

      const [nextJob] = await storage.getDispatchablePrintJobs(1);
      if (!nextJob) {
        await storage.updatePrinterHeartbeat("idle");
        return res.json({ status: "idle", message: "No pending jobs" });
      }

      let parsedPayload: any = {};
      try {
        parsedPayload = JSON.parse(nextJob.payload);
      } catch {
        await storage.failPrintJob(nextJob.id, "Invalid print payload JSON");
        return res.status(500).json({ status: "error", message: "Invalid print payload" });
      }

      const receipt = formatReceipt(
        parsedPayload,
        settings.printerProfile ?? "generic_escpos",
        settings.printerBeepMode ?? "auto",
        settings.printerBeepCount ?? 4,
        settings.printerBeepTiming ?? 3,
      );
      if (!receipt) {
        await storage.failPrintJob(nextJob.id, "Missing order payload");
        return res.status(500).json({ status: "error", message: "Missing order payload" });
      }

      return res.json({
        status: "job",
        job: {
          id: nextJob.id,
          orderId: nextJob.orderId,
          printerIp: settings.printerIp,
          printerPort: settings.printerPort,
          receipt,
        },
      });
    } catch (error) {
      return res.status(500).json({ message: "Failed to claim print job" });
    }
  });

  app.post("/api/printer/jobs/:id/complete", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const payload = printerJobActionSchema.parse(req.body);
      const hasLock = await storage.hasValidPrinterLock(payload.lockToken);
      if (!hasLock) {
        return res.status(409).json({ status: "error", message: "Printer lock missing or expired" });
      }
      await storage.renewPrinterLock(payload.lockToken, 15000);

      const jobId = parseInt(req.params.id, 10);
      const job = await storage.completePrintJob(jobId);
      if (!job) {
        return res.status(404).json({ message: "Print job not found" });
      }
      await storage.updatePrinterHeartbeat("printed");
      return res.json({ status: "printed", jobId: job.id, orderId: job.orderId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid complete payload", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to complete print job" });
    }
  });

  app.post("/api/printer/jobs/:id/fail", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const payload = printerJobActionSchema.parse(req.body);
      const hasLock = await storage.hasValidPrinterLock(payload.lockToken);
      if (!hasLock) {
        return res.status(409).json({ status: "error", message: "Printer lock missing or expired" });
      }
      await storage.renewPrinterLock(payload.lockToken, 15000);

      const jobId = parseInt(req.params.id, 10);
      const failed = await storage.failPrintJob(jobId, payload.errorMessage || "Local print bridge error");
      if (!failed) {
        return res.status(404).json({ message: "Print job not found" });
      }
      await storage.updatePrinterHeartbeat("error", payload.errorMessage || "Local print bridge error");
      return res.json({ status: "failed", jobId: failed.id, orderId: failed.orderId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid fail payload", errors: error.errors });
      }
      return res.status(500).json({ message: "Failed to fail print job" });
    }
  });

  app.post("/api/printer/heartbeat", isAuthenticated, isPrinterOrAdmin, async (req, res) => {
    try {
      const payload = printerHeartbeatSchema.parse(req.body);
      const hasLock = await storage.hasValidPrinterLock(payload.lockToken);
      if (!hasLock) {
        return res.status(409).json({ message: "Printer lock missing or expired" });
      }
      await storage.renewPrinterLock(payload.lockToken, 15000);
      const updated = await storage.updatePrinterHeartbeat(payload.status, payload.errorMessage);
      res.json(updated ?? null);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid heartbeat payload", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to store heartbeat" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

