import type { Express } from "express";
import { z } from "zod";
import type { DatabaseStorage } from "../storage";
import { hasVivaCredentials, loadVivaConfig } from "./config";
import { VivaClient } from "./client";
import { getVivaEventMessage } from "./events";
import { finalizeVivaPayment, markVivaPaymentFailed } from "./finalize";
import {
  attachVivaOrderCode,
  createPendingCheckout,
  getPendingCheckoutById,
  getPendingCheckoutByVivaOrderCode,
} from "./pending-storage";

const PENDING_TTL_MS = 30 * 60 * 1000;

export function registerVivaPaymentRoutes(
  app: Express,
  deps: {
    storage: DatabaseStorage;
    createOrderSchema: z.ZodTypeAny;
    isCardPaymentEnabled: () => Promise<boolean>;
    triggerEmbeddedPrinterTick: () => void;
  },
): void {
  const vivaClient = new VivaClient();

  app.get("/api/payments/viva/config", (_req, res) => {
    const config = loadVivaConfig();
    res.json({
      successUrl: config.successUrl,
      failureUrl: config.failureUrl,
      environment: config.environment,
    });
  });

  app.post("/api/payments/viva/start", async (req, res) => {
    try {
      if (!(await deps.isCardPaymentEnabled())) {
        return res.status(403).json({ message: "Card payment is currently disabled by admin." });
      }
      if (!hasVivaCredentials()) {
        return res.status(503).json({
          message:
            "Viva is not configured. Set VIVA_CLIENT_ID, VIVA_CLIENT_SECRET, and VIVA_SOURCE_CODE.",
        });
      }

      const body = z
        .object({
          amount: z.number().positive(),
          customerName: z.string().optional(),
          customerPhone: z.string().optional(),
          notes: z.string().optional(),
          serviceMode: z.enum(["table", "pickup"]).optional(),
          tableCode: z.string().optional(),
          tableLabel: z.string().optional(),
          pickupPoint: z.string().optional(),
          sourceToken: z.string().optional(),
          items: z
            .array(
              z.object({
                productId: z.number().int().positive(),
                quantity: z.number().int().positive(),
                notes: z.string().optional(),
                selectedOptions: z.array(z.unknown()).optional(),
                selectedExtras: z.array(z.unknown()).optional(),
              }),
            )
            .min(1),
        })
        .parse(req.body);

      const cartForOrder = deps.createOrderSchema.parse({
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        notes: body.notes,
        serviceMode: body.serviceMode,
        tableCode: body.tableCode,
        tableLabel: body.tableLabel,
        pickupPoint: body.pickupPoint,
        sourceToken: body.sourceToken,
        items: body.items,
      });

      const paymentIntentId = `viva_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const amountCents = Math.round(body.amount * 100);
      const expiresAt = Date.now() + PENDING_TTL_MS;

      await createPendingCheckout({
        id: paymentIntentId,
        amountCents,
        cartJson: JSON.stringify(cartForOrder),
        expiresAt,
      });

      const { orderCode } = await vivaClient.createPaymentOrder({
        amountCents,
        customerTrns: "Shisha Point order",
        merchantTrns: paymentIntentId,
        customer: {
          fullName: body.customerName?.trim() || undefined,
          phone: body.customerPhone?.trim() || undefined,
          requestLang: "el-GR",
        },
        paymentTimeoutSeconds: 1800,
      });

      await attachVivaOrderCode(paymentIntentId, orderCode);

      return res.json({
        mode: "viva_redirect" as const,
        paymentProvider: "viva",
        paymentIntentId,
        orderCode,
        checkoutUrl: vivaClient.buildCheckoutUrl(orderCode),
        amount: body.amount,
        currency: "eur",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid checkout payload", errors: error.errors });
      }
      const message = error instanceof Error ? error.message : "Failed to start Viva checkout";
      console.error("[viva] /api/payments/viva/start failed:", message, error);
      const isOAuthConfig =
        message.includes("invalid_client") ||
        message.includes("invalid_scope") ||
        message.includes("Viva OAuth") ||
        message.includes("Viva is not configured");
      return res.status(isOAuthConfig ? 503 : 500).json({ message });
    }
  });

  app.post("/api/payments/viva/finalize", async (req, res) => {
    try {
      if (!(await deps.isCardPaymentEnabled())) {
        return res.status(403).json({ message: "Card payment is currently disabled by admin." });
      }

      const body = z
        .object({
          paymentIntentId: z.string().min(6).optional(),
          orderCode: z.union([z.string(), z.number()]).optional(),
          transactionId: z.string().min(8).optional(),
        })
        .parse(req.body);

      const result = await finalizeVivaPayment(
        {
          storage: deps.storage,
          createOrderSchema: deps.createOrderSchema,
          triggerEmbeddedPrinterTick: deps.triggerEmbeddedPrinterTick,
          vivaClient,
        },
        {
          paymentIntentId: body.paymentIntentId,
          orderCode: body.orderCode !== undefined ? String(body.orderCode) : undefined,
          transactionId: body.transactionId,
        },
      );

      const httpStatus =
        result.status === "failed" ? 402 : result.status === "already_completed" ? 200 : 200;
      return res.status(httpStatus).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid finalize payload", errors: error.errors });
      }
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to finalize Viva payment",
      });
    }
  });

  app.post("/api/payments/viva/mark-failed", async (req, res) => {
    try {
      const body = z
        .object({
          paymentIntentId: z.string().min(6).optional(),
          orderCode: z.union([z.string(), z.number()]).optional(),
          eventId: z.coerce.number().optional(),
          lang: z.string().optional(),
        })
        .parse(req.body);

      const result = await markVivaPaymentFailed({
        paymentIntentId: body.paymentIntentId,
        orderCode: body.orderCode !== undefined ? String(body.orderCode) : undefined,
        eventId: body.eventId,
      });

      const message = getVivaEventMessage(body.eventId, body.lang);
      return res.json({ ...result, userMessage: message });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payload", errors: error.errors });
      }
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to record payment failure",
      });
    }
  });

  app.get("/api/payments/viva/pending", async (req, res) => {
    try {
      const paymentIntentId =
        typeof req.query.paymentIntentId === "string" ? req.query.paymentIntentId : "";
      const orderCode = typeof req.query.orderCode === "string" ? req.query.orderCode : "";

      const pending = paymentIntentId
        ? await getPendingCheckoutById(paymentIntentId)
        : orderCode
          ? await getPendingCheckoutByVivaOrderCode(orderCode)
          : undefined;

      if (!pending) {
        return res.status(404).json({ message: "Pending checkout not found." });
      }

      return res.json({
        paymentIntentId: pending.id,
        status: pending.status,
        amountCents: pending.amountCents,
        cart: JSON.parse(pending.cartJson),
        orderId: pending.orderId,
        failureEventId: pending.failureEventId,
      });
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to load pending checkout",
      });
    }
  });

  /** Viva dashboard webhook verification (GET) and events (POST). */
  app.get("/api/webhooks/viva", (req, res) => {
    const config = loadVivaConfig();
    const key = typeof req.query.key === "string" ? req.query.key : "";
    if (config.webhookVerificationKey && key === config.webhookVerificationKey) {
      return res.status(200).json({ message: "Webhook endpoint verified." });
    }
    return res.status(200).send("OK");
  });

  app.post("/api/webhooks/viva", async (req, res) => {
    try {
      const config = loadVivaConfig();
      const verificationKey =
        typeof req.query.key === "string"
          ? req.query.key
          : typeof req.body?.Key === "string"
            ? req.body.Key
            : "";

      if (config.webhookVerificationKey && verificationKey === config.webhookVerificationKey) {
        return res.status(200).json({ message: "Webhook verified." });
      }

      const eventTypeId = Number(req.body?.EventTypeId ?? req.body?.eventTypeId);
      const eventData = (req.body?.EventData ?? req.body?.eventData ?? {}) as Record<string, unknown>;

      const transactionId = String(
        eventData.TransactionId ?? eventData.transactionId ?? "",
      ).trim();
      const orderCode = String(eventData.OrderCode ?? eventData.orderCode ?? "").trim();
      const merchantTrns = String(eventData.MerchantTrns ?? eventData.merchantTrns ?? "").trim();

      if (eventTypeId === 1796 && transactionId) {
        await finalizeVivaPayment(
          {
            storage: deps.storage,
            createOrderSchema: deps.createOrderSchema,
            triggerEmbeddedPrinterTick: deps.triggerEmbeddedPrinterTick,
            vivaClient,
          },
          {
            paymentIntentId: merchantTrns || undefined,
            orderCode: orderCode || undefined,
            transactionId,
          },
        );
      } else if (eventTypeId === 1798) {
        await markVivaPaymentFailed({
          paymentIntentId: merchantTrns || undefined,
          orderCode: orderCode || undefined,
        });
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Webhook processing failed",
      });
    }
  });
}
