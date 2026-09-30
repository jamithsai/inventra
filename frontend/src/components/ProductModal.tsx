import React, { useState, useEffect } from 'react';
import { X, Box, AlertCircle } from 'lucide-react';
import type { InventoryItem, CreateInventoryItemDto, Tenant } from '../types';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateInventoryItemDto) => Promise<void>;
  editingItem: InventoryItem | null;
  currentTenant: Tenant | null;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  currentTenant,
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('General');
  const [quantity, setQuantity] = useState(10);
  const [price, setPrice] = useState(99.99);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setSku(editingItem.sku);
      setCategory(editingItem.category);
      setQuantity(editingItem.quantity);
      setPrice(editingItem.price);
      setLowStockThreshold(editingItem.lowStockThreshold);
      setImageUrl(editingItem.imageUrl || '');
    } else {
      const prefix = currentTenant?.id.split('-')[0].toUpperCase() || 'SKU';
      setName('');
      setSku(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory('Electronics');
      setQuantity(25);
      setPrice(149.99);
      setLowStockThreshold(5);
      setImageUrl('');
    }
    setError(null);
  }, [editingItem, isOpen, currentTenant]);

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
        imageUrl: imageUrl || undefined,
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
      <div className="w-full max-w-lg rounded-[9px] bg-white border border-[#E5E1D8] shadow-2xl p-6 space-y-4">
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
              <label className="block text-xs font-semibold text-[#172033] mb-1">Unit Price ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs font-mono font-bold text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white focus:ring-1 focus:ring-[#3157D5] transition"
              />
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
