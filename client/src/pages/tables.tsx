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
  Timer,
  BarChart3,
  Settings
} from 'lucide-react';
import { TableWithOrder } from '@shared/schema';
import logoPath from '@assets/logoB_1752121880525.ico';

export function TablesPage() {
  const { staff, logout, cacheData } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [areas, setAreas] = useState<any[]>([]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Load areas
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const response = await fetch('/api/areas');
        if (response.ok) {
          const areasData = await response.json();
          setAreas(areasData);
        }
      } catch (error) {
        console.error('Error loading areas:', error);
        // Fallback areas if API fails
        setAreas([
          { yperMainId: 1, description: 'Main Dining' },
          { yperMainId: 2, description: 'Terrace' },
          { yperMainId: 3, description: 'Bar Area' },
          { yperMainId: 4, description: 'Private Room' },
          { yperMainId: 5, description: 'Garden' }
        ]);
      }
    };
    loadAreas();
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

  const allTables = cacheData?.tables || [];
  
  // Filter tables by selected area
  const tables = selectedArea 
    ? allTables.filter(table => table.yperMainId === parseInt(selectedArea))
    : allTables;
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
          <div>
            {/* First Row - Logo, Time, and Controls */}
            <div className="flex items-center py-1">
              {/* Left - Large Logo spanning to Statistics button */}
              <div className="flex-1 flex items-center">
                <img src={logoPath} alt="Logo" className="h-32 w-auto" />
              </div>
              
              {/* Center - Time */}
              <div className="hidden md:block text-center flex-shrink-0 mx-6">
                <div className="text-2xl font-bold text-gray-100">{formatTime(currentTime)}</div>
                <div className="text-xs text-gray-400">{formatDate(currentTime)}</div>
              </div>
              
              {/* Right - Controls */}
              <div className="flex items-center space-x-3 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/settings')}
                  className="bg-purple-600/20 border-purple-500 text-purple-300 hover:bg-purple-600/30 hover:text-purple-200 transition-all duration-200 px-3"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/stats')}
                  className="bg-blue-600/20 border-blue-500 text-blue-300 hover:bg-blue-600/30 hover:text-blue-200 transition-all duration-200"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Statistics
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="bg-green-600/20 border-green-500 text-green-300 hover:bg-green-600/30 hover:text-green-200 transition-all duration-200 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="bg-red-600/20 border-red-500 text-red-300 hover:bg-red-600/30 hover:text-red-200 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
            
            {/* Second Row - Areas and User */}
            <div className="flex justify-between items-center pb-1 border-t border-gray-700">
              {/* Left - Area Selector */}
              <div className="flex items-center space-x-2">
                <select 
                  className="bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-1 text-sm"
                  onChange={(e) => setSelectedArea(e.target.value)}
                  value={selectedArea}
                >
                  <option value="">All Areas</option>
                  {areas.map((area) => (
                    <option key={area.yperMainId} value={area.yperMainId}>
                      {area.description}
                    </option>
                  ))}
                </select>
                {selectedArea && (
                  <span className="text-xs text-gray-400">
                    {tables.length} tables
                  </span>
                )}
              </div>
              
              {/* Right - User Badge */}
              <div className="flex items-center">
                <Badge variant="outline" className="bg-blue-800/20 text-blue-300 border-blue-600 px-3 py-1">
                  {staff?.name}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Enhanced Tables Grid - 5 columns equally distributed */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        
        <div className="grid grid-cols-6 gap-3">
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
                <CardContent className="p-3">
                  <div className="text-center space-y-2">
                    <div className="flex justify-center">
                      {getStatusIcon(status)}
                    </div>
                    
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-gray-100 truncate block">
                        {table.description || `Table ${table.postNumber || table.postId}`}
                      </span>
                      
                      {selectedArea && (
                        <div className="text-xs text-blue-300">
                          {areas.find(a => a.yperMainId === table.yperMainId)?.description}
                        </div>
                      )}
                      
                      {table.currentOrder && (
                        <div className="text-xs text-green-300">
                          €{table.currentOrder.orderTotal}
                        </div>
                      )}
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
              <h3 className="text-xl font-medium text-gray-100 mb-2">
                {selectedArea ? 'No tables in this area' : 'No tables configured'}
              </h3>
              <p className="text-gray-400 mb-4">
                {selectedArea 
                  ? 'Try selecting a different area or clear the filter to see all tables.' 
                  : 'Tables will appear here once they are set up in the system.'}
              </p>
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