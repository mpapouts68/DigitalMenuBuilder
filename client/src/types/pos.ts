import type { Product } from "@shared/schema";

export interface ModifierOption {
  id: number;
  groupId: number;
  name: string;
  priceDelta: number;
  sortOrder: number;
  isActive: number;
  isDefault: number;
  imageUrl?: string | null;
}

export interface ModifierOptionGroup {
  id: number;
  productId: number;
  name: string;
  isRequired: number;
  sortOrder: number;
  options: ModifierOption[];
}

export interface ModifierExtra {
  id: number;
  productId: number;
  name: string;
  priceDelta: number;
  sortOrder: number;
  isActive: number;
  imageUrl?: string | null;
}

export interface ProductModifiersResponse {
  optionGroups: ModifierOptionGroup[];
  extras: ModifierExtra[];
  maxFlavourSelections?: number;
  maxAddonSelections?: number;
}

export interface CartSelectionOption {
  groupName?: string;
  name: string;
  priceDelta: number;
}

export interface CartSelectionExtra {
  name: string;
  priceDelta: number;
  quantity: number;
}

export interface CartItem {
  id: string;
  productId: number;
  productName: string;
  basePrice: number;
  quantity: number;
  notes?: string;
  selectedOptions: CartSelectionOption[];
  selectedExtras: CartSelectionExtra[];
  lineTotal: number;
}

export interface OrderCreatePayload {
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
    selectedOptions?: CartSelectionOption[];
    selectedExtras?: CartSelectionExtra[];
  }>;
}

export interface OrderCreateResponse {
  order: {
    id: number;
    orderNumber: string;
    serviceMode?: "table" | "pickup";
    tableCode?: string | null;
    pickupPoint?: string | null;
    total: number;
    status: string;
    printStatus: string;
    paymentStatus?: string;
    paymentProvider?: string | null;
  };
}

export interface OrderSourceContext {
  serviceMode: "table" | "pickup";
  tableCode?: string;
  tableLabel?: string;
  pickupPoint?: string;
  sourceToken?: string;
}

export interface EditableModifierOption {
  name: string;
  priceDelta: number;
  sortOrder?: number;
  isActive?: number;
  isDefault?: number;
  imageUrl?: string;
}

export interface EditableModifierGroup {
  name: string;
  isRequired?: number;
  sortOrder?: number;
  options: EditableModifierOption[];
}

export interface EditableModifierExtra {
  name: string;
  priceDelta: number;
  sortOrder?: number;
  isActive?: number;
  imageUrl?: string;
}

export interface EditableProductModifiers {
  optionGroups: EditableModifierGroup[];
  extras: EditableModifierExtra[];
  maxFlavourSelections?: number;
  maxAddonSelections?: number;
}

export interface AdminOrder {
  id: number;
  orderNumber: string;
  status: string;
  printStatus: string;
  paymentStatus?: string;
  paymentProvider?: string | null;
  total: number;
  createdAt: number;
}

export interface PendingPrintJob {
  id: number;
  orderId: number;
  status: string;
  attempts: number;
  lastError?: string | null;
  createdAt: number;
  payload: string;
}

export interface DailyRevenueStats {
  businessDate: string;
  totalOrders: number;
  grossRevenue: number;
  openOrders: number;
}

export interface BrandingSettingsResponse {
  id: number;
  logoUrl?: string | null;
  footerLogoUrl?: string | null;
  footerText?: string | null;
  headerTitle?: string | null;
  headerSubtitle?: string | null;
  backgroundImageUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  updatedAt: number;
}

export interface BrandingUpdatePayload {
  logoUrl?: string;
  footerLogoUrl?: string;
  footerText?: string;
  headerTitle?: string;
  headerSubtitle?: string;
  backgroundImageUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

export interface PrinterSettingsResponse {
  id: number;
  enabled: number;
  printerIp?: string | null;
  printerPort: number;
  pollIntervalMs: number;
  printerProfile:
    | "generic_escpos"
    | "samsung_srp"
    | "samsung_srp_font_b"
    | "samsung_srp_legacy"
    | "gprinter_escpos";
  printerBeepMode: "auto" | "off" | "bel" | "esc_b" | "esc_p" | "both" | "both_plus_p";
  printerBeepCount: number;
  printerBeepTiming: number;
  printerRetryMaxAttempts: number;
  printerRetryCooldownMs: number;
  lastSeenAt?: number | null;
  lastStatus?: string | null;
  lastError?: string | null;
  lockToken?: string | null;
  lockHolder?: string | null;
  lockAcquiredAt?: number | null;
  lockExpiresAt?: number | null;
  updatedAt: number;
}

export interface PrinterDispatchResponse {
  status: "idle" | "printed" | "error";
  message?: string;
  jobId?: number;
  orderId?: number;
}

export interface ProductForOrdering extends Product {
  categoryName?: string;
}
