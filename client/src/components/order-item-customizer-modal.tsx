import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ProductModifiersResponse,
} from "@/types/pos";

interface OrderItemCustomizerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  initialQuantity?: number;
  onAddToCart: (item: CartItem) => void;
  onAddToCartAndCheckout?: (item: CartItem) => void;
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
  const [selectedExtras, setSelectedExtras] = useState<Record<number, boolean>>({});

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
    setSelectedExtras({});
  }, [initialQuantity, open, product?.id]);

  const optionGroups = data?.optionGroups ?? [];
  const extras = data?.extras ?? [];
  const flavourExtras = useMemo(
    () => extras.filter((e) => (e.sortOrder ?? 999) < 500),
    [extras],
  );
  const addonExtras = useMemo(
    () => extras.filter((e) => (e.sortOrder ?? 999) >= 500),
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
      .filter((extra) => selectedExtras[extra.id])
      .map((extra) => ({
        name: extra.name,
        priceDelta: extra.priceDelta ?? 0,
        quantity: 1,
      })) as CartSelectionExtra[];
  }, [extras, selectedExtras]);

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

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
              />
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
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value={option.id.toString()} id={`opt-${option.id}`} />
                              <Label htmlFor={`opt-${option.id}`}>{option.name}</Label>
                            </div>
                            <span className="text-sm text-slate-600">
                              {option.priceDelta > 0 ? `+EUR ${option.priceDelta.toFixed(2)}` : "Included"}
                            </span>
                          </div>
                        ))}
                    </RadioGroup>
                  </div>
                ))}

                {flavourExtras.length > 0 && (
                  <div className="space-y-2 border rounded-lg p-3">
                    <Label className="font-semibold">Flavours</Label>
                    <p className="text-xs text-slate-500 mb-2">Select one or more (multi-select).</p>
                    {flavourExtras
                      .filter((extra) => extra.isActive)
                      .map((extra) => (
                        <div key={extra.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`extra-${extra.id}`}
                              checked={!!selectedExtras[extra.id]}
                              onCheckedChange={(checked) =>
                                setSelectedExtras((prev) => ({
                                  ...prev,
                                  [extra.id]: checked === true,
                                }))
                              }
                            />
                            <Label htmlFor={`extra-${extra.id}`}>{extra.name}</Label>
                          </div>
                          <span className="text-sm text-slate-600">
                            {extra.priceDelta > 0 ? `+EUR ${extra.priceDelta.toFixed(2)}` : "Included"}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                {addonExtras.length > 0 && (
                  <div className="space-y-2 border rounded-lg p-3">
                    <Label className="font-semibold">Add-ons</Label>
                    {addonExtras
                      .filter((extra) => extra.isActive)
                      .map((extra) => (
                        <div key={extra.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`extra-${extra.id}`}
                              checked={!!selectedExtras[extra.id]}
                              onCheckedChange={(checked) =>
                                setSelectedExtras((prev) => ({
                                  ...prev,
                                  [extra.id]: checked === true,
                                }))
                              }
                            />
                            <Label htmlFor={`extra-${extra.id}`}>{extra.name}</Label>
                          </div>
                          <span className="text-sm text-slate-600">
                            {extra.priceDelta > 0 ? `+EUR ${extra.priceDelta.toFixed(2)}` : "Included"}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}

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
