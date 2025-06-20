import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [categoriesCSV, setCategoriesCSV] = useState("");
  const [productsCSV, setProductsCSV] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const importDataMutation = useMutation({
    mutationFn: async ({ categories, products }: { categories: any[], products: any[] }) => {
      await apiRequest("POST", "/api/import", { categories, products });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Data imported",
        description: "Menu data has been imported successfully.",
      });
      onOpenChange(false);
      setCategoriesCSV("");
      setProductsCSV("");
    },
    onError: () => {
      toast({
        title: "Import failed",
        description: "Failed to import data. Please check the CSV format.",
        variant: "destructive",
      });
    },
  });

  const parseCSV = (csv: string) => {
    const lines = csv.trim().split('\n');
    if (lines.length <= 1) return [];
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      return obj;
    });
  };

  const handleImport = () => {
    try {
      let categories: any[] = [];
      let products: any[] = [];

      if (categoriesCSV.trim()) {
        const parsedCategories = parseCSV(categoriesCSV);
        categories = parsedCategories.map(cat => ({
          name: cat.group_name || cat.name,
          order: parseInt(cat.group_order || cat.order) || 1,
        }));
      }

      if (productsCSV.trim()) {
        const parsedProducts = parseCSV(productsCSV);
        products = parsedProducts.map(prod => ({
          name: prod.product_name || prod.name,
          price: prod.price,
          description: prod.description,
          categoryId: parseInt(prod.group_id || prod.categoryId) || 1,
        }));
      }

      importDataMutation.mutate({ categories, products });
    } catch (error) {
      toast({
        title: "Parse error",
        description: "Failed to parse CSV data. Please check the format.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import CSV Data</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="categoriesCSV" className="text-sm font-medium">
              Categories CSV
            </Label>
            <Textarea
              id="categoriesCSV"
              value={categoriesCSV}
              onChange={(e) => setCategoriesCSV(e.target.value)}
              placeholder="group_id,group_name,group_order&#10;1,Appetizers,1&#10;2,Main Courses,2&#10;3,Desserts,3"
              rows={6}
              className="mt-2 font-mono text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="productsCSV" className="text-sm font-medium">
              Products CSV
            </Label>
            <Textarea
              id="productsCSV"
              value={productsCSV}
              onChange={(e) => setProductsCSV(e.target.value)}
              placeholder="product_id,product_name,price,description,group_id&#10;1,Bruschetta,8.99,Toasted bread with tomatoes,1&#10;2,Pasta Carbonara,16.99,Creamy pasta with bacon,2"
              rows={8}
              className="mt-2 font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1"
            onClick={handleImport}
            disabled={importDataMutation.isPending}
          >
            Import
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
