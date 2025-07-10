import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  LogOut, 
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Timer
} from 'lucide-react';
import { TableWithOrder } from '@shared/schema';
import logoPath from '@assets/logoB_1752121880525.ico';

export function TablesPage() {
  const { staff, logout, cacheData } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

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
  const products = cacheData?.products || [];
  const groups = cacheData?.groups || [];
  
  const activeTableCount = tables.filter(t => t.active).length;
  const occupiedTableCount = tables.filter(t => t.currentOrder).length;
  const freeTableCount = tables.filter(t => t.active && !t.currentOrder && !t.reserve).length;
  const reservedTableCount = tables.filter(t => t.reserve).length;
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 dark:bg-gray-950">
      {/* Enhanced Header */}
      <div className="bg-gray-800 dark:bg-gray-900 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <img src={logoPath} alt="Logo" className="w-10 h-10" />
              <div>
                <h1 className="text-xl font-bold text-gray-100">Restaurant POS</h1>
                <p className="text-sm text-gray-300">Welcome, {staff?.name}</p>
              </div>
            </div>
            
            {/* Center - Time and Date */}
            <div className="hidden md:flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-100">{formatTime(currentTime)}</div>
                <div className="text-xs text-gray-400">{formatDate(currentTime)}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>



      {/* Enhanced Tables Grid - 5 columns equally distributed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Table Management</h2>
          <p className="text-gray-400">Click on any table to start taking orders</p>
        </div>
        
        <div className="grid grid-cols-5 gap-4">
          {tables.map((table) => {
            const status = getTableStatus(table);
            return (
              <Card 
                key={table.postId}
                className={`cursor-pointer transition-all duration-300 border-2 ${getTableColor(status)} bg-gray-800 hover:shadow-lg transform hover:scale-105 ${
                  status === 'inactive' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => status !== 'inactive' ? setLocation(`/order/${table.postId}`) : null}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold text-gray-100 truncate">
                      {table.description || `Table ${table.postNumber || table.postId}`}
                    </CardTitle>
                    {getStatusIcon(status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      {getStatusBadge(status)}
                    </div>
                    
                    {table.currentOrder && (
                      <div className="bg-gray-700 rounded-lg p-3 text-center">
                        <div className="text-xs text-gray-300 space-y-1">
                          <p className="font-semibold">Order #{table.currentOrder.orderId}</p>
                          <p className="text-green-300">Total: €{table.currentOrder.orderTotal}</p>
                          <div className="flex items-center justify-center space-x-1 text-xs">
                            <Timer className="w-3 h-3" />
                            <span>Active</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {table.reserve && table.nameReserve && (
                      <div className="bg-yellow-900/20 rounded-lg p-3 text-center">
                        <div className="text-xs text-yellow-300">
                          <p className="font-semibold">Reserved</p>
                          <p className="truncate">{table.nameReserve}</p>
                        </div>
                      </div>
                    )}
                    
                    {status === 'free' && (
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Ready for new order</p>
                      </div>
                    )}
                    
                    <div className="text-center">
                      <Badge variant="outline" className="text-xs border-gray-500 text-gray-400">
                        Table #{table.postNumber || table.postId}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {tables.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-100 mb-2">No tables configured</h3>
              <p className="text-gray-400 mb-4">Tables will appear here once they are set up in the system.</p>
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Tables
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}