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
    <div className="space-y-5">
      {/* Top Tenant Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
              {currentTenant?.name || 'Loading Tenant...'}
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
              {currentTenant?.id}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            {currentTenant?.description || 'Tenant stock catalog and real-time inventory telemetry.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddModal}
            className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
          <button
            onClick={onNavigateToInventory}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 font-medium text-xs transition flex items-center space-x-1.5"
          >
            <span>Catalog</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* 5 Neutral Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Total Products */}
        <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Total SKUs</div>
          <div className="text-2xl font-semibold text-zinc-100 mt-1 font-mono tracking-tight">
            {stats?.totalProducts ?? items.length}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">Across catalog</div>
        </div>

        {/* Total Stock */}
        <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Stock Units</div>
          <div className="text-2xl font-semibold text-zinc-100 mt-1 font-mono tracking-tight">
            {totalStockUnits.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">{categoryStats.length} active categories</div>
        </div>

        {/* Valuation */}
        <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Valuation</div>
          <div className="text-2xl font-semibold text-zinc-100 mt-1 font-mono tracking-tight">
            {formatCurrency(totalValuation)}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">Total asset value</div>
        </div>

        {/* Low Stock */}
        <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Low Stock</div>
          <div className="text-2xl font-semibold text-zinc-200 mt-1 font-mono tracking-tight flex items-center gap-2">
            <span>{stats?.lowStockCount ?? lowStockItems.length}</span>
            {(stats?.lowStockCount ?? lowStockItems.length) > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">At/below threshold</div>
        </div>

        {/* Out of Stock */}
        <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3.5 col-span-2 lg:col-span-1">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">Out of Stock</div>
          <div className="text-2xl font-semibold text-zinc-200 mt-1 font-mono tracking-tight flex items-center gap-2">
            <span>{stats?.outOfStockCount ?? outOfStockItems.length}</span>
            {(stats?.outOfStockCount ?? outOfStockItems.length) > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            )}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">0 units remaining</div>
        </div>
      </div>

      {/* Middle Section: Category Breakdown & Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Category Breakdown */}
        <div className="lg:col-span-1 rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-zinc-200 uppercase font-mono tracking-wider">
              Category Distribution
            </h3>
            <span className="text-[11px] text-zinc-400">{categoryStats.length} Total</span>
          </div>

          <div className="space-y-3">
            {categoryStats.map((cat) => {
              const pct = totalStockUnits > 0 ? Math.round((cat.totalQty / totalStockUnits) * 100) : 0;
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">{cat.name}</span>
                    <span className="text-zinc-400 font-mono text-[11px]">{cat.totalQty} ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 rounded bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-zinc-400 rounded"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {categoryStats.length === 0 && (
              <div className="text-center py-6 text-xs text-zinc-500">No items available.</div>
            )}
          </div>
        </div>

        {/* Stock Watchlist Table */}
        <div className="lg:col-span-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-semibold text-zinc-200 uppercase font-mono tracking-wider">
                Attention Watchlist
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                {lowStockItems.length + outOfStockItems.length}
              </span>
            </div>
            <button
              onClick={onNavigateToInventory}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition"
            >
              View all →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-zinc-400 border-b border-zinc-800 font-mono text-[10px] uppercase">
                <tr>
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Qty</th>
                  <th className="pb-2 font-medium">Min</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {[...outOfStockItems, ...lowStockItems].slice(0, 5).map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition">
                    <td className="py-2 text-zinc-200 font-sans font-medium">{item.name}</td>
                    <td className="py-2 text-zinc-400 text-[11px]">{item.sku}</td>
                    <td className="py-2 text-zinc-400 text-[11px] font-sans">{item.category}</td>
                    <td className="py-2 font-semibold text-zinc-100">{item.quantity}</td>
                    <td className="py-2 text-zinc-500">{item.lowStockThreshold}</td>
                    <td className="py-2">
                      {item.quantity === 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>Out of Stock</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Low Stock</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-zinc-500 font-sans">
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
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-zinc-200 uppercase font-mono tracking-wider">
            Recent Stock Activity
          </h3>
          <span className="text-[11px] text-zinc-500 font-mono">tenant: {currentTenant?.id}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {transactions.slice(0, 4).map((tx) => (
            <div key={tx.id} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase text-zinc-400">
                  {tx.type} ({tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity})
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="font-medium text-zinc-200 truncate">{tx.productName || 'Item'}</div>
              <div className="text-[11px] text-zinc-500 truncate mt-0.5">{tx.note || 'Adjustment'}</div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="col-span-4 text-center py-6 text-xs text-zinc-500">
              No recent activity recorded for this tenant.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
