import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";
import type { EditableProductModifiers, ProductModifiersResponse } from "@/types/pos";

interface ProductModifiersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function ProductModifiersModal({ open, onOpenChange, product }: ProductModifiersModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<EditableProductModifiers>({ optionGroups: [], extras: [] });

  const { data } = useQuery<ProductModifiersResponse>({
    queryKey: ["/api/products", product?.id, "modifiers", "admin"],
    enabled: open && !!product,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/products/${product!.id}/modifiers`);
      return response.json();
    },
  });

  useEffect(() => {
    if (!open || !data) return;
    setDraft({
      optionGroups: data.optionGroups.map((group) => ({
        name: group.name,
        isRequired: group.isRequired,
        sortOrder: group.sortOrder,
        options: group.options.map((option) => ({
          name: option.name,
          priceDelta: option.priceDelta,
          sortOrder: option.sortOrder,
          isActive: option.isActive,
          isDefault: option.isDefault,
        })),
      })),
      extras: data.extras.map((extra) => ({
        name: extra.name,
        priceDelta: extra.priceDelta,
        sortOrder: extra.sortOrder,
        isActive: extra.isActive,
      })),
    });
  }, [open, data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: EditableProductModifiers) => {
      await apiRequest("PUT", `/api/products/${product!.id}/modifiers`, payload);
    },
    onSuccess: () => {
      toast({
        title: "Modifiers updated",
        description: "Product options and extras have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products", product?.id, "modifiers"] });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Could not save product modifiers.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifiers: {product?.name ?? ""}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Option groups (single choice)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    optionGroups: [
                      ...prev.optionGroups,
                      { name: "", isRequired: 0, options: [{ name: "", priceDelta: 0, isDefault: 1 }] },
                    ],
                  }))
                }
              >
                Add group
              </Button>
            </div>
            {draft.optionGroups.map((group, groupIndex) => (
              <div key={`group-${groupIndex}`} className="border rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Group name"
                    value={group.name}
                    onChange={(event) =>
                      setDraft((prev) => {
                        const next = [...prev.optionGroups];
                        next[groupIndex] = { ...next[groupIndex], name: event.target.value };
                        return { ...prev, optionGroups: next };
                      })
                    }
                  />
                  <select
                    className="h-10 rounded-md border px-3 text-sm"
                    value={group.isRequired ? "1" : "0"}
                    onChange={(event) =>
                      setDraft((prev) => {
                        const next = [...prev.optionGroups];
                        next[groupIndex] = { ...next[groupIndex], isRequired: Number(event.target.value) };
                        return { ...prev, optionGroups: next };
                      })
                    }
                  >
                    <option value="0">Optional</option>
                    <option value="1">Required</option>
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        optionGroups: prev.optionGroups.filter((_, index) => index !== groupIndex),
                      }))
                    }
                  >
                    Remove group
                  </Button>
                </div>

                <div className="space-y-2">
                  {group.options.map((option, optionIndex) => (
                    <div key={`opt-${groupIndex}-${optionIndex}`} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <Input
                        placeholder="Option label"
                        value={option.name}
                        onChange={(event) =>
                          setDraft((prev) => {
                            const groups = [...prev.optionGroups];
                            const groupOptions = [...groups[groupIndex].options];
                            groupOptions[optionIndex] = { ...groupOptions[optionIndex], name: event.target.value };
                            groups[groupIndex] = { ...groups[groupIndex], options: groupOptions };
                            return { ...prev, optionGroups: groups };
                          })
                        }
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={option.priceDelta}
                        onChange={(event) =>
                          setDraft((prev) => {
                            const groups = [...prev.optionGroups];
                            const groupOptions = [...groups[groupIndex].options];
                            groupOptions[optionIndex] = {
                              ...groupOptions[optionIndex],
                              priceDelta: Number(event.target.value) || 0,
                            };
                            groups[groupIndex] = { ...groups[groupIndex], options: groupOptions };
                            return { ...prev, optionGroups: groups };
                          })
                        }
                      />
                      <select
                        className="h-10 rounded-md border px-3 text-sm"
                        value={option.isDefault ? "1" : "0"}
                        onChange={(event) =>
                          setDraft((prev) => {
                            const groups = [...prev.optionGroups];
                            const groupOptions = [...groups[groupIndex].options];
                            if (event.target.value === "1") {
                              groupOptions.forEach((current, idx) => {
                                groupOptions[idx] = { ...current, isDefault: idx === optionIndex ? 1 : 0 };
                              });
                            } else {
                              groupOptions[optionIndex] = { ...groupOptions[optionIndex], isDefault: 0 };
                            }
                            groups[groupIndex] = { ...groups[groupIndex], options: groupOptions };
                            return { ...prev, optionGroups: groups };
                          })
                        }
                      >
                        <option value="0">Not default</option>
                        <option value="1">Default</option>
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() =>
                          setDraft((prev) => {
                            const groups = [...prev.optionGroups];
                            groups[groupIndex] = {
                              ...groups[groupIndex],
                              options: groups[groupIndex].options.filter((_, idx) => idx !== optionIndex),
                            };
                            if (
                              groups[groupIndex].options.length > 0 &&
                              !groups[groupIndex].options.some((opt) => opt.isDefault)
                            ) {
                              groups[groupIndex].options[0] = {
                                ...groups[groupIndex].options[0],
                                isDefault: 1,
                              };
                            }
                            return { ...prev, optionGroups: groups };
                          })
                        }
                      >
                        Remove option
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDraft((prev) => {
                      const groups = [...prev.optionGroups];
                      groups[groupIndex] = {
                        ...groups[groupIndex],
                        options: [
                          ...groups[groupIndex].options,
                          { name: "", priceDelta: 0, isDefault: groups[groupIndex].options.length === 0 ? 1 : 0 },
                        ],
                      };
                      return { ...prev, optionGroups: groups };
                    })
                  }
                >
                  Add option
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Extras (multiple choice)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDraft((prev) => ({
                    ...prev,
                    extras: [...prev.extras, { name: "", priceDelta: 0, isActive: 1 }],
                  }))
                }
              >
                Add extra
              </Button>
            </div>
            {draft.extras.map((extra, extraIndex) => (
              <div key={`extra-${extraIndex}`} className="grid grid-cols-1 sm:grid-cols-4 gap-2 border rounded-lg p-3">
                <Input
                  placeholder="Extra name"
                  value={extra.name}
                  onChange={(event) =>
                    setDraft((prev) => {
                      const extras = [...prev.extras];
                      extras[extraIndex] = { ...extras[extraIndex], name: event.target.value };
                      return { ...prev, extras };
                    })
                  }
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={extra.priceDelta}
                  onChange={(event) =>
                    setDraft((prev) => {
                      const extras = [...prev.extras];
                      extras[extraIndex] = { ...extras[extraIndex], priceDelta: Number(event.target.value) || 0 };
                      return { ...prev, extras };
                    })
                  }
                />
                <select
                  className="h-10 rounded-md border px-3 text-sm"
                  value={extra.isActive ? "1" : "0"}
                  onChange={(event) =>
                    setDraft((prev) => {
                      const extras = [...prev.extras];
                      extras[extraIndex] = { ...extras[extraIndex], isActive: Number(event.target.value) };
                      return { ...prev, extras };
                    })
                  }
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      extras: prev.extras.filter((_, index) => index !== extraIndex),
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                saveMutation.mutate({
                  optionGroups: draft.optionGroups
                    .map((group) => ({
                      ...group,
                      options: group.options.filter((option) => option.name.trim().length > 0),
                    }))
                    .map((group) => {
                      const explicitDefaultIndex = group.options.findIndex((option) => option.isDefault);
                      return {
                        ...group,
                        options: group.options.map((option, index) => ({
                          ...option,
                          isDefault: explicitDefaultIndex >= 0 ? (index === explicitDefaultIndex ? 1 : 0) : index === 0 ? 1 : 0,
                        })),
                      };
                    })
                    .filter((group) => group.name.trim().length > 0),
                  extras: draft.extras.filter((extra) => extra.name.trim().length > 0),
                })
              }
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save modifiers"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
