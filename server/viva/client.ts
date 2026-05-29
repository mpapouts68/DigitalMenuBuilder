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

const VIVA_OAUTH_SCOPE = "urn:viva:payments:core:api:redirectcheckout";

async function readVivaJson<T>(response: Response, label: string): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`${label}: empty response body (HTTP ${response.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `${label}: response was not JSON (HTTP ${response.status}): ${text.slice(0, 300)}`,
    );
  }
}

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
    body.set("scope", VIVA_OAUTH_SCOPE);

    const response = await fetch(this.config.oauthUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    });

    const payload = await readVivaJson<{
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    }>(response, "Viva OAuth");

    if (!response.ok || !payload.access_token) {
      const oauthError = payload.error || `http_${response.status}`;
      if (oauthError === "invalid_client") {
        throw new Error(
          `Viva OAuth invalid_client (${this.config.environment}): check VIVA_CLIENT_ID and VIVA_CLIENT_SECRET are Smart Checkout credentials from Settings → API Access (not Merchant ID / API Key), with no extra spaces or quotes in .env, and VIVA_ENVIRONMENT matching your Viva account (production vs demo).`,
        );
      }
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

    const customerPayload: Record<string, string> = {};
    if (input.customer?.email) {
      customerPayload.email = input.customer.email;
    }
    if (input.customer?.fullName) {
      customerPayload.fullName = input.customer.fullName;
    }
    if (input.customer?.phone) {
      customerPayload.phone = input.customer.phone;
    }
    if (input.customer?.requestLang) {
      customerPayload.requestLang = input.customer.requestLang;
    }
    if (Object.keys(customerPayload).length > 0) {
      customerPayload.countryCode = "GR";
    }

    const orderBody: Record<string, unknown> = {
      amount: Math.round(input.amountCents),
      customerTrns: input.customerTrns,
      merchantTrns: input.merchantTrns,
      sourceCode: this.config.sourceCode,
      paymentTimeout: input.paymentTimeoutSeconds ?? 1800,
    };
    if (Object.keys(customerPayload).length > 0) {
      orderBody.customer = customerPayload;
    }

    const response = await fetch(`${this.config.apiUrl}/checkout/v2/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(orderBody),
    });

    const payload = await readVivaJson<{
      orderCode?: number | string;
      OrderCode?: number | string;
      message?: string;
      detail?: string;
      title?: string;
      status?: number;
    }>(response, "Viva create order");

    if (!response.ok) {
      const detail =
        payload.message ||
        payload.detail ||
        payload.title ||
        `Viva create order failed (HTTP ${response.status}, sourceCode=${this.config.sourceCode})`;
      throw new Error(detail);
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

    const payload = await readVivaJson<
      VivaTransaction & {
        message?: string;
        detail?: string;
      }
    >(response, "Viva retrieve transaction");

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
