import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit2, 
  Trash2, 
  SlidersHorizontal, 
  Package, 
  RefreshCw,
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
        const valA = a[sortBy];
        const valB = b[sortBy];
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Inventory Catalog</h1>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-700 border border-slate-200">
              {filteredItems.length} SKUs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data isolated to <strong className="text-slate-800 font-medium">{currentTenant?.name}</strong> (Tenant ID: <code className="text-slate-700 font-mono font-medium">{currentTenant?.id}</code>)
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-md bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition shadow-sm"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-slate-900' : ''}`} />
          </button>
          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition shadow-sm flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by product name, SKU, or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-slate-400 focus:bg-white"
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
            className="w-full px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-slate-400 focus:bg-white"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN_STOCK">In Stock (&gt; Threshold)</option>
            <option value="LOW_STOCK">Low Stock (≤ Threshold)</option>
            <option value="OUT_OF_STOCK">Out of Stock (0 Units)</option>
          </select>
        </div>
      </div>

      {/* Inventory Data Table */}
      <div className="rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => handleSort('name')} className="flex items-center space-x-1 hover:text-slate-900">
                    <span>Product</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => handleSort('quantity')} className="flex items-center space-x-1 hover:text-slate-900">
                    <span>Stock Level</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => handleSort('price')} className="flex items-center space-x-1 hover:text-slate-900">
                    <span>Price</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Total Value</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isOutOfStock = item.quantity === 0;
                const isLowStock = !isOutOfStock && item.quantity <= item.lowStockThreshold;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    {/* Product Name & Image */}
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden text-slate-500">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate max-w-xs">
                            {item.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            ID: {item.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {item.sku}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {item.category}
                      </span>
                    </td>

                    {/* Quantity & Bar */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900">{item.quantity}</span>
                          <span className="text-[10px] text-slate-400 font-mono">/ min {item.lowStockThreshold}</span>
                        </div>
                        <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isOutOfStock
                                ? 'bg-rose-500'
                                : isLowStock
                                ? 'bg-amber-500'
                                : 'bg-slate-600'
                            }`}
                            style={{
                              width: `${Math.min(100, (item.quantity / Math.max(item.lowStockThreshold * 3, 10)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Unit Price */}
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {formatCurrency(item.price)}
                    </td>

                    {/* Total Value */}
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {formatCurrency(item.quantity * item.price)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>OUT OF STOCK</span>
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>LOW STOCK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>IN STOCK</span>
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onOpenStockModal(item)}
                          title="Adjust Stock Level"
                          className="px-2 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs border border-slate-200 shadow-xs flex items-center space-x-1 transition"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                          <span>Adjust</span>
                        </button>
                        <button
                          onClick={() => onOpenEditModal(item)}
                          title="Edit Details"
                          className="p-1 rounded bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs transition"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id, item.name)}
                          title="Delete Product"
                          className="p-1 rounded bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 shadow-xs transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-3">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-semibold text-slate-700">No Inventory Found</div>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
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
