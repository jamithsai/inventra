import React from 'react';
import { 
  Package, 
  Layers, 
  AlertTriangle, 
  XCircle, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck, 
  TrendingUp,
  Activity,
  Box,
  Building2
} from 'lucide-react';
import type { Tenant, InventoryItem, DashboardStats, InventoryTransaction } from '../types';

interface DashboardViewProps {
  stats: DashboardStats | null;
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  currentTenant: Tenant | null;
  onNavigateToInventory: () => void;
  onOpenAddModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  items,
  transactions,
  currentTenant,
  onNavigateToInventory,
  onOpenAddModal,
}) => {
  // Category calculations
  const categoryStats = React.useMemo(() => {
    const map: Record<string, { count: number; totalQty: number; totalValue: number }> = {};
    items.forEach((item) => {
      if (!map[item.category]) {
        map[item.category] = { count: 0, totalQty: 0, totalValue: 0 };
      }
      map[item.category].count += 1;
      map[item.category].totalQty += item.quantity;
      map[item.category].totalValue += item.quantity * item.price;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data }));
  }, [items]);

  const totalStockUnits = stats?.totalStock ?? items.reduce((acc, i) => acc + i.quantity, 0);
  const totalValuation = stats?.totalInventoryValue ?? items.reduce((acc, i) => acc + (i.quantity * i.price), 0);
  const lowStockItems = items.filter(i => i.quantity > 0 && i.quantity <= i.lowStockThreshold);
  const outOfStockItems = items.filter(i => i.quantity === 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Tenant Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 border border-slate-800 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Isolated Tenant Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>{currentTenant?.name || 'Loading Tenant...'}</span>
              <span className="text-xs px-2.5 py-1 rounded-md font-mono bg-slate-800 text-slate-300 border border-slate-700 font-normal">
                ID: {currentTenant?.id}
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              {currentTenant?.description || 'Real-time multi-tenant stock telemetry with hardware-grade query isolation.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-cyan-500/20 flex items-center space-x-2"
            >
              <Box className="w-4 h-4" />
              <span>Add Product</span>
            </button>
            <button
              onClick={onNavigateToInventory}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition border border-slate-700 flex items-center space-x-2"
            >
              <span>View Catalog</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Products */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total SKUs</span>
            <div className="w-8 h-8 rounded-lg bg-blue-950/80 text-blue-400 flex items-center justify-center border border-blue-900/50">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {stats?.totalProducts ?? items.length}
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center space-x-1">
            <span className="text-emerald-400 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> 100%
            </span>
            <span>tenant-scoped</span>
          </div>
        </div>

        {/* Total Stock */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Stock Units</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-950/80 text-indigo-400 flex items-center justify-center border border-indigo-900/50">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {totalStockUnits.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Across {categoryStats.length} active categories
          </div>
        </div>

        {/* Inventory Value */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Inventory Value</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 text-emerald-400 flex items-center justify-center border border-emerald-900/50">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {formatCurrency(totalValuation)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Current aggregate valuation
          </div>
        </div>

        {/* Low Stock */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-sm hover:border-amber-900/50 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Low Stock</span>
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center border border-amber-900/50">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 tracking-tight">
            {stats?.lowStockCount ?? lowStockItems.length}
          </div>
          <div className="mt-1 text-xs text-amber-500/90 font-medium">
            Requires restocking order
          </div>
        </div>

        {/* Out of Stock */}
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-sm hover:border-rose-900/50 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Out of Stock</span>
            <div className="w-8 h-8 rounded-lg bg-rose-950/80 text-rose-400 flex items-center justify-center border border-rose-900/50">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400 tracking-tight">
            {stats?.outOfStockCount ?? outOfStockItems.length}
          </div>
          <div className="mt-1 text-xs text-rose-400/90 font-medium">
            Zero stock on shelf
          </div>
        </div>
      </div>

      {/* Middle Grid: Category Breakdown & Low Stock Alert Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-1 rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm tracking-wide">Category Distribution</h3>
            <span className="text-xs text-slate-400">{categoryStats.length} Categories</span>
          </div>

          <div className="space-y-3.5">
            {categoryStats.map((cat) => {
              const pct = totalStockUnits > 0 ? Math.round((cat.totalQty / totalStockUnits) * 100) : 0;
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{cat.name}</span>
                    <span className="text-slate-400 font-mono">{cat.totalQty} units ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {categoryStats.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-500">No items found for this tenant.</div>
            )}
          </div>
        </div>

        {/* Low / Critical Stock Watchlist */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-white text-sm tracking-wide">Stock Attention Watchlist</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                {lowStockItems.length + outOfStockItems.length} Critical
              </span>
            </div>
            <button
              onClick={onNavigateToInventory}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition"
            >
              View Full Table →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800 font-mono uppercase text-[10px]">
                <tr>
                  <th className="pb-2">Product Name</th>
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Available</th>
                  <th className="pb-2">Threshold</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[...outOfStockItems, ...lowStockItems].slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 font-medium text-slate-200">{item.name}</td>
                    <td className="py-2.5 font-mono text-slate-400">{item.sku}</td>
                    <td className="py-2.5 text-slate-400">{item.category}</td>
                    <td className="py-2.5 font-bold font-mono text-white">{item.quantity}</td>
                    <td className="py-2.5 font-mono text-slate-400">{item.lowStockThreshold}</td>
                    <td className="py-2.5">
                      {item.quantity === 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                          OUT OF STOCK
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                          LOW STOCK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500">
                      All products are adequately stocked!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity / Transactions Section */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="font-semibold text-white text-sm tracking-wide">Recent Tenant Stock Transactions</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Isolated for {currentTenant?.id}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {transactions.slice(0, 4).map((tx) => (
            <div key={tx.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  tx.type === 'IN' 
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : tx.type === 'OUT'
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                }`}>
                  {tx.type} ({tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="font-medium text-slate-200 truncate mt-1">{tx.productName || 'Inventory SKU'}</div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">{tx.note || 'Manual adjustment'}</div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="col-span-4 text-center py-6 text-xs text-slate-500">
              No recent transactions recorded for this tenant.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
