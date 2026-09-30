import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit2, 
  Trash2, 
  SlidersHorizontal, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ArrowUpDown
} from 'lucide-react';
import type { InventoryItem, Tenant } from '../types';

interface InventoryViewProps {
  items: InventoryItem[];
  currentTenant: Tenant | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (item: InventoryItem) => void;
  onOpenStockModal: (item: InventoryItem) => void;
  onDeleteItem: (id: string, name: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  currentTenant,
  loading,
  onRefresh,
  onOpenAddModal,
  onOpenEditModal,
  onOpenStockModal,
  onDeleteItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price' | 'updatedAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Extract unique categories
  const categories = React.useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return Array.from(set).sort();
  }, [items]);

  // Filter & Sort
  const filteredItems = React.useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

        const matchesStatus =
          statusFilter === 'ALL' ||
          (statusFilter === 'IN_STOCK' && item.quantity > item.lowStockThreshold) ||
          (statusFilter === 'LOW_STOCK' && item.quantity > 0 && item.quantity <= item.lowStockThreshold) ||
          (statusFilter === 'OUT_OF_STOCK' && item.quantity === 0);

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];
        if (typeof valA === 'string') {
          return sortOrder === 'asc' 
            ? (valA as string).localeCompare(valB as string)
            : (valB as string).localeCompare(valA as string);
        }
        return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
  }, [items, searchTerm, categoryFilter, statusFilter, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Tenant Inventory Catalog</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
              {filteredItems.length} Products
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time isolated stock items for <strong className="text-slate-200">{currentTenant?.name}</strong> (Tenant ID: <code className="text-cyan-300 font-mono">{currentTenant?.id}</code>)
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={onOpenAddModal}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition shadow-lg shadow-cyan-500/20 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Product Name, SKU, Category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="IN_STOCK">In Stock (&gt; Threshold)</option>
            <option value="LOW_STOCK">Low Stock (≤ Threshold)</option>
            <option value="OUT_OF_STOCK">Out of Stock (0 Units)</option>
          </select>
        </div>
      </div>

      {/* Inventory Data Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs text-slate-400 font-mono uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">
                  <button onClick={() => handleSort('name')} className="flex items-center space-x-1 hover:text-white">
                    <span>Product</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3.5">SKU</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">
                  <button onClick={() => handleSort('quantity')} className="flex items-center space-x-1 hover:text-white">
                    <span>Stock Level</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3.5">
                  <button onClick={() => handleSort('price')} className="flex items-center space-x-1 hover:text-white">
                    <span>Unit Price</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="px-4 py-3.5">Total Value</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredItems.map((item) => {
                const isOutOfStock = item.quantity === 0;
                const isLowStock = !isOutOfStock && item.quantity <= item.lowStockThreshold;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition group">
                    {/* Product Name & Image */}
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden text-slate-400 font-bold">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-cyan-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-100 group-hover:text-cyan-300 transition truncate max-w-xs">
                            {item.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            ID: {item.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-4 font-mono text-xs text-slate-300 font-medium">
                      {item.sku}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {item.category}
                      </span>
                    </td>

                    {/* Quantity & Bar */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-white text-sm">{item.quantity}</span>
                          <span className="text-[11px] text-slate-500 font-mono">/ min {item.lowStockThreshold}</span>
                        </div>
                        <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isOutOfStock
                                ? 'bg-rose-500'
                                : isLowStock
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${Math.min(100, (item.quantity / Math.max(item.lowStockThreshold * 3, 10)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Unit Price */}
                    <td className="px-4 py-4 font-mono text-slate-200">
                      {formatCurrency(item.price)}
                    </td>

                    {/* Total Value */}
                    <td className="px-4 py-4 font-mono font-semibold text-emerald-400">
                      {formatCurrency(item.quantity * item.price)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-4">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                          <XCircle className="w-3 h-3" />
                          <span>OUT OF STOCK</span>
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                          <AlertCircle className="w-3 h-3" />
                          <span>LOW STOCK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>IN STOCK</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onOpenStockModal(item)}
                          title="Adjust Stock Level"
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-slate-700 flex items-center space-x-1 transition"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Adjust</span>
                        </button>
                        <button
                          onClick={() => onOpenEditModal(item)}
                          title="Edit Details"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id, item.name)}
                          title="Delete Product"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="text-base font-semibold text-slate-300">No Inventory Found</div>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchTerm || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                        ? 'No products matched your active filters. Clear search or filters to see all items.'
                        : `No products currently exist in tenant ${currentTenant?.name}. Click "Add Product" to add one.`}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
