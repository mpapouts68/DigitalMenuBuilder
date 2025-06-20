import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Upload, Download } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdminControlsProps {
  onAddCategory: () => void;
  onImportData: () => void;
}

export function AdminControls({ onAddCategory, onImportData }: AdminControlsProps) {
  const { toast } = useToast();
  const [showBulkImageUpload, setShowBulkImageUpload] = useState(false);

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
    <div className="max-w-md mx-auto px-4 mb-4">
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-amber-800 text-base">Admin Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={onAddCategory}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
          <Button
            onClick={() => setShowBulkImageUpload(true)}
            variant="outline"
            className="w-full"
          >
            <Images className="h-4 w-4 mr-2" />
            Bulk Image Upload
          </Button>
          <Button
            onClick={onImportData}
            variant="outline"
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV Data
          </Button>
          <Button
            onClick={() => exportDataMutation.mutate()}
            variant="outline"
            className="w-full"
            disabled={exportDataMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </CardContent>
      </Card>

      <BulkImageUploadModal
        open={showBulkImageUpload}
        onOpenChange={setShowBulkImageUpload}
      />
    </div>
  );
}
