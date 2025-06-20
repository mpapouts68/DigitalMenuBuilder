import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [categoriesCSV, setCategoriesCSV] = useState("");
  const [productsCSV, setProductsCSV] = useState("");
  const [importMethod, setImportMethod] = useState<"upload" | "paste">("upload");
  const categoriesFileRef = useRef<HTMLInputElement>(null);
  const productsFileRef = useRef<HTMLInputElement>(null);
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

  const handleFileUpload = (file: File, type: "categories" | "products") => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (type === "categories") {
        setCategoriesCSV(content);
      } else {
        setProductsCSV(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    try {
      let categories: any[] = [];
      let products: any[] = [];

      if (categoriesCSV.trim()) {
        const parsedCategories = parseCSV(categoriesCSV);
        categories = parsedCategories.map((cat, index) => ({
          name: cat.group_name || cat.name || `Category ${index + 1}`,
          order: parseInt(cat.group_order || cat.order) || (index + 1),
        }));
      }

      if (productsCSV.trim()) {
        const parsedProducts = parseCSV(productsCSV);
        products = parsedProducts.map(prod => ({
          name: prod.product_name || prod.name || "Unnamed Item",
          price: prod.price || "0.00",
          description: prod.description || "No description available",
          categoryId: parseInt(prod.group_id || prod.categoryId) || 1,
        }));
      }

      if (categories.length === 0 && products.length === 0) {
        toast({
          title: "No data to import",
          description: "Please provide at least one CSV file with data.",
          variant: "destructive",
        });
        return;
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

  const downloadSampleCSV = () => {
    const categoriesSample = `group_id,group_name,group_order
1,Appetizers,1
2,Main Courses,2
3,Pasta,3
4,Desserts,4
5,Beverages,5`;

    const productsSample = `product_id,product_name,price,description,group_id
1,Bruschetta Classica,8.99,Toasted bread topped with fresh tomatoes,1
2,Antipasto Platter,14.99,Selection of cured meats and cheeses,1
3,Osso Buco,28.99,Braised veal shanks with vegetables,2
4,Chicken Parmigiana,22.99,Breaded chicken with marinara and mozzarella,2
5,Spaghetti Carbonara,16.99,Classic Roman pasta with eggs and pancetta,3`;

    const content = `=== CATEGORIES CSV ===
${categoriesSample}

=== PRODUCTS CSV ===
${productsSample}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_menu_csv_format.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Sample downloaded",
      description: "Check your downloads for the sample CSV format.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Menu Data</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Files
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Paste CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Categories CSV File</CardTitle>
                  <CardDescription>
                    Upload your groups/categories file (group_id, group_name, group_order)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    ref={categoriesFileRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "categories");
                    }}
                    className="cursor-pointer"
                  />
                  {categoriesCSV && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Categories file loaded ({categoriesCSV.split('\n').length - 1} rows)
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Products CSV File</CardTitle>
                  <CardDescription>
                    Upload your products file (product_id, product_name, price, description, group_id)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Input
                    ref={productsFileRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, "products");
                    }}
                    className="cursor-pointer"
                  />
                  {productsCSV && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ Products file loaded ({productsCSV.split('\n').length - 1} rows)
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="paste" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="categoriesCSV" className="text-sm font-medium">
                  Categories CSV Data
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
                  Products CSV Data
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
          </TabsContent>
        </Tabs>

        <div className="flex space-x-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={downloadSampleCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Sample
          </Button>
          <div className="flex-1" />
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={importDataMutation.isPending || (!categoriesCSV.trim() && !productsCSV.trim())}
          >
            {importDataMutation.isPending ? "Importing..." : "Import Data"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
