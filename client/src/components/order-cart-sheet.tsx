import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToastAction } from "@/components/ui/toast";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CreditCard } from "lucide-react";
import type { CartItem, OrderCreatePayload, OrderCreateResponse, OrderSourceContext } from "@/types/pos";

interface OrderCartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  onRemoveItem: (id: string) => void;
  onClear: () => void;
  sourceContext?: OrderSourceContext;
}

export function OrderCartSheet({
  open,
  onOpenChange,
  cartItems,
  onRemoveItem,
  onClear,
  sourceContext,
}: OrderCartSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [serviceMode, setServiceMode] = useState<"table" | "pickup">(sourceContext?.serviceMode ?? "pickup");
  const [tableCode, setTableCode] = useState(sourceContext?.tableCode ?? "");
  const [tableLabel, setTableLabel] = useState(sourceContext?.tableLabel ?? "");
  const [pickupPoint, setPickupPoint] = useState(sourceContext?.pickupPoint ?? "bar");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const shownCashInfoToastRef = useRef(false);
  const submitLockRef = useRef(false);

  const paymentContextQuery = useMemo(() => {
    const mode = serviceMode;
    const point = mode === "pickup" ? pickupPoint.trim() || "bar" : "";
    return { serviceMode: mode, pickupPoint: point };
  }, [serviceMode, pickupPoint]);

  const isTableOrderByQr = sourceContext?.serviceMode === "table" && !!sourceContext.tableCode;

  useEffect(() => {
    if (!open) {
      return;
    }
    if (isTableOrderByQr) {
      setServiceMode("table");
      setTableCode(sourceContext?.tableCode ?? "");
      setTableLabel(sourceContext?.tableLabel ?? "");
      return;
    }
    setServiceMode("pickup");
    setTableCode("");
    setTableLabel("");
    setPickupPoint(sourceContext?.pickupPoint ?? "bar");
  }, [
    open,
    isTableOrderByQr,
    sourceContext?.tableCode,
    sourceContext?.tableLabel,
    sourceContext?.pickupPoint,
  ]);

  const handleServiceModeChange = (nextMode: "table" | "pickup") => {
    if (nextMode === "table" && !isTableOrderByQr) {
      return;
    }
    if (nextMode === "pickup" && isTableOrderByQr) {
      return;
    }
    setServiceMode(nextMode);
  };

  const totals = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.basePrice * item.quantity, 0);
    const grandTotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
    return {
      subtotal,
      extras: grandTotal - subtotal,
      grandTotal,
    };
  }, [cartItems]);

  const hasClearableCartLines = useMemo(
    () => cartItems.some((item) => Number(item.preventRemoveFromCart ?? 0) !== 1),
    [cartItems],
  );

  const { data: paymentProviderInfo } = useQuery<{
    provider: "viva";
    configured: boolean;
    mode: "redirect";
    cardEnabled?: boolean;
    cashEnabled?: boolean;
  }>({
    queryKey: [
      "/api/payments/provider",
      paymentContextQuery.serviceMode,
      paymentContextQuery.pickupPoint,
    ],
    enabled: open,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("serviceMode", paymentContextQuery.serviceMode);
      if (paymentContextQuery.serviceMode === "pickup") {
        params.set("pickupPoint", paymentContextQuery.pickupPoint);
      }
      const response = await apiRequest("GET", `/api/payments/provider?${params.toString()}`);
      return response.json();
    },
  });

  const cardEnabled = paymentProviderInfo?.cardEnabled !== false;
  const cashEnabled = paymentProviderInfo?.cashEnabled !== false;

  useEffect(() => {
    if (!cardEnabled && paymentMethod === "card") {
      setPaymentMethod("cash");
    }
    if (!cashEnabled && paymentMethod === "cash") {
      setPaymentMethod("card");
    }
  }, [cardEnabled, cashEnabled, paymentMethod]);

  useEffect(() => {
    if (!open) {
      shownCashInfoToastRef.current = false;
      return;
    }
    if (paymentMethod !== "cash" || !cashEnabled) {
      shownCashInfoToastRef.current = false;
      return;
    }
    if (shownCashInfoToastRef.current) {
      return;
    }
    shownCashInfoToastRef.current = true;
    toast({
      title: "Cash payment notice",
      description: "Cash order continues only after payment at the Shisha bar is completed.",
      action: <ToastAction altText="Dismiss cash payment notice">OK</ToastAction>,
    });
  }, [open, paymentMethod, cashEnabled, toast]);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const payload: OrderCreatePayload = {
        payment: { method: paymentMethod },
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        serviceMode,
        tableCode: serviceMode === "table" ? tableCode.trim() || undefined : undefined,
        tableLabel: serviceMode === "table" ? tableLabel.trim() || undefined : undefined,
        pickupPoint: serviceMode === "pickup" ? pickupPoint.trim() || "bar" : undefined,
        sourceToken: sourceContext?.sourceToken,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
          selectedOptions: item.selectedOptions,
          selectedExtras: item.selectedExtras,
        })),
      };

      if (paymentMethod === "card") {
        if (!paymentProviderInfo?.configured) {
          throw new Error("Card payments are not configured. Contact the venue.");
        }
        const startResponse = await apiRequest("POST", "/api/payments/viva/start", {
          amount: Number(totals.grandTotal.toFixed(2)),
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          notes: payload.notes,
          serviceMode: payload.serviceMode,
          tableCode: payload.tableCode,
          tableLabel: payload.tableLabel,
          pickupPoint: payload.pickupPoint,
          sourceToken: payload.sourceToken,
          items: payload.items,
        });
        const started = (await startResponse.json()) as { checkoutUrl?: string };
        if (!started.checkoutUrl) {
          throw new Error("Could not start card payment. Please try again.");
        }
        window.location.assign(started.checkoutUrl);
        return null;
      }
      const response = await apiRequest("POST", "/api/orders", payload);
      return response.json() as Promise<OrderCreateResponse>;
    },
    onSuccess: (data) => {
      if (!data) {
        return;
      }
      const isCashPending =
        data.order.paymentProvider === "cash_counter" &&
        data.order.paymentStatus === "pending";
      toast({
        title: isCashPending ? "Cash order received" : "Order submitted",
        description: isCashPending
          ? `Order ${data.order.orderNumber} saved. Mark it Paid to release printing.`
          : `Order ${data.order.orderNumber} sent for printing.`,
      });
      onClear();
      setCustomerName("");
      setCustomerPhone("");
      setOrderNotes("");
      setServiceMode(sourceContext?.serviceMode ?? "pickup");
      setTableCode(sourceContext?.tableCode ?? "");
      setTableLabel(sourceContext?.tableLabel ?? "");
      setPickupPoint(sourceContext?.pickupPoint ?? "bar");
      setPaymentMethod(cashEnabled ? "cash" : "card");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/print-jobs/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/revenue/daily"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Could not submit order. Please try again.";
      toast({
        title: "Order failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg flex flex-col h-full max-h-[100dvh] p-0 gap-0 overflow-hidden"
      >
        <div className="px-4 pt-4 pb-2 shrink-0 border-b bg-white">
          <SheetHeader className="space-y-0.5 text-left">
            <SheetTitle className="text-lg">Current order</SheetTitle>
            <SheetDescription className="text-xs leading-snug">
              Review lines below. Ticket queues for the local print agent.
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 min-h-0 basis-0">
          <div className="px-4 py-2 space-y-2">
            {cartItems.length === 0 && (
              <p className="text-xs text-slate-500 py-4">No items in cart yet.</p>
            )}
            {cartItems.map((item) => (
              <div key={item.id} className="rounded-md border border-slate-200 p-2 text-sm">
                <div className="flex justify-between gap-2">
                  <p className="font-medium text-xs leading-tight">
                    {item.quantity}× {item.productName}
                  </p>
                  <p className="font-semibold text-xs shrink-0">€{item.lineTotal.toFixed(2)}</p>
                </div>
                {item.selectedOptions.length > 0 && (
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">
                    {item.selectedOptions.map((opt) => opt.name).join(", ")}
                  </p>
                )}
                {item.selectedExtras.length > 0 && (
                  <p className="text-[11px] text-slate-600 leading-tight">
                    +{" "}
                    {item.selectedExtras
                      .map((ext) => {
                        const label =
                          ext.quantity > 1 ? `${ext.name} ×${ext.quantity}` : ext.name;
                        return ext.groupName ? `${ext.groupName}: ${label}` : label;
                      })
                      .join(", ")}
                  </p>
                )}
                {item.notes && (
                  <p className="text-[11px] text-slate-500 mt-0.5">Note: {item.notes}</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 mt-1 px-2 text-[11px] text-red-600 hover:text-red-700"
                  onClick={() => onRemoveItem(item.id)}
                  disabled={Number(item.preventRemoveFromCart ?? 0) === 1}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t bg-slate-50/90 px-4 py-2 space-y-2">
          <div className="rounded-md border bg-white p-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Order type</span>
              {isTableOrderByQr ? (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={serviceMode === "table" ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    onClick={() => handleServiceModeChange("table")}
                  >
                    Table
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={serviceMode === "pickup" ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    onClick={() => handleServiceModeChange("pickup")}
                    disabled
                  >
                    Pickup
                  </Button>
                </div>
              ) : (
                <span className="text-xs font-medium text-slate-700">Pickup</span>
              )}
            </div>
            {serviceMode === "table" && isTableOrderByQr ? (
              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-0.5">
                  <Label htmlFor="table-code" className="text-[10px] text-slate-500">
                    Code
                  </Label>
                  <Input
                    id="table-code"
                    value={tableCode}
                    readOnly
                    placeholder="T12"
                    disabled
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label htmlFor="table-label" className="text-[10px] text-slate-500">
                    Label
                  </Label>
                  <Input
                    id="table-label"
                    value={tableLabel}
                    readOnly
                    placeholder="Optional"
                    disabled
                    className="h-8 text-xs"
                  />
                </div>
                <p className="col-span-2 text-[10px] text-slate-500">Table set from QR.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                <Label htmlFor="pickup-point" className="text-[10px] text-slate-500">
                  Pickup point
                </Label>
                <Input
                  id="pickup-point"
                  value={pickupPoint}
                  readOnly
                  disabled
                  placeholder="bar"
                  className="h-8 text-xs"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <Label htmlFor="customer-name" className="text-[10px] text-slate-500">
                Name
              </Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-0.5">
              <Label htmlFor="customer-phone" className="text-[10px] text-slate-500">
                Phone
              </Label>
              <Input
                id="customer-phone"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <Label htmlFor="order-notes" className="text-[10px] text-slate-500">
              Order note
            </Label>
            <Textarea
              id="order-notes"
              rows={1}
              value={orderNotes}
              onChange={(event) => setOrderNotes(event.target.value)}
              className="text-xs min-h-[2rem] py-1.5 resize-none"
            />
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-2 space-y-2">
            <div className="flex gap-2 items-start">
              <CreditCard className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-600 leading-snug">
                <p className="font-medium text-slate-800">Payment method</p>
                <p>
                  {cardEnabled && cashEnabled
                    ? "Select cash or card during checkout."
                    : cardEnabled
                      ? "Card payment only."
                      : "Card is temporarily unavailable. Cash only."}
                </p>
              </div>
            </div>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value === "card" ? "card" : "cash")}
              className={`grid gap-2 ${cardEnabled && cashEnabled ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {cashEnabled && (
                <label className="flex items-center gap-2 rounded border px-2 py-1.5 text-xs cursor-pointer">
                  <RadioGroupItem value="cash" id="payment-cash" />
                  <span>Cash on counter</span>
                </label>
              )}
              {cardEnabled && (
                <label className="flex items-center gap-2 rounded border px-2 py-1.5 text-xs cursor-pointer">
                  <RadioGroupItem value="card" id="payment-card" />
                  <span>Card payment</span>
                </label>
              )}
            </RadioGroup>
            {!cardEnabled && cashEnabled && (
              <p className="text-[10px] text-slate-500">
                Card payment is currently disabled by admin.
              </p>
            )}
            {!cashEnabled && cardEnabled && (
              <p className="text-[10px] text-slate-500">
                Cash payment is currently disabled by admin.
              </p>
            )}
            {paymentMethod === "card" && (
              <p className="text-[10px] text-slate-500">
                {paymentProviderInfo?.configured
                  ? "You will be redirected to Viva secure checkout to pay by card."
                  : "Card payments are not configured on the server yet."}
              </p>
            )}
            {paymentMethod === "cash" && (
              <p className="text-[10px] text-slate-500">
                Cash order continues only after payment at the Shisha bar is completed.
              </p>
            )}
          </div>

          <div className="rounded-md border bg-white p-2 text-xs space-y-0.5">
            <div className="flex justify-between">
              <span className="text-slate-600">Payment</span>
              <span className="font-medium">{paymentMethod === "card" ? "Card" : "Cash"}</span>
            </div>
          </div>

          <div className="rounded-md border bg-white p-2 text-xs space-y-0.5">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span>€{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Modifiers</span>
              <span>€{totals.extras.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold pt-0.5 border-t text-sm">
              <span>Total</span>
              <span>€{totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 pb-1">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={onClear}
              disabled={cartItems.length === 0 || !hasClearableCartLines}
            >
              Clear
            </Button>
            <Button
              className="flex-1 h-9"
              onClick={() => {
                if (submitLockRef.current || createOrderMutation.isPending) {
                  return;
                }
                if (totals.grandTotal <= 0) {
                  toast({
                    title: "Cannot place order",
                    description: "Order total must be greater than zero.",
                    variant: "destructive",
                  });
                  return;
                }
                submitLockRef.current = true;
                createOrderMutation.mutate(undefined, {
                  onSettled: () => {
                    submitLockRef.current = false;
                  },
                });
              }}
              disabled={
                cartItems.length === 0 ||
                createOrderMutation.isPending ||
                totals.grandTotal <= 0 ||
                (serviceMode === "table" && !tableCode.trim()) ||
                (paymentMethod === "card" && !cardEnabled) ||
                (paymentMethod === "cash" && !cashEnabled)
              }
            >
              {createOrderMutation.isPending ? "Submitting..." : "Place order"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
