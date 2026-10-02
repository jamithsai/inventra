import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Boxes,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ArrowUpRight,
  Plus,
  RefreshCw,
  PieChart as PieIcon,
  BarChart3,
  Activity,
  Sparkles,
  Layers,
  ChevronRight,
  Building2,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type {
  Tenant,
  User,
  InventoryItem,
  DashboardStats,
  InventoryTransaction,
  DashboardAnalytics,
} from '../types';
import { analyticsApi } from '../services/api';

interface DashboardViewProps {
  stats: DashboardStats | null;
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  currentTenant: Tenant | null;
  currentUser?: User | null;
  onNavigateToInventory: (filter?: { category?: string; status?: string }) => void;
  onOpenAddModal: () => void;
  onOpenEditModal?: (item: InventoryItem) => void;
}

const HEALTH_COLORS = {
  inStock: '#12B76A',
  lowStock: '#F79009',
  outOfStock: '#F04438',
};

const CATEGORY_COLORS = [
  '#3157D5',
  '#6172F3',
  '#0BA5EC',
  '#12B76A',
  '#7A5AF8',
  '#F79009',
  '#EE46BC',
  '#667085',
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  items,
  transactions,
  currentTenant,
  currentUser,
  onNavigateToInventory,
  onOpenAddModal,
  onOpenEditModal,
}) => {
  const [timeRangeDays, setTimeRangeDays] = useState<number>(30);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const loadAnalytics = useCallback(async (days: number) => {
    if (!currentTenant?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getDashboard(days);
      setAnalytics(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error('Failed to load dashboard analytics:', err);
      setError(err.response?.data?.message || err.message || 'Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    loadAnalytics(timeRangeDays);
  }, [loadAnalytics, timeRangeDays, items.length, transactions.length]);

  const summary = analytics?.summary || {
    totalProducts: items.length,
    totalStockUnits: items.reduce((acc, i) => acc + i.quantity, 0),
    inStockItems: items.filter((i) => i.quantity > i.lowStockThreshold).length,
    lowStockItems: items.filter((i) => i.quantity > 0 && i.quantity <= i.lowStockThreshold).length,
    outOfStockItems: items.filter((i) => i.quantity === 0).length,
    totalInventoryValue: items.reduce((acc, i) => acc + i.quantity * i.price, 0),
    categoriesCount: new Set(items.map((i) => i.category)).size,
    averageItemPrice: 0,
    averageStockPerProduct: 0,
  };

  const stockHealthData = [
    {
      name: 'In Stock',
      value: analytics?.stockHealth.inStockCount ?? summary.inStockItems,
      percentage: analytics?.stockHealth.inStockPercentage ?? 0,
      color: HEALTH_COLORS.inStock,
      statusCode: 'IN_STOCK',
    },
    {
      name: 'Low Stock',
      value: analytics?.stockHealth.lowStockCount ?? summary.lowStockItems,
      percentage: analytics?.stockHealth.lowStockPercentage ?? 0,
      color: HEALTH_COLORS.lowStock,
      statusCode: 'LOW_STOCK',
    },
    {
      name: 'Out of Stock',
      value: analytics?.stockHealth.outOfStockCount ?? summary.outOfStockItems,
      percentage: analytics?.stockHealth.outOfStockPercentage ?? 0,
      color: HEALTH_COLORS.outOfStock,
      statusCode: 'OUT_OF_STOCK',
    },
  ].filter((item) => item.value > 0 || (analytics?.summary.totalProducts ?? 0) === 0);

  // Custom Chart Tooltips
  const MovementTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const added = payload.find((p: any) => p.dataKey === 'stockAdded')?.value || 0;
      const removed = payload.find((p: any) => p.dataKey === 'stockRemoved')?.value || 0;
      const net = payload.find((p: any) => p.dataKey === 'netChange')?.value || 0;

      return (
        <div className="bg-[#172033] text-white p-3 rounded-[8px] shadow-lg border border-[#2B354C] text-xs space-y-1 font-sans">
          <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1 flex items-center justify-between gap-3">
            <span>{label}</span>
            <span className="text-[10px] font-mono text-slate-400">Time-series</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1">
            <span className="text-[#12B76A] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#12B76A]" /> Stock Inbound:
            </span>
            <span className="font-mono font-bold">+{added}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#F04438] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#F04438]" /> Stock Outbound:
            </span>
            <span className="font-mono font-bold">-{removed}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-700 pt-1">
            <span className="text-slate-300">Net Movement:</span>
            <span className={`font-mono font-bold ${net >= 0 ? 'text-[#12B76A]' : 'text-[#F04438]'}`}>
              {net > 0 ? `+${net}` : net}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#172033] text-white p-3 rounded-[8px] shadow-lg border border-[#2B354C] text-xs space-y-1 font-sans">
          <div className="font-semibold text-slate-200 border-b border-slate-700 pb-1">
            {data.category}
          </div>
          <div className="flex items-center justify-between gap-4 pt-1">
            <span className="text-slate-400">Total Valuation:</span>
            <span className="font-mono font-bold text-[#6172F3]">
              {formatCurrency(data.totalValue)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Product Count:</span>
            <span className="font-mono">{data.productCount} SKUs</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Units in Stock:</span>
            <span className="font-mono">{data.totalQuantity} units</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-slate-700 pt-1 text-[11px]">
            <span className="text-slate-400">Portfolio Share:</span>
            <span className="font-mono font-bold text-[#12B76A]">{data.valuePercentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const HealthTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#172033] text-white p-2.5 rounded-[8px] shadow-lg border border-[#2B354C] text-xs space-y-1 font-sans">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.name}</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-0.5">
            <span className="text-slate-400">Items:</span>
            <span className="font-mono font-bold">{data.value} SKUs</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Share:</span>
            <span className="font-mono text-[#6172F3] font-bold">{data.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* 1. Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E1D8]">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-[#12B76A]" />
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">
              Executive Overview
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[#E9EEFF] text-[#3157D5] border border-[#C7D7FE] font-medium">
              {currentTenant?.name || currentTenant?.id}
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-1 flex items-center gap-2">
            <span>Tenant telemetry & portfolio analytics for active workspace.</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#98A2B3]">
              <Clock className="w-3 h-3" />
              Refreshed {lastRefreshed.toLocaleTimeString()}
            </span>
          </p>
        </div>

        {/* Header Controls: Time Range Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Pills */}
          <div className="flex items-center bg-white border border-[#E5E1D8] rounded-[7px] p-0.5 shadow-2xs">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setTimeRangeDays(days)}
                className={`px-2.5 py-1 text-xs rounded-[5px] font-medium transition cursor-pointer ${
                  timeRangeDays === days
                    ? 'bg-[#3157D5] text-white shadow-xs font-semibold'
                    : 'text-[#667085] hover:text-[#172033] hover:bg-[#FBFAF7]'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadAnalytics(timeRangeDays)}
            disabled={loading}
            title="Refresh Analytics"
            className="p-2 rounded-[7px] bg-white text-[#667085] hover:text-[#172033] hover:bg-[#FBFAF7] border border-[#E5E1D8] transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3157D5]' : ''}`} />
          </button>

          {/* Quick Actions */}
          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-1.5 rounded-[7px] bg-[#3157D5] hover:bg-[#2648BE] text-white font-medium text-xs transition flex items-center space-x-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
          <button
            onClick={() => onNavigateToInventory()}
            className="px-3.5 py-1.5 rounded-[7px] bg-white hover:bg-[#FBFAF7] text-[#172033] border border-[#E5E1D8] font-medium text-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Catalog</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#667085]" />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-[9px] bg-[#FDECEC] border border-[#FDA29B] text-[#B42318] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadAnalytics(timeRangeDays)}
            className="px-3 py-1 bg-white border border-[#FDA29B] rounded-[6px] font-semibold text-[#B42318] hover:bg-[#FEF3F2] transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Enhanced Executive KPI Cards (5 Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Valuation */}
        <div className="rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Total Valuation</span>
            <DollarSign className="w-4 h-4 text-[#3157D5]" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tracking-tight">
            {formatCurrency(summary.totalInventoryValue)}
          </div>
          <div className="mt-1 text-[11px] text-[#667085] flex items-center gap-1">
            <span>Avg. {formatCurrency(summary.averageItemPrice)}/unit</span>
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-[#E9EEFF]/50 to-transparent rounded-bl-full pointer-events-none" />
        </div>

        {/* Total Products (SKUs) */}
        <div className="rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Total SKUs</span>
            <Package className="w-4 h-4 text-[#6172F3]" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tracking-tight">
            {summary.totalProducts}
          </div>
          <div className="mt-1 text-[11px] text-[#667085]">
            Across {summary.categoriesCount} active categories
          </div>
        </div>

        {/* Stock Units */}
        <div className="rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Total Stock Units</span>
            <Boxes className="w-4 h-4 text-[#0BA5EC]" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-2 font-mono tracking-tight">
            {summary.totalStockUnits.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-[#667085]">
            Avg. {summary.averageStockPerProduct} units / SKU
          </div>
        </div>

        {/* In-Stock Health */}
        <div 
          onClick={() => onNavigateToInventory({ status: 'IN_STOCK' })}
          className="rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs hover:border-[#A6F4C5] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold group-hover:text-[#027A48]">
              Healthy Stock
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#12B76A]" />
          </div>
          <div className="text-2xl font-bold text-[#027A48] mt-2 font-mono tracking-tight flex items-center justify-between">
            <span>{summary.inStockItems}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EBFDF3] text-[#027A48] border border-[#A6F4C5]">
              {analytics?.stockHealth.inStockPercentage ?? 0}%
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#667085] flex items-center justify-between">
            <span>Normal levels</span>
            <span className="text-[10px] text-[#027A48] group-hover:underline">Filter →</span>
          </div>
        </div>

        {/* Attention Alerts (Low / Out of Stock) */}
        <div 
          onClick={() => onNavigateToInventory({ status: summary.outOfStockItems > 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK' })}
          className="rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs col-span-2 lg:col-span-1 hover:border-[#FEDF89] transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold group-hover:text-[#B54708]">
              Attention Watchlist
            </span>
            <AlertTriangle className="w-4 h-4 text-[#F79009]" />
          </div>
          <div className="text-2xl font-bold text-[#B54708] mt-2 font-mono tracking-tight flex items-center gap-2">
            <span>{summary.lowStockItems + summary.outOfStockItems}</span>
            {summary.outOfStockItems > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FDECEC] text-[#D64545] border border-[#FDA29B] font-bold">
                {summary.outOfStockItems} Out
              </span>
            )}
            {summary.lowStockItems > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FFF9EB] text-[#B54708] border border-[#FEDF89] font-medium">
                {summary.lowStockItems} Low
              </span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-[#667085] flex items-center justify-between">
            <span>Needs replenishment</span>
            <span className="text-[10px] text-[#B54708] group-hover:underline">Inspect →</span>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Row 1 of Visual Charts (Movement Trend + Stock Health Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart 1: Stock Movement Trend (2 Columns) */}
        <div className="lg:col-span-2 rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#EEEAE3] pb-3 mb-3">
            <div>
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#3157D5]" />
                <h2 className="text-xs font-semibold text-[#172033] uppercase font-mono tracking-wider">
                  Stock Movement Trend
                </h2>
              </div>
              <p className="text-[11px] text-[#667085] mt-0.5">
                Inbound stock replenishment vs outbound movements over last {timeRangeDays} days.
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FBFAF7] text-[#667085] border border-[#E5E1D8]">
              {timeRangeDays}D Interval
            </span>
          </div>

          <div className="h-[250px] w-full">
            {analytics?.stockMovement && analytics.stockMovement.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={analytics.stockMovement}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#12B76A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#12B76A" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorRemoved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F04438" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F04438" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2EFE9" vertical={false} />
                  <XAxis
                    dataKey="formattedDate"
                    stroke="#98A2B3"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E1D8' }}
                  />
                  <YAxis
                    stroke="#98A2B3"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<MovementTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="stockAdded"
                    name="Stock Added (IN)"
                    stroke="#12B76A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAdded)"
                  />
                  <Area
                    type="monotone"
                    dataKey="stockRemoved"
                    name="Stock Removed (OUT)"
                    stroke="#F04438"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRemoved)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#98A2B3]">
                No stock movement recorded in this period.
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Stock Health Donut (1 Column) */}
        <div className="lg:col-span-1 rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#EEEAE3] pb-3 mb-2">
            <div className="flex items-center space-x-2">
              <PieIcon className="w-4 h-4 text-[#3157D5]" />
              <h2 className="text-xs font-semibold text-[#172033] uppercase font-mono tracking-wider">
                Stock Health
              </h2>
            </div>
            <span className="text-[10px] font-mono text-[#667085]">{summary.totalProducts} Total</span>
          </div>

          <div className="h-[180px] w-full relative flex items-center justify-center">
            {summary.totalProducts > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<HealthTooltip />} />
                    <Pie
                      data={stockHealthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                      cursor="pointer"
                      onClick={(entry: any) => {
                        const status = entry?.statusCode || entry?.payload?.statusCode;
                        if (status) {
                          onNavigateToInventory({ status });
                        }
                      }}
                    >
                      {stockHealthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Donut Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-[#172033] font-mono leading-none">
                    {summary.totalProducts}
                  </span>
                  <span className="text-[9px] font-mono text-[#98A2B3] uppercase tracking-wider mt-0.5">
                    Products
                  </span>
                </div>
              </>
            ) : (
              <div className="text-xs text-[#98A2B3]">No inventory items available</div>
            )}
          </div>

          {/* Interactive Legend List */}
          <div className="space-y-1.5 pt-2 border-t border-[#EEEAE3]">
            {stockHealthData.map((item) => (
              <button
                key={item.name}
                onClick={() => onNavigateToInventory({ status: item.statusCode })}
                className="w-full flex items-center justify-between text-xs p-1.5 rounded-[6px] hover:bg-[#FBFAF7] transition cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-[#172033]">{item.name}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono text-[11px]">
                  <span className="text-[#667085]">{item.value}</span>
                  <span className="text-[#98A2B3]">({item.percentage}%)</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Middle Section: Row 2 of Visual Charts (Category Value + Top Items Leaderboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 3: Inventory Value by Category */}
        <div className="rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#EEEAE3] pb-3 mb-3">
            <div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-[#3157D5]" />
                <h2 className="text-xs font-semibold text-[#172033] uppercase font-mono tracking-wider">
                  Inventory Value by Category
                </h2>
              </div>
              <p className="text-[11px] text-[#667085] mt-0.5">
                Capital allocation across active product categories. Click bar to filter.
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#3157D5] font-semibold">
              {formatCurrency(summary.totalInventoryValue)}
            </span>
          </div>

          <div className="h-[250px] w-full">
            {analytics?.categoryValue && analytics.categoryValue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.categoryValue}
                  margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2EFE9" vertical={false} />
                  <XAxis
                    dataKey="category"
                    stroke="#98A2B3"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E1D8' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#98A2B3"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CategoryTooltip />} />
                  <Bar
                    dataKey="totalValue"
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                    onClick={(data: any) => {
                      if (data?.category) {
                        onNavigateToInventory({ category: data.category });
                      }
                    }}
                  >
                    {analytics.categoryValue.map((_, index) => (
                      <Cell
                        key={`bar-cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#98A2B3]">
                No category data available.
              </div>
            )}
          </div>
        </div>

        {/* Chart 4: Top Inventory Items by Valuation Leaderboard */}
        <div className="rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#EEEAE3] pb-3 mb-3">
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#F79009]" />
                <h2 className="text-xs font-semibold text-[#172033] uppercase font-mono tracking-wider">
                  Top Valued Inventory Items
                </h2>
              </div>
              <p className="text-[11px] text-[#667085] mt-0.5">
                Highest capital concentration items in active warehouse.
              </p>
            </div>
            <button
              onClick={() => onNavigateToInventory()}
              className="text-xs text-[#3157D5] hover:text-[#2648BE] font-medium transition flex items-center gap-0.5"
            >
              <span>Catalog</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[250px] pr-1">
            {analytics?.topItems && analytics.topItems.length > 0 ? (
              analytics.topItems.slice(0, 5).map((item, idx) => {
                const maxVal = analytics.topItems[0].totalValue || 1;
                const ratio = Math.min(100, Math.round((item.totalValue / maxVal) * 100));

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      const fullItem = items.find((i) => i.id === item.id);
                      if (fullItem && onOpenEditModal) {
                        onOpenEditModal(fullItem);
                      } else {
                        onNavigateToInventory({ category: item.category });
                      }
                    }}
                    className="p-2 rounded-[7px] bg-[#FBFAF7] hover:bg-[#F2EFE9] border border-[#E5E1D8] transition cursor-pointer space-y-1 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-4 h-4 rounded-full bg-white text-[#3157D5] font-mono text-[9px] font-bold flex items-center justify-center border border-[#E5E1D8]">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-[#172033] truncate group-hover:text-[#3157D5]">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#98A2B3] hidden sm:inline">
                          {item.sku}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-[#172033] shrink-0">
                        {formatCurrency(item.totalValue)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#667085]">
                      <span>{item.category} • {item.quantity} units @ {formatCurrency(item.price)}/ea</span>
                      <span className="font-mono text-[#98A2B3]">{ratio}% of top</span>
                    </div>

                    <div className="w-full h-1 rounded-full bg-[#E5E1D8] overflow-hidden">
                      <div
                        className="h-full bg-[#3157D5] rounded-full"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-[#98A2B3]">
                No inventory items found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Executive Portfolio Insights & Concentration */}
      {analytics?.concentration && (
        <div className="rounded-[9px] bg-gradient-to-r from-[#F8F9FE] via-white to-[#F8F9FE] border border-[#DCE4FD] p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E9EEFF] pb-2.5 mb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#3157D5]" />
              <h2 className="text-xs font-semibold text-[#172033] uppercase font-mono tracking-wider">
                Executive Portfolio Insights
              </h2>
            </div>
            <span className="text-[10px] font-mono text-[#3157D5] bg-[#E9EEFF] px-2 py-0.5 rounded font-semibold">
              Tenant-Scoped
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white rounded-[7px] border border-[#E9EEFF] shadow-2xs space-y-1">
              <span className="text-[11px] text-[#667085]">Leading Category Concentration</span>
              <div className="text-base font-bold text-[#172033] font-mono">
                {analytics.concentration.topCategoryName}:{' '}
                <span className="text-[#3157D5]">{analytics.concentration.topCategoryPercentage}%</span>
              </div>
              <p className="text-[10px] text-[#98A2B3]">
                Capital weighted toward highest valuation category.
              </p>
            </div>

            <div className="p-3 bg-white rounded-[7px] border border-[#E9EEFF] shadow-2xs space-y-1">
              <span className="text-[11px] text-[#667085]">Top 3 Categories Dominance</span>
              <div className="text-base font-bold text-[#172033] font-mono">
                <span className="text-[#12B76A]">{analytics.concentration.top3CategoriesPercentage}%</span>{' '}
                of Total Asset Value
              </div>
              <p className="text-[10px] text-[#98A2B3]">
                Combined valuation of top 3 inventory verticals.
              </p>
            </div>

            <div className="p-3 bg-white rounded-[7px] border border-[#E9EEFF] shadow-2xs space-y-1">
              <span className="text-[11px] text-[#667085]">Highest Single Asset Concentration</span>
              <div className="text-base font-bold text-[#172033] font-mono truncate">
                {analytics.concentration.topValuedItemName}:{' '}
                <span className="text-[#F79009]">{analytics.concentration.topValuedItemPercentage}%</span>
              </div>
              <p className="text-[10px] text-[#98A2B3]">
                Single SKU exposure relative to entire catalog.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. Recent Real-Time Stock Movements Feed */}
      <div className="rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-[#EEEAE3] pb-2.5">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-[#3157D5]" />
            <h2 className="text-xs font-semibold text-[#172033] uppercase font-mono tracking-wider">
              Recent Live Stock Activity
            </h2>
          </div>
          <span className="text-[11px] text-[#98A2B3] font-mono">workspace: {currentTenant?.id}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {transactions.slice(0, 4).map((tx) => (
            <div key={tx.id} className="p-3 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded ${
                  tx.type === 'IN' 
                    ? 'bg-[#EBFDF3] text-[#027A48] border border-[#A6F4C5]' 
                    : tx.type === 'OUT' 
                    ? 'bg-[#FDECEC] text-[#D64545] border border-[#FDA29B]'
                    : 'bg-[#FFF9EB] text-[#B54708] border border-[#FEDF89]'
                }`}>
                  {tx.type} ({tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity})
                </span>
                <span className="text-[10px] text-[#98A2B3] font-mono">
                  {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="font-semibold text-[#172033] truncate">{tx.productName || 'Item'}</div>
              <div className="text-[11px] text-[#667085] truncate">{tx.note || 'Stock movement'}</div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="col-span-4 text-center py-6 text-xs text-[#98A2B3]">
              No stock movements recorded for this organization yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
