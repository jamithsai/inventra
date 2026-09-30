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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-lg bg-white border border-slate-200 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Adjust Stock Level</h3>
              <p className="text-[11px] text-slate-500 font-mono truncate max-w-[200px]">
                {item.name} ({item.sku})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current vs Projected preview */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-500">Current Stock</div>
              <div className="text-xl font-bold font-mono text-slate-800">{item.quantity} units</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-600 font-semibold">Projected Stock</div>
              <div className="text-xl font-bold font-mono text-slate-900">{calculateNewStock()} units</div>
            </div>
          </div>

          {/* Operation Type Buttons */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Adjustment Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('IN')}
                className={`py-1.5 rounded-md text-xs font-medium flex items-center justify-center space-x-1 border transition ${
                  type === 'IN'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-semibold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>Stock IN (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('OUT')}
                className={`py-1.5 rounded-md text-xs font-medium flex items-center justify-center space-x-1 border transition ${
                  type === 'OUT'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-semibold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span>Stock OUT (-)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('ADJUSTMENT')}
                className={`py-1.5 rounded-md text-xs font-medium flex items-center justify-center space-x-1 border transition ${
                  type === 'ADJUSTMENT'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs font-semibold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Override</span>
              </button>
            </div>
          </div>

          {/* Quantity Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {type === 'ADJUSTMENT' ? 'New Total Stock Amount' : 'Quantity to Add / Deduct'}
            </label>
            <input
              type="number"
              min={type === 'ADJUSTMENT' ? 0 : 1}
              required
              value={quantityChange}
              onChange={(e) => setQuantityChange(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-slate-800 focus:bg-white"
            />
          </div>

          {/* Audit Note */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Audit Reason / Note</label>
            <input
              type="text"
              required
              placeholder="e.g. Purchase order PO-998, Damaged units writeoff..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-medium text-xs transition shadow-sm"
            >
              {isSubmitting ? 'Recording...' : 'Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
