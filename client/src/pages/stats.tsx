import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users,
  Calendar,
  Clock,
  Target
} from 'lucide-react';

interface StatsData {
  totalOrders: number;
  totalSales: number;
  averageOrderValue: number;
  period: {
    from: Date;
    to: Date;
  };
}

export function StatsPage() {
  const [, setLocation] = useLocation();
  const { staff, token } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    loadStats();
  }, [period]);

  const loadStats = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const now = new Date();
      let fromDate: Date;
      
      switch (period) {
        case 'today':
          fromDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          fromDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          fromDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          fromDate = new Date(now.setHours(0, 0, 0, 0));
      }
      
      const response = await fetch(`/api/staff/stats?from=${fromDate.toISOString()}&to=${new Date().toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setLocation('/tables')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tables
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Statistics</h1>
                <p className="text-sm text-gray-500">Performance overview for {staff?.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Period Selection */}
        <div className="mb-6">
          <div className="flex space-x-2">
            <Button
              variant={period === 'today' ? 'default' : 'outline'}
              onClick={() => setPeriod('today')}
            >
              Today
            </Button>
            <Button
              variant={period === 'week' ? 'default' : 'outline'}
              onClick={() => setPeriod('week')}
            >
              This Week
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              onClick={() => setPeriod('month')}
            >
              This Month
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Orders processed
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.totalSales || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    Revenue generated
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Order</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats?.averageOrderValue || 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    Per order value
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Performance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats?.totalOrders && stats.totalOrders > 0 ? 'Active' : 'Idle'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current status
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Period Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Period Details
                </CardTitle>
                <CardDescription>
                  Statistics for the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Period Start</p>
                      <p className="font-medium">
                        {stats?.period?.from ? formatDate(stats.period.from) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Period End</p>
                      <p className="font-medium">
                        {stats?.period?.to ? formatDate(stats.period.to) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Staff Member:</span>
                      <span className="font-medium">{staff?.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-600">Role:</span>
                      <span className="font-medium">{staff?.role || 'Server'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Insights */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.totalOrders === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2" />
                      <p>No orders processed in this period</p>
                      <p className="text-sm">Start taking orders to see performance data</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900">Order Volume</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          You've processed {stats?.totalOrders} orders in this period
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium text-green-900">Sales Performance</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Generated {formatCurrency(stats?.totalSales || 0)} in revenue
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}