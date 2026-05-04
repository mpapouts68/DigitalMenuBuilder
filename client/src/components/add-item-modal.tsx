import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, ImageIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema } from "@shared/schema";
import type { Category, Product } from "@shared/schema";
import type { z } from "zod";

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem: Product | null;
  categories: Category[];
  selectedCategoryId: number | null;
}

export function AddItemModal({ 
  open, 
  onOpenChange, 
  editingItem, 
  categories, 
  selectedCategoryId 
}: AddItemModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [priceInput, setPriceInput] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  type ProductFormValues = z.infer<typeof insertProductSchema>;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      name: editingItem?.name || "",
      price: editingItem?.price ?? 0,
      description: editingItem?.description || "",
      details: editingItem?.details || "",
      imageUrl: editingItem?.imageUrl || "",
      categoryId: editingItem?.categoryId || selectedCategoryId || categories[0]?.id || 0,
      isSpecialOffer: editingItem?.isSpecialOffer ?? 0,
      isTopSelling: editingItem?.isTopSelling ?? 0,
      specialOfferDiscountPercent: editingItem?.specialOfferDiscountPercent ?? 0,
      maxFlavourSelections: (editingItem as { maxFlavourSelections?: number })?.maxFlavourSelections ?? 0,
      maxAddonSelections: (editingItem as { maxAddonSelections?: number })?.maxAddonSelections ?? 0,
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      await apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Item added",
        description: "New menu item has been created.",
      });
      onOpenChange(false);
      form.reset();
      setPriceInput("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create menu item.",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      await apiRequest("PUT", `/api/products/${editingItem!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Item updated",
        description: "Menu item has been updated.",
      });
      onOpenChange(false);
      form.reset();
      setPriceInput("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update menu item.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormValues) => {
    const payload: ProductFormValues = {
      ...data,
      imageUrl: imageUrl.trim() || "",
    };
    if (editingItem) {
      updateProductMutation.mutate(payload);
    } else {
      createProductMutation.mutate(payload);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "File too large",
          description: "Please select an image smaller than 2MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setImageUrl(result);
        form.setValue("imageUrl", result, { shouldDirty: true, shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setImagePreview(url);
    form.setValue("imageUrl", url, { shouldDirty: true, shouldValidate: true });
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageUrl("");
    form.setValue("imageUrl", "", { shouldDirty: true, shouldValidate: true });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Reset form when modal opens/closes or editing item changes
  useEffect(() => {
    if (open) {
      const values = {
        name: editingItem?.name || "",
        price: editingItem?.price ?? 0,
        description: editingItem?.description || "",
        details: editingItem?.details || "",
        imageUrl: editingItem?.imageUrl || "",
        categoryId: editingItem?.categoryId || selectedCategoryId || categories[0]?.id || 0,
        isSpecialOffer: editingItem?.isSpecialOffer ?? 0,
        isTopSelling: editingItem?.isTopSelling ?? 0,
        specialOfferDiscountPercent: editingItem?.specialOfferDiscountPercent ?? 0,
        maxFlavourSelections: (editingItem as { maxFlavourSelections?: number })?.maxFlavourSelections ?? 0,
        maxAddonSelections: (editingItem as { maxAddonSelections?: number })?.maxAddonSelections ?? 0,
      };
      form.reset(values);
      setImagePreview(editingItem?.imageUrl || null);
      setImageUrl(editingItem?.imageUrl || "");
      form.setValue("imageUrl", editingItem?.imageUrl || "", { shouldValidate: false });
      setPriceInput(
        editingItem?.price !== undefined && editingItem?.price !== null
          ? String(editingItem.price)
          : "",
      );
    }
  }, [open, editingItem, selectedCategoryId, categories, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? "Edit Menu Item" : "Add Menu Item"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter item name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (€)</FormLabel>
                  <FormControl>
                    <Input 
                      value={priceInput}
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                      onChange={(event) => {
                        const raw = event.target.value;
                        setPriceInput(raw);
                        if (raw === "") {
                          field.onChange(0);
                          return;
                        }
                        const parsed = Number(raw);
                        if (!Number.isNaN(parsed)) {
                          field.onChange(parsed);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Enter item description"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Enter additional details, ingredients, allergens, etc."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image Upload */}
            <div className="space-y-4">
              <Label>Product Image</Label>
              
              {/* Image Upload Methods */}
              <div className="grid grid-cols-1 gap-4">
                {/* File Upload */}
                <div>
                  <Label htmlFor="file-upload" className="text-sm text-slate-600">Upload from device</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      className="file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Browse
                    </Button>
                  </div>
                </div>

                {/* URL Input */}
                <div>
                  <Label htmlFor="image-url" className="text-sm text-slate-600">Or paste image URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="image-url"
                      type="url"
                      value={imageUrl}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1"
                    />
                    {imagePreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={removeImage}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Image Preview */}
              {imagePreview && (
                <div className="space-y-2">
                  <Label className="text-sm text-slate-600">Preview</Label>
                  <div className="relative w-full h-32 bg-slate-100 rounded-lg overflow-hidden border">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="w-full h-full object-contain"
                      onError={() => {
                        setImagePreview(null);
                        toast({
                          title: "Invalid image",
                          description: "The image URL is not valid or accessible.",
                          variant: "destructive",
                        });
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(parseInt(value))} 
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <Label className="text-sm font-medium">Multi-select limits (extras)</Label>
              <p className="text-xs text-slate-600">
                Caps how many flavours / add-ons guests can pick (same as in Modifiers).{" "}
                <strong>0</strong> = no limit. Flavours use extras with sort order below 500; add-ons use 500+.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="maxFlavourSelections"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Max flavours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={field.value ?? 0}
                          onChange={(e) =>
                            field.onChange(Math.max(0, Math.min(50, Number(e.target.value) || 0)))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxAddonSelections"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-normal">Max add-ons</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={50}
                          value={field.value ?? 0}
                          onChange={(e) =>
                            field.onChange(Math.max(0, Math.min(50, Number(e.target.value) || 0)))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <Label className="text-sm font-medium">Item labels on menu card</Label>
              <FormField
                control={form.control}
                name="isSpecialOffer"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-y-0">
                    <FormLabel className="text-sm font-normal">Mark as Special Offer</FormLabel>
                    <FormControl>
                      <Checkbox
                        checked={field.value === 1}
                        onCheckedChange={(checked) => field.onChange(checked === true ? 1 : 0)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialOfferDiscountPercent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-normal">Special offer discount (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={field.value ?? 0}
                        onChange={(event) => {
                          const raw = Number(event.target.value);
                          const safe = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 0;
                          field.onChange(safe);
                        }}
                        disabled={form.watch("isSpecialOffer") !== 1}
                        placeholder="0"
                      />
                    </FormControl>
                    <p className="text-xs text-slate-500">
                      Shows as a separate badge next to "Special Offer" on the menu card.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isTopSelling"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-y-0">
                    <FormLabel className="text-sm font-normal">Mark as Top Selling</FormLabel>
                    <FormControl>
                      <Checkbox
                        checked={field.value === 1}
                        onCheckedChange={(checked) => field.onChange(checked === true ? 1 : 0)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createProductMutation.isPending || updateProductMutation.isPending}
              >
                {editingItem ? "Update" : "Add"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
