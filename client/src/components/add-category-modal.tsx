import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCategorySchema } from "@shared/schema";
import type { Category } from "@shared/schema";

interface AddCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCategories: Category[];
}

export function AddCategoryModal({ open, onOpenChange, existingCategories }: AddCategoryModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      name: "",
      order: existingCategories.length + 1,
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Category added",
        description: "New menu category has been created.",
      });
      onOpenChange(false);
      form.reset({
        name: "",
        order: existingCategories.length + 2, // Update for next category
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create menu category.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createCategoryMutation.mutate(data);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        order: existingCategories.length + 1,
      });
    }
  }, [open, existingCategories.length, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter category name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="number" 
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                disabled={createCategoryMutation.isPending}
              >
                Add
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
