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
  currentTenant,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center border border-indigo-800">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Adjust Stock Level</h3>
              <p className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
                {item.name} ({item.sku})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current vs Projected preview */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Current Stock</div>
              <div className="text-xl font-bold font-mono text-slate-100">{item.quantity} units</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-cyan-400">Projected Stock</div>
              <div className="text-xl font-bold font-mono text-cyan-400">{calculateNewStock()} units</div>
            </div>
          </div>

          {/* Operation Type Buttons */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Adjustment Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('IN')}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 border transition ${
                  type === 'IN'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>Stock IN (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('OUT')}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 border transition ${
                  type === 'OUT'
                    ? 'bg-rose-950 text-rose-400 border-rose-700'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span>Stock OUT (-)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('ADJUSTMENT')}
                className={`py-2 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 border transition ${
                  type === 'ADJUSTMENT'
                    ? 'bg-cyan-950 text-cyan-400 border-cyan-700'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Override</span>
              </button>
            </div>
          </div>

          {/* Quantity Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {type === 'ADJUSTMENT' ? 'New Total Stock Amount' : 'Quantity to Add / Deduct'}
            </label>
            <input
              type="number"
              min={type === 'ADJUSTMENT' ? 0 : 1}
              required
              value={quantityChange}
              onChange={(e) => setQuantityChange(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Audit Note */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Audit Reason / Note</label>
            <input
              type="text"
              required
              placeholder="e.g. Purchase order PO-998, Damaged units writeoff..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20"
            >
              {isSubmitting ? 'Recording...' : 'Update & Audit Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
