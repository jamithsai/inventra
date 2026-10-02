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
  ArrowUpDown,
  ScanBarcode
} from 'lucide-react';
import type { InventoryItem, Tenant } from '../types';
import { formatINR } from '../utils/currency';

interface InventoryViewProps {
  items: InventoryItem[];
  currentTenant: Tenant | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenAddModal: () => void;
  onOpenEditModal: (item: InventoryItem) => void;
  onOpenStockModal: (item: InventoryItem) => void;
  onDeleteItem: (id: string, name: string) => void;
  onOpenBarcodeScanner?: () => void;
  initialCategory?: string;
  initialStatus?: string;
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
  onOpenBarcodeScanner,
  initialCategory = 'ALL',
  initialStatus = 'ALL',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price' | 'updatedAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  React.useEffect(() => {
    if (initialCategory) setCategoryFilter(initialCategory);
    if (initialStatus) setStatusFilter(initialStatus);
  }, [initialCategory, initialStatus]);

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
          item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

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

  const formatCurrency = (val: number) => formatINR(val);

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E1D8]">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">Inventory Catalog</h1>
            <span className="text-xs px-2 py-0.5 rounded-[4px] font-mono bg-[#FBFAF7] text-[#667085] border border-[#E5E1D8]">
              {filteredItems.length} SKUs
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-0.5">
            Data isolated to <strong className="text-[#172033] font-medium">{currentTenant?.name}</strong> (Tenant ID: <code className="text-[#3157D5] font-mono">{currentTenant?.id}</code>)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenBarcodeScanner && (
            <button
              onClick={onOpenBarcodeScanner}
              className="px-3 py-1.5 rounded-[7px] bg-white hover:bg-[#FBFAF7] text-[#344054] border border-[#E5E1D8] font-medium text-xs transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
              title="Open Barcode Scanner (Ctrl + K -> Scan)"
            >
              <ScanBarcode className="w-3.5 h-3.5 text-[#3157D5]" />
              <span className="hidden sm:inline">Scan Barcode</span>
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-[7px] bg-white hover:bg-[#FBFAF7] text-[#667085] border border-[#E5E1D8] transition shadow-xs cursor-pointer"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3157D5]' : ''}`} />
          </button>
          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-1.5 rounded-[7px] bg-[#3157D5] hover:bg-[#2648BE] text-white font-medium text-xs transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-[9px] bg-white border border-[#E5E1D8] shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
          <input
            type="text"
            placeholder="Filter by product name, SKU, category, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs text-[#172033] placeholder-[#98A2B3] focus:outline-none focus:border-[#3157D5] focus:bg-white transition"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#98A2B3] shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white"
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
            className="w-full px-2.5 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN_STOCK">In Stock (&gt; Threshold)</option>
            <option value="LOW_STOCK">Low Stock (≤ Threshold)</option>
            <option value="OUT_OF_STOCK">Out of Stock (0 Units)</option>
          </select>
        </div>
      </div>

      {/* Inventory Data Table */}
      <div className="rounded-[9px] bg-white border border-[#E5E1D8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FBFAF7] border-b border-[#E5E1D8] text-[11px] text-[#667085] font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => handleSort('name')} className="flex items-center space-x-1 hover:text-[#172033]">
                    <span>Product</span>
                    <ArrowUpDown className="w-3 h-3 text-[#98A2B3]" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => handleSort('quantity')} className="flex items-center space-x-1 hover:text-[#172033]">
                    <span>Stock Level</span>
                    <ArrowUpDown className="w-3 h-3 text-[#98A2B3]" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">
                  <button onClick={() => handleSort('price')} className="flex items-center space-x-1 hover:text-[#172033]">
                    <span>Price</span>
                    <ArrowUpDown className="w-3 h-3 text-[#98A2B3]" />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Total Value</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEAE3]">
              {filteredItems.map((item) => {
                const isOutOfStock = item.quantity === 0;
                const isLowStock = !isOutOfStock && item.quantity <= item.lowStockThreshold;

                return (
                  <tr key={item.id} className="hover:bg-[#FBFAF7] transition">
                    {/* Product Name & Image */}
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-[6px] bg-[#FBFAF7] border border-[#E5E1D8] flex items-center justify-center shrink-0 overflow-hidden text-[#667085]">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-[#98A2B3]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[#172033] truncate max-w-xs">
                            {item.name}
                          </div>
                          <div className="text-[10px] font-mono text-[#98A2B3]">
                            ID: {item.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* SKU & Barcode */}
                    <td className="px-4 py-3 font-mono text-[#667085]">
                      <div className="font-semibold text-[#172033]">{item.sku}</div>
                      {item.barcode && (
                        <div className="text-[10px] text-[#3157D5] flex items-center space-x-1 mt-0.5 font-mono">
                          <ScanBarcode className="w-3 h-3 text-[#3157D5] shrink-0" />
                          <span>{item.barcode}</span>
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#FBFAF7] text-[#667085] border border-[#E5E1D8]">
                        {item.category}
                      </span>
                    </td>

                    {/* Quantity & Bar */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-[#172033]">{item.quantity}</span>
                          <span className="text-[10px] text-[#98A2B3] font-mono">/ min {item.lowStockThreshold}</span>
                        </div>
                        <div className="w-20 h-1.5 rounded-full bg-[#F7F5F0] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isOutOfStock
                                ? 'bg-[#D64545]'
                                : isLowStock
                                ? 'bg-[#FFB547]'
                                : 'bg-[#3157D5]'
                            }`}
                            style={{
                              width: `${Math.min(100, (item.quantity / Math.max(item.lowStockThreshold * 3, 10)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Unit Price */}
                    <td className="px-4 py-3 font-mono text-[#667085]">
                      {formatCurrency(item.price)}
                    </td>

                    {/* Total Value */}
                    <td className="px-4 py-3 font-mono font-bold text-[#172033]">
                      {formatCurrency(item.quantity * item.price)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-medium bg-[#FDECEC] text-[#D64545] border border-[#FAD1D1]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D64545]" />
                          <span>OUT OF STOCK</span>
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-medium bg-[#FFF3DC] text-[#C77B16] border border-[#FDE4B3]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#FFB547]" />
                          <span>LOW STOCK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-[4px] text-[10px] font-medium bg-[#E8F6EF] text-[#238B5A] border border-[#C8EBD9]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#238B5A]" />
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
                          className="px-2 py-1 rounded-[6px] bg-[#E9EEFF] hover:bg-[#D5E0FF] text-[#3157D5] text-xs border border-[#C7D7FE] font-medium flex items-center space-x-1 transition"
                        >
                          <SlidersHorizontal className="w-3 h-3 text-[#3157D5]" />
                          <span>Adjust</span>
                        </button>
                        <button
                          onClick={() => onOpenEditModal(item)}
                          title="Edit Details"
                          className="p-1 rounded-[6px] bg-white hover:bg-[#FBFAF7] text-[#667085] hover:text-[#172033] border border-[#E5E1D8] transition"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item.id, item.name)}
                          title="Delete Product"
                          className="p-1 rounded-[6px] bg-white hover:bg-[#FDECEC] text-[#98A2B3] hover:text-[#D64545] border border-[#E5E1D8] hover:border-[#FAD1D1] transition"
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
                    <div className="w-10 h-10 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] flex items-center justify-center mx-auto text-[#98A2B3] mb-3">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-semibold text-[#172033]">No Inventory Found</div>
                    <p className="text-xs text-[#667085] mt-1 max-w-md mx-auto">
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
