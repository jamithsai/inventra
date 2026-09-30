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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172033]/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-[9px] bg-white border border-[#E5E1D8] shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EEEAE3]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-[7px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center border border-[#D5E0FF]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#172033] text-sm">Adjust Stock Level</h3>
              <p className="text-[11px] text-[#667085] font-mono truncate max-w-[200px]">
                {item.name} ({item.sku})
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current vs Projected preview */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-center">
            <div>
              <div className="text-[10px] uppercase font-mono text-[#667085]">Current Stock</div>
              <div className="text-xl font-bold font-mono text-[#172033]">{item.quantity} units</div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono text-[#3157D5] font-semibold">Projected Stock</div>
              <div className="text-xl font-bold font-mono text-[#3157D5]">{calculateNewStock()} units</div>
            </div>
          </div>

          {/* Operation Type Buttons */}
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1.5">Adjustment Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('IN')}
                className={`py-1.5 rounded-[7px] text-xs font-medium flex items-center justify-center space-x-1 border transition ${
                  type === 'IN'
                    ? 'bg-[#3157D5] text-white border-[#3157D5] shadow-xs font-semibold'
                    : 'bg-white text-[#172033] border-[#E5E1D8] hover:bg-[#FBFAF7]'
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5" />
                <span>Stock IN (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('OUT')}
                className={`py-1.5 rounded-[7px] text-xs font-medium flex items-center justify-center space-x-1 border transition ${
                  type === 'OUT'
                    ? 'bg-[#3157D5] text-white border-[#3157D5] shadow-xs font-semibold'
                    : 'bg-white text-[#172033] border-[#E5E1D8] hover:bg-[#FBFAF7]'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5" />
                <span>Stock OUT (-)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('ADJUSTMENT')}
                className={`py-1.5 rounded-[7px] text-xs font-medium flex items-center justify-center space-x-1 border transition ${
                  type === 'ADJUSTMENT'
                    ? 'bg-[#3157D5] text-white border-[#3157D5] shadow-xs font-semibold'
                    : 'bg-white text-[#172033] border-[#E5E1D8] hover:bg-[#FBFAF7]'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Override</span>
              </button>
            </div>
          </div>

          {/* Quantity Amount */}
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">
              {type === 'ADJUSTMENT' ? 'New Total Stock Amount' : 'Quantity to Add / Deduct'}
            </label>
            <input
              type="number"
              min={type === 'ADJUSTMENT' ? 0 : 1}
              required
              value={quantityChange}
              onChange={(e) => setQuantityChange(Number(e.target.value))}
              className="w-full px-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs font-mono text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white focus:ring-1 focus:ring-[#3157D5] transition"
            />
          </div>

          {/* Audit Note */}
          <div>
            <label className="block text-xs font-semibold text-[#172033] mb-1">Audit Reason / Note</label>
            <input
              type="text"
              required
              placeholder="e.g. Purchase order PO-998, Damaged units writeoff..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs text-[#172033] placeholder-[#98A2B3] focus:outline-none focus:border-[#3157D5] focus:bg-white focus:ring-1 focus:ring-[#3157D5] transition"
            />
          </div>

          {/* Footer */}
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
              {isSubmitting ? 'Recording...' : 'Update Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
