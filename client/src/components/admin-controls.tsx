import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, Download, Images, Settings } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdminControlsProps {
  onAddCategory: () => void;
  onImportData: () => void;
  onBulkImageUpload: () => void;
  onOpenOperations: () => void;
  onDeleteMode: () => void;
  isDeleteMode: boolean;
}

export function AdminControls({
  onAddCategory,
  onImportData,
  onBulkImageUpload,
  onOpenOperations,
  onDeleteMode,
  isDeleteMode,
}: AdminControlsProps) {
  const { toast } = useToast();

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/export");
      return response.json();
    },
    onSuccess: (data) => {
      const { categories, products } = data;
      
      const categoriesCSV = 'group_id,group_name,group_order\n' + 
        categories.map((c: any) => `${c.id},"${c.name}",${c.order}`).join('\n');
      
      const productsCSV = 'product_id,product_name,price,description,group_id\n' + 
        products.map((p: any) => `${p.id},"${p.name}",${p.price},"${p.description}",${p.categoryId}`).join('\n');

      const dataStr = `Categories:\n${categoriesCSV}\n\nProducts:\n${productsCSV}`;
      const dataBlob = new Blob([dataStr], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'menu_data.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Menu data has been downloaded as CSV files.",
      });
    },
    onError: () => {
      toast({
        title: "Export failed",
        description: "Failed to export menu data.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="mb-6">
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-amber-800 text-lg font-bold flex items-center">
            <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
            Admin Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onAddCategory}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
            <Button
              onClick={onBulkImageUpload}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold py-3 rounded-xl"
            >
              <Images className="h-4 w-4 mr-2" />
              Bulk Images
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={onImportData}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold py-3 rounded-xl"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button
              onClick={() => exportDataMutation.mutate()}
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold py-3 rounded-xl"
              disabled={exportDataMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
          <Button
            onClick={onOpenOperations}
            variant="outline"
            className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold py-3 rounded-xl"
          >
            <Settings className="h-4 w-4 mr-2" />
            Operations / Branding
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
