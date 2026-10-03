import React, { useState, useEffect } from 'react';
import { Box, X, AlertCircle, Building2 } from 'lucide-react';
import type { InventoryItem, CreateInventoryItemDto, Tenant, Warehouse } from '../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateInventoryItemDto) => Promise<void>;
  editingItem: InventoryItem | null;
  currentTenant: Tenant | null;
  warehouses?: Warehouse[];
  initialBarcode?: string;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  currentTenant,
  warehouses = [],
  initialBarcode = '',
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('General');
  const [quantity, setQuantity] = useState(10);
  const [price, setPrice] = useState(99.99);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [barcode, setBarcode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRandomBarcode = () => {
    const random10 = Math.floor(1000000000 + Math.random() * 9000000000);
    setBarcode(`890${random10}`);
  };

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setSku(editingItem.sku);
      setCategory(editingItem.category);
      setQuantity(editingItem.quantity);
      setPrice(editingItem.price);
      setLowStockThreshold(editingItem.lowStockThreshold);
      setBarcode(editingItem.barcode || '');
      setImageUrl(editingItem.imageUrl || '');
      setWarehouseId('');
    } else {
      const prefix = currentTenant?.id.split('-')[0].toUpperCase() || 'SKU';
      setName('');
      setSku(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory('Electronics');
      setQuantity(25);
      setPrice(149.99);
      setLowStockThreshold(5);
      setBarcode(initialBarcode || '');
      setImageUrl('');
      // Default to default warehouse or first active warehouse
      const defaultWh = warehouses.find(w => w.isDefault) || warehouses.find(w => w.isActive) || warehouses[0];
      setWarehouseId(defaultWh?.id || '');
    }
    setError(null);
  }, [editingItem, isOpen, currentTenant, initialBarcode, warehouses]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSave({
        name,
        sku,
        category,
        quantity: Number(quantity),
        price: Number(price),
        lowStockThreshold: Number(lowStockThreshold),
        barcode: barcode.trim() || undefined,
        imageUrl: imageUrl || undefined,
        warehouseId: !editingItem && warehouseId ? warehouseId : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172033]/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-[9px] bg-white border border-[#E5E1D8] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EEEAE3]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-[7px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center border border-[#D5E0FF]">
              <Box className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#172033] text-sm">
                {editingItem ? 'Edit Product' : 'Add New Product'}
              </h3>
              <p className="text-[11px] text-[#667085] font-mono">
                Tenant: {currentTenant?.name} ({currentTenant?.id})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] text-[#98A2B3] hover:text-[#172033] hover:bg-[#FBFAF7] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-[7px] bg-[#FDECEC] border border-[#F9C5C5] text-[#D9383A] text-xs flex items-center space-x-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Enterprise Workstation Pro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs text-[#172033] placeholder-[#98A2B3] focus:outline-none focus:border-[#3157D5] focus:bg-white focus:ring-1 focus:ring-[#3157D5] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">SKU Identifier *</label>
              <input
                type="text"
                required
                placeholder="SKU-1001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs font-mono text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white focus:ring-1 focus:ring-[#3157D5] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Category *</label>
              <input
                type="text"
                required
                placeholder="e.g. Laptops, Audio, Office"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white focus:ring-1 focus:ring-[#3157D5] transition"
              />
            </div>
          </div>

          {!editingItem && warehouses.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">
                Initial Stock Warehouse Facility *
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-[#667085] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs font-medium text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white focus:ring-1 focus:ring-[#3157D5] transition"
                >
                  {warehouses
                    .filter((w) => w.isActive)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code}) {w.city ? `— ${w.city}` : ''} {w.isDefault ? '⭐ [Default Facility]' : ''}
                      </option>
                    ))}
                </select>
              </div>
              <p className="text-[10px] text-[#667085] mt-1 font-mono">
                The initial stock units will be allocated to this facility's inventory partition.
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#172033]">
                Barcode (EAN-13 / UPC / Code-128)
              </label>
              <button
                type="button"
                onClick={generateRandomBarcode}
                className="text-[11px] font-semibold text-[#3157D5] hover:underline"
              >
                + Generate Random Barcode
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. 0194253789012"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full px-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs font-mono text-[#172033] placeholder-[#98A2B3] focus:outline-none focus:border-[#3157D5] focus:bg-white focus:ring-1 focus:ring-[#3157D5] transition"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Initial Stock</label>
              <input
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs font-mono text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white focus:ring-1 focus:ring-[#3157D5] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Unit Price (₹)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#667085]">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  placeholder="e.g. 1299"
                  className="w-full pl-6 pr-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs font-mono font-bold text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white focus:ring-1 focus:ring-[#3157D5] transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172033] mb-1">Low Threshold</label>
              <input
                type="number"
                min="0"
                required
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs font-mono text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white focus:ring-1 focus:ring-[#3157D5] transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">Image URL / S3 Asset URL</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/... or S3 URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs text-[#172033] placeholder-[#98A2B3] focus:outline-none focus:border-[#3157D5] focus:bg-white focus:ring-1 focus:ring-[#3157D5] transition"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#EEEAE3]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[7px] bg-[#FBFAF7] hover:bg-[#EEEAE3] text-[#172033] text-xs font-medium border border-[#E5E1D8] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-[7px] bg-[#3157D5] hover:bg-[#2648BE] disabled:opacity-40 text-white font-medium text-xs transition shadow-sm"
            >
              {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
