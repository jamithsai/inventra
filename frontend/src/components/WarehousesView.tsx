import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  ArrowRightLeft,
  Search,
  MapPin,
  Package,
  Layers,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  SlidersHorizontal,
  X,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import type { Warehouse, WarehouseDetail, InventoryItem, User, Tenant, CreateWarehouseRequest, UpdateWarehouseRequest, StockTransferRequest } from '../types';
import { warehousesApi } from '../services/api';
import { formatINR, formatCompactINR } from '../utils/currency';
import { WarehouseModal } from './WarehouseModal';
import { StockTransferModal } from './StockTransferModal';

interface WarehousesViewProps {
  currentUser: User | null;
  currentTenant: Tenant | null;
  items: InventoryItem[];
  onRefreshData?: () => void;
}

export const WarehousesView: React.FC<WarehousesViewProps> = ({
  currentUser,
  currentTenant,
  items,
  onRefreshData,
}) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState<boolean>(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [transferSourceWarehouseId, setTransferSourceWarehouseId] = useState<string | undefined>(undefined);

  // Detail Modal state
  const [selectedWarehouseDetail, setSelectedWarehouseDetail] = useState<WarehouseDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailSearch, setDetailSearch] = useState<string>('');

  const isAdmin = currentUser?.role === 'ADMIN';
  const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

  const fetchWarehouses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await warehousesApi.getAll();
      setWarehouses(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load warehouses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, [currentTenant?.id]);

  const handleOpenDetail = async (warehouseId: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await warehousesApi.getById(warehouseId);
      setSelectedWarehouseDetail(detail);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load facility inventory');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreateFacility = async (data: CreateWarehouseRequest) => {
    await warehousesApi.create(data);
    await fetchWarehouses();
    onRefreshData?.();
  };

  const handleUpdateFacility = async (id: string, data: UpdateWarehouseRequest) => {
    await warehousesApi.update(id, data);
    await fetchWarehouses();
    if (selectedWarehouseDetail?.id === id) {
      const updatedDetail = await warehousesApi.getById(id);
      setSelectedWarehouseDetail(updatedDetail);
    }
    onRefreshData?.();
  };

  const handleExecuteTransfer = async (data: StockTransferRequest) => {
    const result = await warehousesApi.transfer(data);
    await fetchWarehouses();
    if (selectedWarehouseDetail) {
      const updatedDetail = await warehousesApi.getById(selectedWarehouseDetail.id);
      setSelectedWarehouseDetail(updatedDetail);
    }
    onRefreshData?.();
    return result;
  };

  // KPIs
  const totalFacilities = warehouses.length;
  const activeFacilities = warehouses.filter((w) => w.isActive).length;
  const totalStockUnits = warehouses.reduce((sum, w) => sum + w.totalStockUnits, 0);
  const totalValuation = warehouses.reduce((sum, w) => sum + w.totalValuation, 0);

  const filteredWarehouses = warehouses.filter((w) => {
    const s = searchTerm.toLowerCase();
    return (
      w.name.toLowerCase().includes(s) ||
      w.code.toLowerCase().includes(s) ||
      (w.city && w.city.toLowerCase().includes(s)) ||
      (w.state && w.state.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-[8px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center border border-[#D5E0FF]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#172033] tracking-tight">Multi-Warehouse Management</h1>
              <p className="text-xs text-[#626D82]">
                Monitor physical storage facilities, track localized inventory, and execute stock transfers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {isManagerOrAdmin && (
            <button
              onClick={() => {
                setTransferSourceWarehouseId(undefined);
                setIsTransferModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-medium text-[#172033] bg-white border border-[#DDD8CE] hover:bg-[#FAF9F5] rounded-[7px] shadow-xs flex items-center space-x-1.5 transition"
            >
              <ArrowRightLeft className="w-4 h-4 text-[#3157D5]" />
              <span>Transfer Stock</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setEditingWarehouse(null);
                setIsFacilityModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-medium text-white bg-[#3157D5] hover:bg-[#2546B8] rounded-[7px] shadow-xs flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Facility</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards (Indian Numbering & INR) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facilities */}
        <div className="bg-white border border-[#E5E1D8] rounded-[9px] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#626D82]">Total Facilities</span>
            <div className="w-7 h-7 rounded-md bg-[#FAF9F5] border border-[#DDD8CE] flex items-center justify-center text-[#4D576B]">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#172033]">{totalFacilities}</span>
            <span className="text-[11px] text-[#626D82]">hubs</span>
          </div>
          <p className="mt-1 text-[11px] text-[#626D82]">
            {activeFacilities} active, {totalFacilities - activeFacilities} offline
          </p>
        </div>

        {/* Active Facilities */}
        <div className="bg-white border border-[#E5E1D8] rounded-[9px] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#626D82]">Active Facilities</span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-700">{activeFacilities}</span>
            <span className="text-[11px] text-emerald-600">operational</span>
          </div>
          <p className="mt-1 text-[11px] text-[#626D82]">Ready for dispatches & receipts</p>
        </div>

        {/* Total Stock Units */}
        <div className="bg-white border border-[#E5E1D8] rounded-[9px] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#626D82]">Total Stock Units</span>
            <div className="w-7 h-7 rounded-md bg-[#E9EEFF] border border-[#D5E0FF] flex items-center justify-center text-[#3157D5]">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#172033]">
              {new Intl.NumberFormat('en-IN').format(totalStockUnits)}
            </span>
            <span className="text-[11px] text-[#626D82]">units</span>
          </div>
          <p className="mt-1 text-[11px] text-[#626D82]">Aggregated across all warehouses</p>
        </div>

        {/* Total Valuation in INR */}
        <div className="bg-white border border-[#E5E1D8] rounded-[9px] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#626D82]">Total Inventory Value</span>
            <div className="w-7 h-7 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-[#172033]">{formatINR(totalValuation)}</span>
          </div>
          <p className="mt-1 text-[11px] text-[#626D82]">Based on current catalog prices</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white border border-[#E5E1D8] rounded-[9px] p-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#9FA7B3] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search facilities by name, code, city, or state..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-xs text-[#172033] placeholder-[#9FA7B3] focus:outline-none focus:border-[#3157D5] focus:bg-white"
          />
        </div>

        <div className="text-xs text-[#626D82]">
          Showing <span className="font-semibold text-[#172033]">{filteredWarehouses.length}</span> of{' '}
          <span className="font-semibold text-[#172033]">{warehouses.length}</span> facilities
        </div>
      </div>

      {/* Warehouses Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-[#626D82]">Loading warehouse facilities...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-[8px] text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="py-16 bg-white border border-[#E5E1D8] rounded-[9px] text-center space-y-2">
          <Building2 className="w-8 h-8 text-[#9FA7B3] mx-auto opacity-50" />
          <p className="text-sm font-semibold text-[#172033]">No facilities match your search</p>
          <p className="text-xs text-[#626D82]">Try adjusting your search criteria or create a new facility.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWarehouses.map((warehouse) => (
            <div
              key={warehouse.id}
              className={`bg-white border rounded-[9px] p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                warehouse.isActive ? 'border-[#E5E1D8]' : 'border-amber-200 bg-amber-50/20 opacity-80'
              }`}
            >
              <div className="space-y-3">
                {/* Header Badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-[#3157D5] bg-[#E9EEFF] border border-[#D5E0FF] px-2 py-0.5 rounded-[5px]">
                        {warehouse.code}
                      </span>
                      {warehouse.isDefault && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-[4px]">
                          Default Hub
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-base font-bold text-[#172033] leading-snug">{warehouse.name}</h3>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      warehouse.isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {warehouse.isActive ? 'Active' : 'Offline'}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center space-x-1.5 text-xs text-[#626D82]">
                  <MapPin className="w-3.5 h-3.5 text-[#9FA7B3] shrink-0" />
                  <span className="truncate">
                    {[warehouse.address, warehouse.city, warehouse.state].filter(Boolean).join(', ') ||
                      'Location unspecified'}
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-[#FAF9F5] border border-[#EEEAE3] rounded-[7px] text-xs">
                  <div>
                    <span className="text-[10px] text-[#626D82] uppercase tracking-wider block">SKUs</span>
                    <span className="font-bold text-[#172033]">{warehouse.totalProducts}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#626D82] uppercase tracking-wider block">Stock</span>
                    <span className="font-bold text-[#172033]">
                      {new Intl.NumberFormat('en-IN').format(warehouse.totalStockUnits)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#626D82] uppercase tracking-wider block">Value</span>
                    <span className="font-bold text-[#172033]">{formatCompactINR(warehouse.totalValuation)}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-4 pt-3 border-t border-[#EEEAE3] flex items-center justify-between text-xs">
                <button
                  onClick={() => handleOpenDetail(warehouse.id)}
                  className="font-medium text-[#3157D5] hover:text-[#2546B8] flex items-center space-x-1 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Stock ({warehouse.totalProducts})</span>
                </button>

                <div className="flex items-center space-x-1.5">
                  {isManagerOrAdmin && warehouse.isActive && (
                    <button
                      onClick={() => {
                        setTransferSourceWarehouseId(warehouse.id);
                        setIsTransferModalOpen(true);
                      }}
                      title="Transfer stock out of this facility"
                      className="p-1.5 text-[#4D576B] hover:text-[#172033] hover:bg-[#FAF9F5] rounded-md transition border border-[#DDD8CE]"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setEditingWarehouse(warehouse);
                        setIsFacilityModalOpen(true);
                      }}
                      title="Edit facility parameters"
                      className="p-1.5 text-[#4D576B] hover:text-[#172033] hover:bg-[#FAF9F5] rounded-md transition border border-[#DDD8CE]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warehouse Detail Drawer / Modal */}
      {selectedWarehouseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172033]/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-[9px] bg-white border border-[#E5E1D8] shadow-2xl p-6 space-y-4 max-h-[90vh] flex flex-col">
            {/* Detail Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EEEAE3]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-[8px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center border border-[#D5E0FF]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-[#172033]">{selectedWarehouseDetail.name}</h2>
                    <span className="font-mono text-xs font-bold text-[#3157D5] bg-[#E9EEFF] px-2 py-0.5 rounded-[4px]">
                      {selectedWarehouseDetail.code}
                    </span>
                    {selectedWarehouseDetail.isDefault && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-[4px]">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#626D82]">
                    {[selectedWarehouseDetail.address, selectedWarehouseDetail.city, selectedWarehouseDetail.state]
                      .filter(Boolean)
                      .join(', ') || 'No address specified'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWarehouseDetail(null)}
                className="text-[#9FA7B3] hover:text-[#172033] p-1 rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Overview in Drawer */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-xs">
              <div>
                <p className="text-[11px] text-[#626D82]">Stored Catalog Items</p>
                <p className="text-base font-bold text-[#172033]">{selectedWarehouseDetail.totalProducts} SKUs</p>
              </div>
              <div>
                <p className="text-[11px] text-[#626D82]">Facility Inventory Stock</p>
                <p className="text-base font-bold text-[#172033]">
                  {new Intl.NumberFormat('en-IN').format(selectedWarehouseDetail.totalStockUnits)} units
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#626D82]">Facility Total Value</p>
                <p className="text-base font-bold text-emerald-700">
                  {formatINR(selectedWarehouseDetail.totalValuation)}
                </p>
              </div>
            </div>

            {/* Search Filter for Table */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#9FA7B3] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  placeholder="Search products in this warehouse by name, SKU, or category..."
                  className="w-full pl-8 pr-3 py-1.5 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[6px] text-xs text-[#172033] placeholder-[#9FA7B3] focus:outline-none focus:border-[#3157D5] focus:bg-white"
                />
              </div>

              {isManagerOrAdmin && selectedWarehouseDetail.isActive && (
                <button
                  onClick={() => {
                    setTransferSourceWarehouseId(selectedWarehouseDetail.id);
                    setIsTransferModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-[#3157D5] bg-[#E9EEFF] hover:bg-[#D5E0FF] rounded-[6px] transition flex items-center space-x-1"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer from Facility</span>
                </button>
              )}
            </div>

            {/* Inventory Table */}
            <div className="flex-1 overflow-y-auto border border-[#E5E1D8] rounded-[7px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F5] text-[#626D82] font-semibold border-b border-[#E5E1D8] sticky top-0">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Warehouse Stock</th>
                    <th className="px-3 py-2 text-right">Subtotal Value</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEAE3]">
                  {selectedWarehouseDetail.stocks
                    .filter((s) => {
                      const ds = detailSearch.toLowerCase();
                      return (
                        s.productName.toLowerCase().includes(ds) ||
                        s.sku.toLowerCase().includes(ds) ||
                        s.category.toLowerCase().includes(ds)
                      );
                    })
                    .map((stock) => (
                      <tr key={stock.id} className="hover:bg-[#FAF9F5]/70">
                        <td className="px-3 py-2 font-medium text-[#172033]">
                          <div className="flex items-center space-x-2">
                            {stock.imageUrl && (
                              <img
                                src={stock.imageUrl}
                                alt={stock.productName}
                                className="w-6 h-6 rounded object-cover border border-[#DDD8CE]"
                              />
                            )}
                            <span className="truncate max-w-[200px]">{stock.productName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-[#626D82]">{stock.sku}</td>
                        <td className="px-3 py-2 text-[#626D82]">{stock.category}</td>
                        <td className="px-3 py-2 text-right font-mono text-[#172033]">{formatINR(stock.price)}</td>
                        <td className="px-3 py-2 text-right font-bold text-[#172033]">
                          {new Intl.NumberFormat('en-IN').format(stock.quantity)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[#172033]">
                          {formatINR(stock.quantity * stock.price)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              stock.quantity === 0
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : stock.quantity <= stock.lowStockThreshold
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {stock.quantity === 0 ? 'Out' : stock.quantity <= stock.lowStockThreshold ? 'Low' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  {selectedWarehouseDetail.stocks.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-[#626D82]">
                        No stock records found for this facility.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-[#EEEAE3]">
              <button
                type="button"
                onClick={() => setSelectedWarehouseDetail(null)}
                className="px-4 py-2 text-xs font-medium text-[#4D576B] bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] hover:bg-[#F2EFE9] transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Create / Edit Modal */}
      <WarehouseModal
        isOpen={isFacilityModalOpen}
        onClose={() => setIsFacilityModalOpen(false)}
        warehouse={editingWarehouse}
        onSubmitCreate={handleCreateFacility}
        onSubmitUpdate={handleUpdateFacility}
      />

      {/* Inter-Warehouse Stock Transfer Modal */}
      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        warehouses={warehouses}
        items={items}
        preselectedWarehouseId={transferSourceWarehouseId}
        onTransfer={handleExecuteTransfer}
      />
    </div>
  );
};
