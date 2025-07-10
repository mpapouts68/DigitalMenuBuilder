import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  TrendingUp, 
  Users, 
  CreditCard,
  Banknote,
  Gift,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Euro,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

export function StatsPage() {
  const { staff } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // Dummy statistics data
  const stats = {
    today: {
      totalOrders: 156,
      totalRevenue: 2847.50,
      avgOrderValue: 18.25,
      tablesServed: 89,
      openTables: 8,
      closedTables: 127,
      payments: {
        cash: { count: 52, amount: 945.30 },
        card: { count: 78, amount: 1547.80 },
        voucher: { count: 26, amount: 354.40 }
      },
      hourlyData: [
        { hour: '09:00', orders: 12, revenue: 185.50 },
        { hour: '10:00', orders: 18, revenue: 267.80 },
        { hour: '11:00', orders: 23, revenue: 421.20 },
        { hour: '12:00', orders: 31, revenue: 568.90 },
        { hour: '13:00', orders: 28, revenue: 512.40 },
        { hour: '14:00', orders: 22, revenue: 398.70 },
        { hour: '15:00', orders: 15, revenue: 289.30 },
        { hour: '16:00', orders: 7, revenue: 203.70 }
      ]
    },
    week: {
      totalOrders: 1247,
      totalRevenue: 23856.80,
      avgOrderValue: 19.12,
      tablesServed: 678,
      openTables: 8,
      closedTables: 1239,
      payments: {
        cash: { count: 412, amount: 7854.20 },
        card: { count: 623, amount: 12678.40 },
        voucher: { count: 212, amount: 3324.20 }
      }
    },
    month: {
      totalOrders: 5234,
      totalRevenue: 98547.60,
      avgOrderValue: 18.83,
      tablesServed: 2847,
      openTables: 8,
      closedTables: 5226,
      payments: {
        cash: { count: 1745, amount: 32167.80 },
        card: { count: 2567, amount: 51234.90 },
        voucher: { count: 922, amount: 15144.90 }
      }
    }
  };

  const currentStats = stats[selectedPeriod as keyof typeof stats];

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  const getPaymentPercentage = (amount: number) => {
    return ((amount / currentStats.totalRevenue) * 100).toFixed(1);
  };

  const getPeriodLabel = () => {
    switch(selectedPeriod) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'Today';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-gray-800 dark:bg-gray-900 shadow-sm border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/tables')}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tables
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-100">Restaurant Statistics</h1>
                <p className="text-sm text-gray-300">Staff: {staff?.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <select 
                className="bg-gray-700 text-gray-100 border border-gray-600 rounded px-3 py-1 text-sm"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Left Column */}
          <div className="space-y-4">
            {/* Key Metrics - Left */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-gray-100 flex items-center text-sm">
                    <TrendingUp className="w-4 h-4 mr-2 text-green-400" />
                    Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold text-green-300">
                    {formatCurrency(currentStats.totalRevenue)}
                  </div>
                  <p className="text-xs text-gray-400">{getPeriodLabel()}</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-gray-100 flex items-center text-sm">
                    <BarChart3 className="w-4 h-4 mr-2 text-blue-400" />
                    Orders
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold text-blue-300">
                    {currentStats.totalOrders}
                  </div>
                  <p className="text-xs text-gray-400">Avg: {formatCurrency(currentStats.avgOrderValue)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Payment Methods - Left */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-100 flex items-center text-sm">
                  <Euro className="w-4 h-4 mr-2" />
                  Payment Methods
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-100">Card</div>
                      <div className="text-xs text-gray-400">{currentStats.payments.card.count} tx</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-300">{formatCurrency(currentStats.payments.card.amount)}</div>
                    <div className="text-xs text-gray-400">{getPaymentPercentage(currentStats.payments.card.amount)}%</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <div className="flex items-center space-x-2">
                    <Banknote className="w-4 h-4 text-green-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-100">Cash</div>
                      <div className="text-xs text-gray-400">{currentStats.payments.cash.count} tx</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-300">{formatCurrency(currentStats.payments.cash.amount)}</div>
                    <div className="text-xs text-gray-400">{getPaymentPercentage(currentStats.payments.cash.amount)}%</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <div className="flex items-center space-x-2">
                    <Gift className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-100">Vouchers</div>
                      <div className="text-xs text-gray-400">{currentStats.payments.voucher.count} tx</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-purple-300">{formatCurrency(currentStats.payments.voucher.amount)}</div>
                    <div className="text-xs text-gray-400">{getPaymentPercentage(currentStats.payments.voucher.amount)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Key Metrics - Right */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-gray-100 flex items-center text-sm">
                    <Users className="w-4 h-4 mr-2 text-purple-400" />
                    Tables
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl font-bold text-purple-300">
                    {currentStats.tablesServed}
                  </div>
                  <p className="text-xs text-gray-400">Served</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-gray-100 flex items-center text-sm">
                    <Activity className="w-4 h-4 mr-2 text-orange-400" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center space-x-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-300">{currentStats.openTables}</div>
                      <div className="text-xs text-gray-400">Open</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-300">{currentStats.closedTables}</div>
                      <div className="text-xs text-gray-400">Closed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Table Status - Right */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-gray-100 flex items-center text-sm">
                  <PieChart className="w-4 h-4 mr-2" />
                  Table Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-100">Completed</div>
                      <div className="text-xs text-gray-400">Service done</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-300">{currentStats.closedTables}</div>
                    <div className="text-xs text-gray-400">
                      {((currentStats.closedTables / (currentStats.closedTables + currentStats.openTables)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-100">Active</div>
                      <div className="text-xs text-gray-400">Currently serving</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-orange-300">{currentStats.openTables}</div>
                    <div className="text-xs text-gray-400">
                      {((currentStats.openTables / (currentStats.closedTables + currentStats.openTables)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-gray-700 rounded">
                  <div className="text-xs text-gray-400 mb-1">Avg Turnover</div>
                  <div className="text-lg font-bold text-gray-100">
                    {(currentStats.tablesServed / (currentStats.closedTables + currentStats.openTables)).toFixed(1)}x
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Hourly Performance (Today only) */}
        {selectedPeriod === 'today' && (
          <Card className="bg-gray-800 border-gray-700 mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-100 flex items-center text-sm">
                <Calendar className="w-4 h-4 mr-2" />
                Hourly Performance - Today
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {stats.today.hourlyData.map((hour) => (
                  <div key={hour.hour} className="text-center p-2 bg-gray-700 rounded">
                    <div className="text-xs text-gray-400">{hour.hour}</div>
                    <div className="text-sm font-bold text-gray-100">{hour.orders}</div>
                    <div className="text-xs text-green-300">{formatCurrency(hour.revenue)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={() => setLocation('/tables')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Tables
          </Button>
        </div>
      </div>
    </div>
  );
}