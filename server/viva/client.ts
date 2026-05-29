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

function vivaResponseMeta(response: Response): string {
  const parts = [`HTTP ${response.status}`];
  const correlationId = response.headers.get("x-viva-correlationid");
  if (correlationId) {
    parts.push(`correlationId=${correlationId}`);
  }
  return parts.join(", ");
}

async function readVivaJson<T>(response: Response, label: string): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`${label}: empty response body (${vivaResponseMeta(response)})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `${label}: response was not JSON (${vivaResponseMeta(response)}): ${text.slice(0, 300)}`,
    );
  }
}

function formatCreateOrder403(sourceCode: string, response: Response, bodyText: string): string {
  const bodyHint = bodyText.trim() ? ` Viva said: ${bodyText.slice(0, 200)}` : "";
  return (
    `Viva create order forbidden (403, sourceCode="${sourceCode}").` +
    " Use a payment source configured for Smart Checkout / Redirection (not Native Checkout only)." +
    " In Viva: Sales → Online payments → Websites/Apps → open the source → confirm integration is Redirection," +
    ' copy the exact Source code into VIVA_SOURCE_CODE (often "Default"), then redeploy.' +
    bodyHint +
    (bodyHint ? "" : ` (${vivaResponseMeta(response)})`)
  );
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
      if (oauthError === "invalid_scope") {
        throw new Error(
          `Viva OAuth invalid_scope (${this.config.environment}): use Smart Checkout Client ID and Secret only; do not pass a custom OAuth scope. Regenerate credentials under Settings → API Access if the error persists.`,
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

    const rawBody = await response.text();
    let payload: {
      orderCode?: number | string;
      OrderCode?: number | string;
      message?: string;
      detail?: string;
      title?: string;
      status?: number;
    } = {};
    if (rawBody.trim()) {
      try {
        payload = JSON.parse(rawBody) as typeof payload;
      } catch {
        throw new Error(
          `Viva create order: response was not JSON (${vivaResponseMeta(response)}): ${rawBody.slice(0, 300)}`,
        );
      }
    } else if (!response.ok) {
      if (response.status === 403) {
        throw new Error(formatCreateOrder403(this.config.sourceCode, response, rawBody));
      }
      throw new Error(`Viva create order: empty response body (${vivaResponseMeta(response)})`);
    }

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error(
          formatCreateOrder403(
            this.config.sourceCode,
            response,
            payload.message || payload.detail || payload.title || rawBody,
          ),
        );
      }
      const detail =
        payload.message ||
        payload.detail ||
        payload.title ||
        `Viva create order failed (${vivaResponseMeta(response)}, sourceCode=${this.config.sourceCode})`;
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
