import { pendingCheckouts } from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export type PendingCheckoutStatus = "pending" | "succeeded" | "failed" | "expired";

export interface PendingCheckoutRow {
  id: string;
  vivaOrderCode: string | null;
  amountCents: number;
  cartJson: string;
  status: PendingCheckoutStatus;
  orderId: number | null;
  transactionId: string | null;
  failureEventId: number | null;
  createdAt: number;
  expiresAt: number;
}

function mapRow(row: typeof pendingCheckouts.$inferSelect): PendingCheckoutRow {
  return {
    id: row.id,
    vivaOrderCode: row.vivaOrderCode,
    amountCents: row.amountCents,
    cartJson: row.cartJson,
    status: row.status as PendingCheckoutStatus,
    orderId: row.orderId,
    transactionId: row.transactionId,
    failureEventId: row.failureEventId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
  };
}

export async function createPendingCheckout(input: {
  id: string;
  amountCents: number;
  cartJson: string;
  expiresAt: number;
}): Promise<PendingCheckoutRow> {
  const now = Date.now();
  await db.insert(pendingCheckouts).values({
    id: input.id,
    amountCents: input.amountCents,
    cartJson: input.cartJson,
    status: "pending",
    createdAt: now,
    expiresAt: input.expiresAt,
  });
  const row = await getPendingCheckoutById(input.id);
  if (!row) {
    throw new Error("Failed to create pending checkout");
  }
  return row;
}

export async function getPendingCheckoutById(id: string): Promise<PendingCheckoutRow | undefined> {
  const [row] = await db.select().from(pendingCheckouts).where(eq(pendingCheckouts.id, id));
  return row ? mapRow(row) : undefined;
}

export async function getPendingCheckoutByVivaOrderCode(
  orderCode: string,
): Promise<PendingCheckoutRow | undefined> {
  const [row] = await db
    .select()
    .from(pendingCheckouts)
    .where(eq(pendingCheckouts.vivaOrderCode, orderCode));
  return row ? mapRow(row) : undefined;
}

export async function attachVivaOrderCode(id: string, vivaOrderCode: string): Promise<void> {
  await db
    .update(pendingCheckouts)
    .set({ vivaOrderCode })
    .where(eq(pendingCheckouts.id, id));
}

export async function updatePendingCheckout(
  id: string,
  patch: Partial<{
    status: PendingCheckoutStatus;
    orderId: number | null;
    transactionId: string | null;
    failureEventId: number | null;
  }>,
): Promise<void> {
  await db.update(pendingCheckouts).set(patch).where(eq(pendingCheckouts.id, id));
}

export function isPendingCheckoutExpired(row: PendingCheckoutRow): boolean {
  return Date.now() > row.expiresAt;
}
