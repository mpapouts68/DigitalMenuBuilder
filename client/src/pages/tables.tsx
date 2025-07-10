import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  LogOut, 
  BarChart3, 
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { TableWithOrder } from '@shared/schema';

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
      case 'free': return 'bg-green-100 hover:bg-green-200 border-green-300';
      case 'occupied': return 'bg-red-100 hover:bg-red-200 border-red-300';
      case 'reserved': return 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300';
      case 'inactive': return 'bg-gray-100 hover:bg-gray-200 border-gray-300';
      default: return 'bg-gray-100 hover:bg-gray-200 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'free': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'occupied': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'reserved': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'inactive': return <XCircle className="w-5 h-5 text-gray-600" />;
      default: return <XCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'free': return <Badge variant="secondary" className="bg-green-100 text-green-800">Free</Badge>;
      case 'occupied': return <Badge variant="destructive">Occupied</Badge>;
      case 'reserved': return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Reserved</Badge>;
      case 'inactive': return <Badge variant="outline" className="text-gray-500">Inactive</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const tables = cacheData?.tables || [];
  const activeTableCount = tables.filter(t => t.active).length;
  const occupiedTableCount = tables.filter(t => t.currentOrder).length;
  const freeTableCount = tables.filter(t => t.active && !t.currentOrder && !t.reserve).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Restaurant POS</h1>
                <p className="text-sm text-gray-500">Welcome, {staff?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/stats')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Stats
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tables</p>
                  <p className="text-2xl font-bold text-gray-900">{activeTableCount}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Free Tables</p>
                  <p className="text-2xl font-bold text-green-600">{freeTableCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Occupied</p>
                  <p className="text-2xl font-bold text-red-600">{occupiedTableCount}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reserved</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {tables.filter(t => t.reserve).length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {tables.map((table) => {
            const status = getTableStatus(table);
            return (
              <Card 
                key={table.postId}
                className={`cursor-pointer transition-all duration-200 ${getTableColor(status)} ${
                  status === 'inactive' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => handleTableClick(table)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      Table {table.postNumber || table.postId}
                    </CardTitle>
                    {getStatusIcon(status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {getStatusBadge(status)}
                    {table.description && (
                      <p className="text-sm text-gray-600 truncate">{table.description}</p>
                    )}
                    {table.nameReserve && (
                      <p className="text-sm text-yellow-700 font-medium">
                        Reserved: {table.nameReserve}
                      </p>
                    )}
                    {table.currentOrder && (
                      <p className="text-sm text-red-700 font-medium">
                        Order #{table.currentOrder.orderId}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {tables.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tables available</h3>
            <p className="text-gray-500">Tables will appear here once they are configured in the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}