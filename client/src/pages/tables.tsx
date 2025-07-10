import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  LogOut, 
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { TableWithOrder } from '@shared/schema';
import logoPath from '@assets/logoB_1752121880525.ico';

export function TablesPage() {
  const { staff, logout, cacheData } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  };

  const handleTableClick = (table: TableWithOrder) => {
    if (!table.active) {
      toast({
        title: "Table unavailable",
        description: "This table is currently inactive",
        variant: "destructive",
      });
      return;
    }
    
    setLocation(`/order/${table.postId}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh - in real app this would refetch data
    setTimeout(() => {
      setRefreshing(false);
      toast({
        title: "Refreshed",
        description: "Table status updated",
      });
    }, 1000);
  };

  const getTableStatus = (table: TableWithOrder) => {
    if (!table.active) return 'inactive';
    if (table.currentOrder) return 'occupied';
    if (table.reserve) return 'reserved';
    return 'free';
  };

  const getTableColor = (status: string) => {
    switch (status) {
      case 'free': return 'bg-green-900/20 hover:bg-green-900/30 border-green-600 dark:bg-green-800/30 dark:hover:bg-green-800/40 dark:border-green-500';
      case 'occupied': return 'bg-red-900/20 hover:bg-red-900/30 border-red-600 dark:bg-red-800/30 dark:hover:bg-red-800/40 dark:border-red-500';
      case 'reserved': return 'bg-yellow-900/20 hover:bg-yellow-900/30 border-yellow-600 dark:bg-yellow-800/30 dark:hover:bg-yellow-800/40 dark:border-yellow-500';
      case 'inactive': return 'bg-gray-900/20 hover:bg-gray-900/30 border-gray-600 dark:bg-gray-800/30 dark:hover:bg-gray-800/40 dark:border-gray-500';
      default: return 'bg-gray-900/20 hover:bg-gray-900/30 border-gray-600 dark:bg-gray-800/30 dark:hover:bg-gray-800/40 dark:border-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'free': return <CheckCircle className="w-5 h-5 text-green-400 dark:text-green-300" />;
      case 'occupied': return <XCircle className="w-5 h-5 text-red-400 dark:text-red-300" />;
      case 'reserved': return <Clock className="w-5 h-5 text-yellow-400 dark:text-yellow-300" />;
      case 'inactive': return <XCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />;
      default: return <XCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'free': return <Badge variant="secondary" className="bg-green-800/20 text-green-300 dark:bg-green-700/30 dark:text-green-200">Free</Badge>;
      case 'occupied': return <Badge variant="destructive" className="bg-red-800/20 text-red-300 dark:bg-red-700/30 dark:text-red-200">Occupied</Badge>;
      case 'reserved': return <Badge variant="outline" className="border-yellow-500 text-yellow-300 dark:border-yellow-400 dark:text-yellow-200">Reserved</Badge>;
      case 'inactive': return <Badge variant="outline" className="text-gray-400 dark:text-gray-500">Inactive</Badge>;
      default: return <Badge variant="outline" className="text-gray-400 dark:text-gray-500">Unknown</Badge>;
    }
  };

  const tables = cacheData?.tables || [];
  const activeTableCount = tables.filter(t => t.active).length;
  const occupiedTableCount = tables.filter(t => t.currentOrder).length;
  const freeTableCount = tables.filter(t => t.active && !t.currentOrder && !t.reserve).length;

  return (
    <div className="min-h-screen bg-gray-900 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gray-800 dark:bg-gray-900 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img src={logoPath} alt="Logo" className="w-8 h-8" />
              <div>
                <p className="text-sm text-gray-300 dark:text-gray-400">Welcome, {staff?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid - 5 columns equally distributed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-5 gap-4">
          {tables.map((table) => {
            const status = getTableStatus(table);
            return (
              <Card 
                key={table.postId}
                className={`cursor-pointer transition-all duration-200 border-2 ${getTableColor(status)} bg-gray-800 dark:bg-gray-850 ${
                  status === 'inactive' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => handleTableClick(table)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-100 dark:text-gray-200">
                      {table.description || `Table ${table.postNumber || table.postId}`}
                    </h3>
                    {getStatusIcon(status)}
                  </div>
                  
                  <div className="space-y-2">
                    {getStatusBadge(status)}
                    
                    {table.currentOrder && (
                      <div className="text-xs text-gray-300 dark:text-gray-400">
                        <p>Order: #{table.currentOrder.orderId}</p>
                        <p>Total: €{table.currentOrder.orderTotal}</p>
                      </div>
                    )}
                    
                    {table.reserve && table.nameReserve && (
                      <div className="text-xs text-yellow-300 dark:text-yellow-200">
                        Reserved: {table.nameReserve}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {tables.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-100 dark:text-gray-200 mb-2">No tables available</h3>
            <p className="text-gray-300 dark:text-gray-400">Tables will appear here once they are configured in the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}