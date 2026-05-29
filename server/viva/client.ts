import { hasVivaCredentials, loadVivaConfig, type VivaConfig } from "./config";

export interface VivaCreateOrderInput {
  amountCents: number;
  customerTrns: string;
  merchantTrns: string;
  customer?: {
    email?: string;
    fullName?: string;
    phone?: string;
    requestLang?: string;
  };
  paymentTimeoutSeconds?: number;
}

export interface VivaCreateOrderResult {
  orderCode: string;
}

export interface VivaTransaction {
  orderCode: number | string;
  statusId: string;
  amount: number;
  transactionId?: string;
  merchantTrns?: string;
  currencyCode?: number | string;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export class VivaClient {
  constructor(private readonly config: VivaConfig = loadVivaConfig()) {}

  isConfigured(): boolean {
    return hasVivaCredentials(this.config);
  }

  buildCheckoutUrl(orderCode: string): string {
    return `${this.config.checkoutBaseUrl}?ref=${encodeURIComponent(orderCode)}`;
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && cachedToken.expiresAt > now + 30_000) {
      return cachedToken.value;
    }

    const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString(
      "base64",
    );
    const body = new URLSearchParams();
    body.set("grant_type", "client_credentials");

    const response = await fetch(this.config.oauthUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };

    if (!response.ok || !payload.access_token) {
      throw new Error(
        payload.error_description || payload.error || `Viva OAuth failed (${response.status})`,
      );
    }

    const expiresInMs = (payload.expires_in ?? 3600) * 1000;
    cachedToken = {
      value: payload.access_token,
      expiresAt: now + expiresInMs,
    };
    return payload.access_token;
  }

  async createPaymentOrder(input: VivaCreateOrderInput): Promise<VivaCreateOrderResult> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.config.apiUrl}/checkout/v2/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(input.amountCents),
        customerTrns: input.customerTrns,
        merchantTrns: input.merchantTrns,
        sourceCode: this.config.sourceCode,
        paymentTimeout: input.paymentTimeoutSeconds ?? 1800,
        customer: {
          email: input.customer?.email || undefined,
          fullName: input.customer?.fullName || undefined,
          phone: input.customer?.phone || undefined,
          countryCode: "GR",
          requestLang: input.customer?.requestLang || "el-GR",
        },
      }),
    });

    const payload = (await response.json()) as {
      orderCode?: number | string;
      OrderCode?: number | string;
      message?: string;
      detail?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message || payload.detail || `Viva create order failed (${response.status})`);
    }

    const orderCode = String(payload.orderCode ?? payload.OrderCode ?? "").trim();
    if (!orderCode) {
      throw new Error("Viva create order response did not include orderCode");
    }
    return { orderCode };
  }

  async retrieveTransaction(transactionId: string): Promise<VivaTransaction> {
    const token = await this.getAccessToken();
    const response = await fetch(
      `${this.config.apiUrl}/checkout/v2/transactions/${encodeURIComponent(transactionId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const payload = (await response.json()) as VivaTransaction & {
      message?: string;
      detail?: string;
    };

    if (!response.ok) {
      throw new Error(
        payload.message || payload.detail || `Viva retrieve transaction failed (${response.status})`,
      );
    }

    return payload;
  }
}

export function transactionAmountToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    return 0;
  }
  if (Number.isInteger(amount) && amount >= 100) {
    return amount;
  }
  return Math.round(amount * 100);
}

export function isVivaTransactionPaid(statusId: string | undefined): boolean {
  const normalized = (statusId || "").trim().toUpperCase();
  return normalized === "F" || normalized === "C";
}
