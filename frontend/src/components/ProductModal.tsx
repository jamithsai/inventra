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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-lg bg-zinc-900 border border-zinc-800 shadow-2xl p-5 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-zinc-950 text-zinc-300 flex items-center justify-center border border-zinc-800">
              <Box className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm">
                {editingItem ? 'Edit Product' : 'Add New Product'}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Tenant: {currentTenant?.name} ({currentTenant?.id})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-zinc-950 border border-red-900/50 text-red-400 text-xs flex items-center space-x-2 font-mono">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Enterprise Workstation Pro"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">SKU Identifier *</label>
              <input
                type="text"
                required
                placeholder="SKU-1001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Category *</label>
              <input
                type="text"
                required
                placeholder="e.g. Laptops, Audio, Office"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Initial Stock</label>
              <input
                type="number"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Unit Price ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Low Threshold</label>
              <input
                type="number"
                min="0"
                required
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Image URL / S3 Asset URL</label>
            <input
              type="url"
              placeholder="https://images.unsplash.com/... or S3 URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-md bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-900 font-medium text-xs transition shadow-sm"
            >
              {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
