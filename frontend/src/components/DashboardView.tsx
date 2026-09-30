import React, { useMemo } from 'react';
import { 
  ArrowUpRight, 
  Plus
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
  const categoryStats = useMemo(() => {
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
      {/* Top Tenant Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {currentTenant?.name || 'Loading Tenant...'}
            </h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {currentTenant?.id}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            {currentTenant?.description || 'Tenant stock catalog and real-time inventory telemetry.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
          <button
            onClick={onNavigateToInventory}
            className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <span>Catalog</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 5 Clean Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Products */}
        <div className="rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium">Total SKUs</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tracking-tight">
            {stats?.totalProducts ?? items.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Across catalog</div>
        </div>

        {/* Total Stock */}
        <div className="rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium">Stock Units</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tracking-tight">
            {totalStockUnits.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">{categoryStats.length} active categories</div>
        </div>

        {/* Valuation */}
        <div className="rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium">Valuation</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tracking-tight">
            {formatCurrency(totalValuation)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Total asset value</div>
        </div>

        {/* Low Stock */}
        <div className="rounded-lg bg-white border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium">Low Stock</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tracking-tight flex items-center gap-2">
            <span>{stats?.lowStockCount ?? lowStockItems.length}</span>
            {(stats?.lowStockCount ?? lowStockItems.length) > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">At/below threshold</div>
        </div>

        {/* Out of Stock */}
        <div className="rounded-lg bg-white border border-slate-200 p-4 shadow-sm col-span-2 lg:col-span-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-medium">Out of Stock</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono tracking-tight flex items-center gap-2">
            <span>{stats?.outOfStockCount ?? outOfStockItems.length}</span>
            {(stats?.outOfStockCount ?? outOfStockItems.length) > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">0 units remaining</div>
        </div>
      </div>

      {/* Middle Section: Category Breakdown & Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Category Breakdown */}
        <div className="lg:col-span-1 rounded-lg bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs font-semibold text-slate-800 uppercase font-mono tracking-wider">
              Category Distribution
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">{categoryStats.length} Total</span>
          </div>

          <div className="space-y-3.5">
            {categoryStats.map((cat) => {
              const pct = totalStockUnits > 0 ? Math.round((cat.totalQty / totalStockUnits) * 100) : 0;
              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{cat.name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{cat.totalQty} ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-slate-700 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {categoryStats.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-400">No items available.</div>
            )}
          </div>
        </div>

        {/* Stock Watchlist Table */}
        <div className="lg:col-span-2 rounded-lg bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-semibold text-slate-800 uppercase font-mono tracking-wider">
                Attention Watchlist
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {lowStockItems.length + outOfStockItems.length}
              </span>
            </div>
            <button
              onClick={onNavigateToInventory}
              className="text-xs text-slate-500 hover:text-slate-900 transition font-medium"
            >
              View all →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-100 font-mono text-[10px] uppercase">
                <tr>
                  <th className="pb-2.5 font-medium">Product</th>
                  <th className="pb-2.5 font-medium">SKU</th>
                  <th className="pb-2.5 font-medium">Category</th>
                  <th className="pb-2.5 font-medium">Qty</th>
                  <th className="pb-2.5 font-medium">Min</th>
                  <th className="pb-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {[...outOfStockItems, ...lowStockItems].slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 text-slate-900 font-sans font-medium">{item.name}</td>
                    <td className="py-2.5 text-slate-600 text-[11px]">{item.sku}</td>
                    <td className="py-2.5 text-slate-600 text-[11px] font-sans">{item.category}</td>
                    <td className="py-2.5 font-bold text-slate-900">{item.quantity}</td>
                    <td className="py-2.5 text-slate-400">{item.lowStockThreshold}</td>
                    <td className="py-2.5">
                      {item.quantity === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>Out of Stock</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Low Stock</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400 font-sans">
                      All inventory is within normal threshold limits.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg bg-white border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="text-xs font-semibold text-slate-800 uppercase font-mono tracking-wider">
            Recent Stock Activity
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">tenant: {currentTenant?.id}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {transactions.slice(0, 4).map((tx) => (
            <div key={tx.id} className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase font-semibold text-slate-700">
                  {tx.type} ({tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity})
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="font-medium text-slate-900 truncate">{tx.productName || 'Item'}</div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">{tx.note || 'Adjustment'}</div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="col-span-4 text-center py-6 text-xs text-slate-400">
              No recent activity recorded for this tenant.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
