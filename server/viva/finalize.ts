import type { z } from "zod";
import { VivaClient, isVivaTransactionPaid, transactionAmountToCents } from "./client";
import {
  getPendingCheckoutById,
  getPendingCheckoutByVivaOrderCode,
  isPendingCheckoutExpired,
  updatePendingCheckout,
  type PendingCheckoutRow,
} from "./pending-storage";
import type { DatabaseStorage } from "../storage";

type CreateOrderSchema = z.ZodType<{
  payment?: {
    method?: "cash" | "card";
    status?: "not_required" | "pending" | "authorized" | "succeeded" | "failed";
    provider?: string;
    intentId?: string;
  };
  serviceMode?: "table" | "pickup";
  tableCode?: string;
  tableLabel?: string;
  pickupPoint?: string;
  sourceToken?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items: Array<{
    productId: number;
    quantity: number;
    notes?: string;
    selectedOptions?: unknown[];
    selectedExtras?: unknown[];
  }>;
}>;

export interface FinalizeVivaPaymentInput {
  paymentIntentId?: string;
  orderCode?: string;
  transactionId?: string;
}

export interface FinalizeVivaPaymentResult {
  status: "succeeded" | "failed" | "already_completed";
  paymentIntentId: string;
  orderNumber?: string;
  orderId?: number;
  message: string;
}

async function resolvePendingRow(input: FinalizeVivaPaymentInput): Promise<PendingCheckoutRow | undefined> {
  if (input.paymentIntentId) {
    const byId = await getPendingCheckoutById(input.paymentIntentId);
    if (byId) {
      return byId;
    }
  }
  if (input.orderCode) {
    return getPendingCheckoutByVivaOrderCode(String(input.orderCode).trim());
  }
  return undefined;
}

export async function finalizeVivaPayment(
  deps: {
    storage: DatabaseStorage;
    createOrderSchema: CreateOrderSchema;
    triggerEmbeddedPrinterTick: () => void;
    vivaClient?: VivaClient;
  },
  input: FinalizeVivaPaymentInput,
): Promise<FinalizeVivaPaymentResult> {
  const viva = deps.vivaClient ?? new VivaClient();
  const pending = await resolvePendingRow(input);

  if (!pending) {
    return {
      status: "failed",
      paymentIntentId: input.paymentIntentId || "",
      message: "Checkout session not found or expired.",
    };
  }

  if (isPendingCheckoutExpired(pending) && pending.status === "pending") {
    await updatePendingCheckout(pending.id, { status: "expired" });
    return {
      status: "failed",
      paymentIntentId: pending.id,
      message: "Checkout session expired. Please place your order again.",
    };
  }

  if (pending.status === "succeeded" && pending.orderId) {
    const orders = await deps.storage.getOrders();
    const existing = orders.find((o) => o.id === pending.orderId);
    return {
      status: "already_completed",
      paymentIntentId: pending.id,
      orderId: pending.orderId,
      orderNumber: existing?.orderNumber,
      message: "Payment was already completed.",
    };
  }

  if (pending.status === "failed") {
    return {
      status: "failed",
      paymentIntentId: pending.id,
      message: "Payment was declined or cancelled.",
    };
  }

  const transactionId = (input.transactionId || pending.transactionId || "").trim();
  if (!transactionId) {
    return {
      status: "failed",
      paymentIntentId: pending.id,
      message: "Missing transaction id. Payment cannot be verified.",
    };
  }

  const transaction = await viva.retrieveTransaction(transactionId);
  if (!isVivaTransactionPaid(transaction.statusId)) {
    await updatePendingCheckout(pending.id, {
      status: "failed",
      transactionId,
    });
    return {
      status: "failed",
      paymentIntentId: pending.id,
      message: "Payment was not approved by the bank.",
    };
  }

  const txOrderCode = String(transaction.orderCode ?? "").trim();
  if (pending.vivaOrderCode && txOrderCode && pending.vivaOrderCode !== txOrderCode) {
    return {
      status: "failed",
      paymentIntentId: pending.id,
      message: "Payment order mismatch.",
    };
  }

  const txCents = transactionAmountToCents(Number(transaction.amount));
  if (txCents > 0 && Math.abs(txCents - pending.amountCents) > 1) {
    return {
      status: "failed",
      paymentIntentId: pending.id,
      message: "Paid amount does not match the order total.",
    };
  }

  const cartPayload = deps.createOrderSchema.parse(JSON.parse(pending.cartJson));
  const orderDetails = await deps.storage.createOrder({
    ...cartPayload,
    payment: {
      method: "card",
      status: "succeeded",
      provider: "viva",
      intentId: pending.id,
    },
  });

  await updatePendingCheckout(pending.id, {
    status: "succeeded",
    orderId: orderDetails.order.id,
    transactionId,
  });

  deps.triggerEmbeddedPrinterTick();

  return {
    status: "succeeded",
    paymentIntentId: pending.id,
    orderId: orderDetails.order.id,
    orderNumber: orderDetails.order.orderNumber,
    message: "Payment verified and order submitted.",
  };
}

export async function markVivaPaymentFailed(input: {
  paymentIntentId?: string;
  orderCode?: string;
  eventId?: number;
}): Promise<{ paymentIntentId?: string; cartJson?: string; message: string }> {
  const pending = await resolvePendingRow(input);
  if (!pending) {
    return { message: "Checkout session not found." };
  }

  if (pending.status === "succeeded") {
    return {
      paymentIntentId: pending.id,
      message: "Payment already completed.",
    };
  }

  await updatePendingCheckout(pending.id, {
    status: "failed",
    failureEventId: typeof input.eventId === "number" ? input.eventId : null,
  });

  return {
    paymentIntentId: pending.id,
    cartJson: pending.status === "failed" ? pending.cartJson : pending.cartJson,
    message: "Payment marked as failed.",
  };
}
