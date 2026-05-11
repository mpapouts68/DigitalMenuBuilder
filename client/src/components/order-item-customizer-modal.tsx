import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";
import type {
  CartItem,
  CartSelectionExtra,
  CartSelectionOption,
  ModifierExtra,
  ProductModifiersResponse,
} from "@/types/pos";
import { groupExtrasForSectionDisplay } from "@/lib/extra-groups";

interface OrderItemCustomizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  initialQuantity?: number;
  onAddToCart: (item: CartItem) => void;
  onAddToCartAndCheckout?: (item: CartItem) => void;
}

function extraMaxQty(extra: ModifierExtra): number {
  return Math.max(1, Math.min(99, Number(extra.maxQuantity ?? 1)));
}

export function OrderItemCustomizerModal({
  open,
  onOpenChange,
  product,
  initialQuantity = 1,
  onAddToCart,
  onAddToCartAndCheckout,
}: OrderItemCustomizerModalProps) {
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  /** Per-extra line quantity; 0 = not selected */
  const [selectedExtraQty, setSelectedExtraQty] = useState<Record<number, number>>({});

  const { data, isLoading } = useQuery<ProductModifiersResponse>({
    queryKey: ["/api/products", product?.id, "modifiers"],
    enabled: open && !!product,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/products/${product!.id}/modifiers`);
      return response.json();
    },
  });

  useEffect(() => {
    if (!open) return;
    setQuantity(Math.max(1, initialQuantity));
    setNotes("");
    setSelectedOptions({});
    setSelectedExtraQty({});
  }, [initialQuantity, open, product?.id]);

  const optionGroups = data?.optionGroups ?? [];
  const extras = data?.extras ?? [];
  const maxFlavourSelections = Math.max(
    0,
    data?.maxFlavourSelections ?? Number((product as { maxFlavourSelections?: number })?.maxFlavourSelections ?? 0),
  );
  const maxAddonSelections = Math.max(
    0,
    data?.maxAddonSelections ?? Number((product as { maxAddonSelections?: number })?.maxAddonSelections ?? 0),
  );

  const flavourDisplayGroups = useMemo(() => groupExtrasForSectionDisplay(extras, "flavour"), [extras]);
  const addonDisplayGroups = useMemo(() => groupExtrasForSectionDisplay(extras, "addon"), [extras]);
  const flavourSectionTitle = data?.flavourSectionTitle?.trim() || "Flavours";
  const addonSectionTitle = data?.addonSectionTitle?.trim() || "Add-ons";
  const flavourSectionDescription = data?.flavourSectionDescription?.trim() || "Select one or more (multi-select).";
  const addonSectionDescription =
    data?.addonSectionDescription?.trim() ||
    (maxAddonSelections > 0 ? `Max ${maxAddonSelections} unit(s).` : "");

  const flavourExtrasFlat = useMemo(
    () => extras.filter((e) => (e.sortOrder ?? 999) < 500 && e.isActive),
    [extras],
  );
  const addonExtrasFlat = useMemo(
    () => extras.filter((e) => (e.sortOrder ?? 999) >= 500 && e.isActive),
    [extras],
  );

  useEffect(() => {
    if (!open || optionGroups.length === 0) return;
    const defaults: Record<number, number> = {};
    for (const group of optionGroups) {
      const activeOptions = group.options.filter((option) => option.isActive);
      if (activeOptions.length === 0) continue;
      const picked = activeOptions.find((option) => option.isDefault) ?? activeOptions[0];
      defaults[group.id] = picked.id;
    }
    setSelectedOptions(defaults);
  }, [open, optionGroups]);

  const selectedOptionRows = useMemo(() => {
    const rows: CartSelectionOption[] = [];
    for (const group of optionGroups) {
      const selectedOptionId = selectedOptions[group.id];
      if (!selectedOptionId) continue;
      const option = group.options.find((row) => row.id === selectedOptionId);
      if (!option) continue;
      rows.push({
        groupName: group.name,
        name: option.name,
        priceDelta: option.priceDelta ?? 0,
      });
    }
    return rows;
  }, [optionGroups, selectedOptions]);

  const selectedExtraRows = useMemo(() => {
    return extras
      .map((extra) => {
        const q = selectedExtraQty[extra.id] ?? 0;
        if (q <= 0 || !extra.isActive) return null;
        const gn = (extra.groupName ?? "").trim();
        return {
          name: extra.name,
          priceDelta: extra.priceDelta ?? 0,
          quantity: q,
          ...(gn ? { groupName: gn } : {}),
        } as CartSelectionExtra;
      })
      .filter(Boolean) as CartSelectionExtra[];
  }, [extras, selectedExtraQty]);

  const effectiveBasePrice = useMemo(() => {
    const rawPrice = Number(product?.price ?? 0);
    const isSpecial = Number(product?.isSpecialOffer ?? 0) === 1;
    const rawDiscount = Number(product?.specialOfferDiscountPercent ?? 0);
    const discountPercent = isSpecial ? Math.max(0, Math.min(100, Math.round(rawDiscount))) : 0;
    const discounted = rawPrice * (1 - discountPercent / 100);
    return Math.round(discounted * 100) / 100;
  }, [product?.price, product?.isSpecialOffer, product?.specialOfferDiscountPercent]);

  const totals = useMemo(() => {
    const base = effectiveBasePrice * quantity;
    const optionsTotal = selectedOptionRows.reduce((sum, row) => sum + row.priceDelta, 0) * quantity;
    const extrasTotal = selectedExtraRows.reduce((sum, row) => sum + row.priceDelta * row.quantity, 0) * quantity;
    return {
      base,
      optionsTotal,
      extrasTotal,
      total: base + optionsTotal + extrasTotal,
    };
  }, [effectiveBasePrice, quantity, selectedOptionRows, selectedExtraRows]);

  const requiredGroupMissing = optionGroups.some((group) => {
    if (!group.isRequired) return false;
    return !selectedOptions[group.id];
  });

  const hasAnyModifiersSelected = selectedOptionRows.length > 0 || selectedExtraRows.length > 0;

  const sumFlavourQty = () =>
    flavourExtrasFlat.reduce((sum, e) => sum + (selectedExtraQty[e.id] ?? 0), 0);
  const sumAddonQty = () =>
    addonExtrasFlat.reduce((sum, e) => sum + (selectedExtraQty[e.id] ?? 0), 0);

  const setExtraQty = (extra: ModifierExtra, next: number) => {
    const cap = extraMaxQty(extra);
    const clamped = Math.max(0, Math.min(cap, next));
    setSelectedExtraQty((prev) => {
      if (clamped === 0) {
        const { [extra.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [extra.id]: clamped };
    });
  };

  const trySelectExtra = (extra: ModifierExtra, wantOn: boolean) => {
    if (!wantOn) {
      setExtraQty(extra, 0);
      return;
    }
    const isFlavour = (extra.sortOrder ?? 999) < 500;
    if (isFlavour && maxFlavourSelections > 0 && sumFlavourQty() >= maxFlavourSelections) {
      toast({
        title: "Limit reached",
        description: `You can select at most ${maxFlavourSelections} flavour unit(s).`,
        variant: "destructive",
      });
      return;
    }
    if (!isFlavour && maxAddonSelections > 0 && sumAddonQty() >= maxAddonSelections) {
      toast({
        title: "Limit reached",
        description: `You can select at most ${maxAddonSelections} add-on unit(s).`,
        variant: "destructive",
      });
      return;
    }
    setExtraQty(extra, 1);
  };

  const buildCartItem = (): CartItem | null => {
    if (!product) return null;
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productId: product.id,
      productName: product.name,
      basePrice: effectiveBasePrice,
      quantity,
      notes: notes.trim() || undefined,
      selectedOptions: selectedOptionRows,
      selectedExtras: selectedExtraRows,
      lineTotal: totals.total,
    };
  };

  const handleSubmit = () => {
    if (!product) return;
    if (requiredGroupMissing) {
      toast({
        title: "Selection required",
        description: "Please choose one option in each required section.",
        variant: "destructive",
      });
      return;
    }

    const cartItem = buildCartItem();
    if (!cartItem) return;
    onAddToCart(cartItem);
    onOpenChange(false);
  };

  const handleSubmitAndCheckout = () => {
    if (!product) return;
    if (requiredGroupMissing) {
      toast({
        title: "Selection required",
        description: "Please choose one option in each required section.",
        variant: "destructive",
      });
      return;
    }

    const cartItem = buildCartItem();
    if (!cartItem) return;
    if (onAddToCartAndCheckout) {
      onAddToCartAndCheckout(cartItem);
    } else {
      onAddToCart(cartItem);
    }
    onOpenChange(false);
  };

  const renderExtraRow = (extra: ModifierExtra) => {
    const q = selectedExtraQty[extra.id] ?? 0;
    const maxQ = extraMaxQty(extra);
    const isFlavour = (extra.sortOrder ?? 999) < 500;

    return (
      <div key={extra.id} className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {extra.imageUrl?.trim() ? (
            <img
              src={extra.imageUrl.trim()}
              alt=""
              className="h-9 w-9 rounded-md object-cover shrink-0 border border-slate-200"
            />
          ) : null}
          <Checkbox
            id={`extra-${extra.id}`}
            checked={q > 0}
            onCheckedChange={(checked) => trySelectExtra(extra, checked === true)}
          />
          <Label htmlFor={`extra-${extra.id}`} className="truncate">
            {extra.name}
          </Label>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-slate-600">
            {extra.priceDelta > 0 ? `+EUR ${extra.priceDelta.toFixed(2)}` : "Included"}
          </span>
          {maxQ > 1 && q > 0 ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Decrease extra quantity"
                onClick={() => {
                  if (q <= 1) setExtraQty(extra, 0);
                  else setExtraQty(extra, q - 1);
                }}
              >
                −
              </Button>
              <span className="tabular-nums w-6 text-center text-sm font-medium">{q}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label="Increase extra quantity"
                onClick={() => {
                  if (isFlavour && maxFlavourSelections > 0 && sumFlavourQty() >= maxFlavourSelections) {
                    toast({
                      title: "Limit reached",
                      description: `You can select at most ${maxFlavourSelections} flavour unit(s).`,
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!isFlavour && maxAddonSelections > 0 && sumAddonQty() >= maxAddonSelections) {
                    toast({
                      title: "Limit reached",
                      description: `You can select at most ${maxAddonSelections} add-on unit(s).`,
                      variant: "destructive",
                    });
                    return;
                  }
                  setExtraQty(extra, q + 1);
                }}
                disabled={q >= maxQ}
              >
                +
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product?.name ?? "Customize item"}</DialogTitle>
        </DialogHeader>

        {!product ? null : (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 bg-slate-50">
              <p className="text-sm text-slate-600">{product.description}</p>
              <p className="text-sm font-semibold mt-2">Base: EUR {effectiveBasePrice.toFixed(2)}</p>
              {Number(product.isSpecialOffer ?? 0) === 1 &&
                Math.max(0, Math.min(100, Math.round(Number(product.specialOfferDiscountPercent ?? 0)))) > 0 && (
                  <p className="text-xs text-rose-700 mt-1">
                    Special offer applied: -
                    {Math.max(0, Math.min(100, Math.round(Number(product.specialOfferDiscountPercent ?? 0))))}%
                  </p>
                )}
            </div>

            {isLoading ? (
              <p className="text-sm text-slate-500">Loading options...</p>
            ) : (
              <>
                {optionGroups.map((group) => (
                  <div key={group.id} className="space-y-2 border rounded-lg p-3">
                    <Label className="font-semibold">
                      {group.name} {group.isRequired ? "*" : ""}
                    </Label>
                    <RadioGroup
                      value={selectedOptions[group.id]?.toString() ?? ""}
                      onValueChange={(value) =>
                        setSelectedOptions((prev) => ({
                          ...prev,
                          [group.id]: Number(value),
                        }))
                      }
                    >
                      {group.options
                        .filter((option) => option.isActive)
                        .map((option) => (
                          <div key={option.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {option.imageUrl?.trim() ? (
                                <img
                                  src={option.imageUrl.trim()}
                                  alt=""
                                  className="h-9 w-9 rounded-md object-cover shrink-0 border border-slate-200"
                                />
                              ) : null}
                              <RadioGroupItem value={option.id.toString()} id={`opt-${option.id}`} />
                              <Label htmlFor={`opt-${option.id}`} className="truncate">
                                {option.name}
                              </Label>
                            </div>
                            <span className="text-sm text-slate-600 shrink-0">
                              {option.priceDelta > 0 ? `+EUR ${option.priceDelta.toFixed(2)}` : "Included"}
                            </span>
                          </div>
                        ))}
                    </RadioGroup>
                  </div>
                ))}

                {flavourDisplayGroups.length > 0 && (
                  <div className="space-y-3 border rounded-lg p-3">
                    <div>
                      <Label className="font-semibold">{flavourSectionTitle}</Label>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {flavourSectionDescription}
                        {maxFlavourSelections > 0 ? (
                          <span className="font-medium text-slate-700"> Max {maxFlavourSelections} unit(s).</span>
                        ) : null}
                      </p>
                    </div>
                    {flavourDisplayGroups.map((g) => (
                      <div key={g.key} className="space-y-2">
                        {g.title ? <p className="text-sm font-medium text-slate-800">{g.title}</p> : null}
                        <div className="space-y-2 pl-0">{g.extras.filter((e) => e.isActive).map(renderExtraRow)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {addonDisplayGroups.length > 0 && (
                  <div className="space-y-3 border rounded-lg p-3">
                    <div>
                      <Label className="font-semibold">{addonSectionTitle}</Label>
                      {addonSectionDescription ? (
                        <p className="text-xs text-slate-500 mt-0.5">{addonSectionDescription}</p>
                      ) : null}
                    </div>
                    {addonDisplayGroups.map((g) => (
                      <div key={g.key} className="space-y-2">
                        {g.title ? <p className="text-sm font-medium text-slate-800">{g.title}</p> : null}
                        <div className="space-y-2 pl-0">{g.extras.filter((e) => e.isActive).map(renderExtraRow)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3 bg-slate-50">
              <div>
                <Label className="font-semibold">Quantity</Label>
                <p className="text-xs text-slate-500 mt-0.5">Usually 1 — use + only when you need more identical lines.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </Button>
                <span className="tabular-nums min-w-[2rem] text-center font-semibold">{quantity}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Special request..."
              />
            </div>

            <div className="rounded-lg border p-3 bg-slate-50 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Base</span>
                <span>EUR {totals.base.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Options</span>
                <span>EUR {totals.optionsTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Extras</span>
                <span>EUR {totals.extrasTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-1 border-t">
                <span>Total</span>
                <span>EUR {totals.total.toFixed(2)}</span>
              </div>
            </div>

            {quantity > 1 && hasAnyModifiersSelected && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Selected options and extras will be applied to every item in this quantity.
              </div>
            )}

            <div className="grid gap-2">
              <Button onClick={handleSubmit} className="w-full">
                Add to order
              </Button>
              <Button onClick={handleSubmitAndCheckout} variant="outline" className="w-full">
                Add to order and checkout
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
