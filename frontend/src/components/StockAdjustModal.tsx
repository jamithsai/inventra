import React, { useState } from 'react';
import { X, SlidersHorizontal, ArrowUpCircle, ArrowDownCircle, RefreshCw, AlertCircle } from 'lucide-react';
import type { InventoryItem, UpdateStockDto, Tenant } from '../types';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onAdjust: (id: string, dto: UpdateStockDto) => Promise<void>;
  currentTenant: Tenant | null;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  item,
  onAdjust,
}) => {
  const [type, setType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [quantityChange, setQuantityChange] = useState<number>(10);
  const [note, setNote] = useState<string>('Restock delivery batch');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const calculateNewStock = () => {
    if (type === 'IN') return item.quantity + Number(quantityChange);
    if (type === 'OUT') return Math.max(0, item.quantity - Number(quantityChange));
    return Number(quantityChange); // Direct adjustment
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onAdjust(item.id, {
        type,
        quantityChange: Number(quantityChange),
        note,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-lg bg-zinc-900 border border-zinc-800 shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-zinc-950 text-zinc-300 flex items-center justify-center border border-zinc-800">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm">Adjust Stock Level</h3>
              <p className="text-[11px] text-zinc-400 font-mono truncate max-w-[200px]">
                {item.name} ({item.sku})
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Current vs Projected preview */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-center">
            <div>
              <div className="text-[10px] uppercase font-mono text-zinc-500">Current Stock</div>
              <div className="text-lg font-semibold font-mono text-zinc-200">{item.quantity} units</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-zinc-400">Projected Stock</div>
              <div className="text-lg font-semibold font-mono text-zinc-100">{calculateNewStock()} units</div>
            </div>
          </div>

          {/* Operation Type Buttons */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Adjustment Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('IN')}
                className={`py-1.5 rounded-md text-xs font-medium flex items-center justify-center space-x-1 border transition ${
                  type === 'IN'
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <ArrowUpCircle className="w-3 h-3 text-zinc-300" />
                <span>Stock IN (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('OUT')}
                className={`py-1.5 rounded-md text-xs font-medium flex items-center justify-center space-x-1 border transition ${
                  type === 'OUT'
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <ArrowDownCircle className="w-3 h-3 text-zinc-400" />
                <span>Stock OUT (-)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('ADJUSTMENT')}
                className={`py-1.5 rounded-md text-xs font-medium flex items-center justify-center space-x-1 border transition ${
                  type === 'ADJUSTMENT'
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <RefreshCw className="w-3 h-3 text-zinc-400" />
                <span>Override</span>
              </button>
            </div>
          </div>

          {/* Quantity Amount */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              {type === 'ADJUSTMENT' ? 'New Total Stock Amount' : 'Quantity to Add / Deduct'}
            </label>
            <input
              type="number"
              min={type === 'ADJUSTMENT' ? 0 : 1}
              required
              value={quantityChange}
              onChange={(e) => setQuantityChange(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Audit Note */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Audit Reason / Note</label>
            <input
              type="text"
              required
              placeholder="e.g. Purchase order PO-998, Damaged units writeoff..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>

          {/* Footer */}
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
              {isSubmitting ? 'Recording...' : 'Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
