export type VivaEnvironment = "demo" | "production";

export interface VivaConfig {
  environment: VivaEnvironment;
  oauthUrl: string;
  apiUrl: string;
  checkoutBaseUrl: string;
  clientId: string;
  clientSecret: string;
  sourceCode: string;
  successUrl: string;
  failureUrl: string;
  webhookVerificationKey: string;
}

const demoDefaults = {
  oauthUrl: "https://demo-accounts.vivapayments.com/connect/token",
  apiUrl: "https://demo-api.vivapayments.com",
  checkoutBaseUrl: "https://demo.vivapayments.com/web/checkout",
};

const productionDefaults = {
  oauthUrl: "https://accounts.vivapayments.com/connect/token",
  apiUrl: "https://api.vivapayments.com",
  checkoutBaseUrl: "https://www.vivapayments.com/web/checkout",
};

export function loadVivaConfig(): VivaConfig {
  const environment: VivaEnvironment =
    (process.env.VIVA_ENVIRONMENT || "production").trim().toLowerCase() === "demo"
      ? "demo"
      : "production";
  const defaults = environment === "production" ? productionDefaults : demoDefaults;

  return {
    environment,
    oauthUrl: process.env.VIVA_OAUTH_URL?.trim() || defaults.oauthUrl,
    apiUrl: (process.env.VIVA_API_URL?.trim() || defaults.apiUrl).replace(/\/$/, ""),
    checkoutBaseUrl: (process.env.VIVA_CHECKOUT_URL?.trim() || defaults.checkoutBaseUrl).replace(
      /\/$/,
      "",
    ),
    clientId: process.env.VIVA_CLIENT_ID?.trim() || "",
    clientSecret: process.env.VIVA_CLIENT_SECRET?.trim() || "",
    sourceCode: process.env.VIVA_SOURCE_CODE?.trim() || "Default",
    successUrl:
      process.env.VIVA_SUCCESS_URL?.trim() || "https://www.shishapoint.site/payment/success",
    failureUrl:
      process.env.VIVA_FAILURE_URL?.trim() || "https://www.shishapoint.site/payment/failed",
    webhookVerificationKey: process.env.VIVA_WEBHOOK_KEY?.trim() || "",
  };
}

export function hasVivaCredentials(config: VivaConfig = loadVivaConfig()): boolean {
  return Boolean(config.clientId && config.clientSecret && config.sourceCode);
}
