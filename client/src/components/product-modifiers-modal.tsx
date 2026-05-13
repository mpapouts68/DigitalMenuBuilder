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
import { ModifierChoiceImage } from "@/components/modifier-choice-image";
import { extrasToEditableGroups, flattenExtraGroupsForApi } from "@/lib/extra-groups";
import { nanoid } from "nanoid";

interface ProductModifiersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

const emptyFlavourGroups = () => [{ clientKey: nanoid(), name: "", extras: [] }];
const emptyAddonGroups = () => [{ clientKey: nanoid(), name: "", extras: [] }];

export function ProductModifiersModal({ open, onOpenChange, product }: ProductModifiersModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<EditableProductModifiers>({
    optionGroups: [],
    flavourExtraGroups: emptyFlavourGroups(),
    addonExtraGroups: emptyAddonGroups(),
    maxFlavourSelections: 0,
    maxAddonSelections: 0,
    flavourSectionTitle: "",
    flavourSectionDescription: "",
    addonSectionTitle: "",
    addonSectionDescription: "",
  });

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
          imageUrl: option.imageUrl ?? "",
        })),
      })),
      flavourExtraGroups: extrasToEditableGroups(data.extras, "flavour"),
      addonExtraGroups: extrasToEditableGroups(data.extras, "addon"),
      maxFlavourSelections: data.maxFlavourSelections ?? 0,
      maxAddonSelections: data.maxAddonSelections ?? 0,
      flavourSectionTitle: data.flavourSectionTitle ?? "",
      flavourSectionDescription: data.flavourSectionDescription ?? "",
      addonSectionTitle: data.addonSectionTitle ?? "",
      addonSectionDescription: data.addonSectionDescription ?? "",
    });
  }, [open, data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: EditableProductModifiers) => {
      const cleanedOptionGroups = payload.optionGroups
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
              imageUrl: option.imageUrl?.trim() || undefined,
              isDefault:
                explicitDefaultIndex >= 0 ? (index === explicitDefaultIndex ? 1 : 0) : index === 0 ? 1 : 0,
            })),
          };
        })
        .filter((group) => group.name.trim().length > 0);

      const flavourFlat = flattenExtraGroupsForApi(payload.flavourExtraGroups, 0);
      const addonFlat = flattenExtraGroupsForApi(payload.addonExtraGroups, 500);
      await apiRequest("PUT", `/api/products/${product!.id}/modifiers`, {
        optionGroups: cleanedOptionGroups,
        extras: [...flavourFlat, ...addonFlat],
        maxFlavourSelections: payload.maxFlavourSelections ?? 0,
        maxAddonSelections: payload.maxAddonSelections ?? 0,
        flavourSectionTitle: payload.flavourSectionTitle ?? "",
        flavourSectionDescription: payload.flavourSectionDescription ?? "",
        addonSectionTitle: payload.addonSectionTitle ?? "",
        addonSectionDescription: payload.addonSectionDescription ?? "",
      });
    },
    onSuccess: () => {
      toast({
        title: "Modifiers updated",
        description: "Product options and extras have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products", product?.id, "modifiers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
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

  const renderExtraGroupSection = (
    title: string,
    hint: string,
    sectionKey: "flavourExtraGroups" | "addonExtraGroups",
    addGroupLabel: string,
  ) => (
    <div className="space-y-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label className="text-base font-semibold">{title}</Label>
          <p className="text-xs text-slate-600">{hint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setDraft((prev) => ({
              ...prev,
              [sectionKey]: [
                ...prev[sectionKey],
                { clientKey: nanoid(), name: "New group", extras: [] },
              ],
            }))
          }
        >
          {addGroupLabel}
        </Button>
      </div>
      {draft[sectionKey].map((group, groupIndex) => (
        <div key={group.clientKey} className="border rounded-lg p-3 space-y-3 bg-white">
          <div className="flex flex-wrap items-center gap-2">
            {groupIndex === 0 ? (
              <div className="flex-1 min-w-[160px] space-y-0.5">
                <p className="text-sm font-medium text-slate-800">Default group</p>
                <p className="text-xs text-slate-500">No section title on the menu. Add extras below.</p>
              </div>
            ) : (
              <>
                <Input
                  className="flex-1 min-w-[160px]"
                  placeholder="Group title (shown on menu)"
                  value={group.name}
                  onChange={(event) =>
                    setDraft((prev) => {
                      const groups = [...prev[sectionKey]];
                      groups[groupIndex] = { ...groups[groupIndex], name: event.target.value };
                      return { ...prev, [sectionKey]: groups };
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() =>
                    setDraft((prev) => {
                      const groups = [...prev[sectionKey]];
                      const moving = groups[groupIndex].extras;
                      const next = groups.filter((_, i) => i !== groupIndex);
                      next[0] = { ...next[0], extras: [...next[0].extras, ...moving] };
                      return { ...prev, [sectionKey]: next };
                    })
                  }
                >
                  Remove group (extras → default)
                </Button>
              </>
            )}
          </div>

          <div className="space-y-2">
            {group.extras.map((extra, extraIndex) => (
              <div
                key={`${group.clientKey}-ex-${extraIndex}`}
                className="flex flex-wrap items-center gap-2 border border-slate-100 rounded-md p-2"
              >
                <ModifierChoiceImage
                  idPrefix={`${sectionKey}-${groupIndex}-${extraIndex}`}
                  value={extra.imageUrl ?? ""}
                  onChange={(next) =>
                    setDraft((prev) => {
                      const groups = [...prev[sectionKey]];
                      const ex = [...groups[groupIndex].extras];
                      ex[extraIndex] = { ...ex[extraIndex], imageUrl: next };
                      groups[groupIndex] = { ...groups[groupIndex], extras: ex };
                      return { ...prev, [sectionKey]: groups };
                    })
                  }
                />
                <Input
                  className="flex-1 min-w-[140px]"
                  placeholder="Extra name"
                  value={extra.name}
                  onChange={(event) =>
                    setDraft((prev) => {
                      const groups = [...prev[sectionKey]];
                      const ex = [...groups[groupIndex].extras];
                      ex[extraIndex] = { ...ex[extraIndex], name: event.target.value };
                      groups[groupIndex] = { ...groups[groupIndex], extras: ex };
                      return { ...prev, [sectionKey]: groups };
                    })
                  }
                />
                <Input
                  className="w-[90px]"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={extra.priceDelta}
                  onChange={(event) =>
                    setDraft((prev) => {
                      const groups = [...prev[sectionKey]];
                      const ex = [...groups[groupIndex].extras];
                      ex[extraIndex] = { ...ex[extraIndex], priceDelta: Number(event.target.value) || 0 };
                      groups[groupIndex] = { ...groups[groupIndex], extras: ex };
                      return { ...prev, [sectionKey]: groups };
                    })
                  }
                />
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-slate-500 whitespace-nowrap">Max qty</Label>
                  <Input
                    className="w-[64px]"
                    type="number"
                    min={1}
                    max={99}
                    title="Max units per line item (1 = checkbox only)"
                    value={extra.maxQuantity ?? 1}
                    onChange={(event) =>
                      setDraft((prev) => {
                        const groups = [...prev[sectionKey]];
                        const ex = [...groups[groupIndex].extras];
                        ex[extraIndex] = {
                          ...ex[extraIndex],
                          maxQuantity: Math.max(1, Math.min(99, Number(event.target.value) || 1)),
                        };
                        groups[groupIndex] = { ...groups[groupIndex], extras: ex };
                        return { ...prev, [sectionKey]: groups };
                      })
                    }
                  />
                </div>
                <select
                  className="h-10 rounded-md border px-3 text-sm min-w-[100px]"
                  value={extra.isActive ? "1" : "0"}
                  onChange={(event) =>
                    setDraft((prev) => {
                      const groups = [...prev[sectionKey]];
                      const ex = [...groups[groupIndex].extras];
                      ex[extraIndex] = { ...ex[extraIndex], isActive: Number(event.target.value) };
                      groups[groupIndex] = { ...groups[groupIndex], extras: ex };
                      return { ...prev, [sectionKey]: groups };
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
                    setDraft((prev) => {
                      const groups = [...prev[sectionKey]];
                      const ex = groups[groupIndex].extras.filter((_, i) => i !== extraIndex);
                      groups[groupIndex] = { ...groups[groupIndex], extras: ex };
                      return { ...prev, [sectionKey]: groups };
                    })
                  }
                >
                  Remove
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
                const groups = [...prev[sectionKey]];
                groups[groupIndex] = {
                  ...groups[groupIndex],
                  extras: [
                    ...groups[groupIndex].extras,
                    { name: "", priceDelta: 0, isActive: 1, imageUrl: "", maxQuantity: 1 },
                  ],
                };
                return { ...prev, [sectionKey]: groups };
              })
            }
          >
            Add extra to this group
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifiers: {product?.name ?? ""}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-3">
            <Label className="text-base font-semibold">Extra selection limits</Label>
            <p className="text-xs text-slate-600">
              Caps how many flavour / add-on units guests can pick (each quantity counts). Use <strong>0</strong> for no
              limit.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="max-flavours">Max flavours</Label>
                <Input
                  id="max-flavours"
                  type="number"
                  min={0}
                  max={50}
                  value={draft.maxFlavourSelections ?? 0}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      maxFlavourSelections: Math.max(0, Math.min(50, Number(e.target.value) || 0)),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="max-addons">Max add-ons</Label>
                <Input
                  id="max-addons"
                  type="number"
                  min={0}
                  max={50}
                  value={draft.maxAddonSelections ?? 0}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      maxAddonSelections: Math.max(0, Math.min(50, Number(e.target.value) || 0)),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-3">
            <Label className="text-base font-semibold">Section texts (menu display)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="flavour-section-title">Flavour title</Label>
                <Input
                  id="flavour-section-title"
                  value={draft.flavourSectionTitle ?? ""}
                  placeholder="Flavours"
                  onChange={(e) => setDraft((prev) => ({ ...prev, flavourSectionTitle: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="addon-section-title">Add-on title</Label>
                <Input
                  id="addon-section-title"
                  value={draft.addonSectionTitle ?? ""}
                  placeholder="Add-ons"
                  onChange={(e) => setDraft((prev) => ({ ...prev, addonSectionTitle: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="flavour-section-description">Flavour description</Label>
                <Input
                  id="flavour-section-description"
                  value={draft.flavourSectionDescription ?? ""}
                  placeholder="Select one or more."
                  onChange={(e) => setDraft((prev) => ({ ...prev, flavourSectionDescription: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="addon-section-description">Add-on description</Label>
                <Input
                  id="addon-section-description"
                  value={draft.addonSectionDescription ?? ""}
                  placeholder="Optional extras."
                  onChange={(e) => setDraft((prev) => ({ ...prev, addonSectionDescription: e.target.value }))}
                />
              </div>
            </div>
          </div>

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
                      {
                        name: "",
                        isRequired: 0,
                        options: [{ name: "", priceDelta: 0, isDefault: 1, imageUrl: "" }],
                      },
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
                    <div
                      key={`opt-${groupIndex}-${optionIndex}`}
                      className="flex flex-wrap items-center gap-2 border border-slate-100 rounded-md p-2"
                    >
                      <ModifierChoiceImage
                        idPrefix={`opt-${groupIndex}-${optionIndex}`}
                        value={option.imageUrl ?? ""}
                        onChange={(next) =>
                          setDraft((prev) => {
                            const groups = [...prev.optionGroups];
                            const groupOptions = [...groups[groupIndex].options];
                            groupOptions[optionIndex] = { ...groupOptions[optionIndex], imageUrl: next };
                            groups[groupIndex] = { ...groups[groupIndex], options: groupOptions };
                            return { ...prev, optionGroups: groups };
                          })
                        }
                      />
                      <Input
                        className="flex-1 min-w-[140px]"
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
                        className="w-[100px]"
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
                        className="h-10 rounded-md border px-3 text-sm min-w-[120px]"
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
                          {
                            name: "",
                            priceDelta: 0,
                            isDefault: 0,
                            imageUrl: "",
                          },
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

          {renderExtraGroupSection(
            "Flavours (multiple choice)",
            "Default group has no heading. Named groups show a title on the menu. Saved with sort order 0–499.",
            "flavourExtraGroups",
            "Add flavour group",
          )}

          {renderExtraGroupSection(
            "Add-ons (multiple choice)",
            "Same as flavours, but these count toward the add-on limit. Saved with sort order 500+.",
            "addonExtraGroups",
            "Add add-on group",
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save modifiers"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
