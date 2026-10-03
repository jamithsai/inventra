import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { Warehouse, InventoryItem, StockTransferRequest, StockTransferResult } from '../types';
import { warehousesApi } from '../services/api';
import { formatINR } from '../utils/currency';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  items: InventoryItem[];
  preselectedWarehouseId?: string;
  preselectedProductId?: string;
  initialSourceWarehouseId?: string;
  initialProductId?: string;
  onTransfer?: (request: StockTransferRequest) => Promise<StockTransferResult>;
  onTransferSuccess?: () => void;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  items,
  preselectedWarehouseId,
  preselectedProductId,
  initialSourceWarehouseId,
  initialProductId,
  onTransfer,
  onTransferSuccess,
}) => {
  const activeWarehouses = warehouses.filter((w) => w.isActive);

  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('');
  const [destWarehouseId, setDestWarehouseId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferResult, setTransferResult] = useState<StockTransferResult | null>(null);

  const effectiveWarehouseId = preselectedWarehouseId || initialSourceWarehouseId;
  const effectiveProductId = preselectedProductId || initialProductId;

  useEffect(() => {
    if (isOpen) {
      const initialSource = effectiveWarehouseId || (activeWarehouses.length > 0 ? activeWarehouses[0].id : '');
      const otherWarehouses = activeWarehouses.filter((w) => w.id !== initialSource);
      const initialDest = otherWarehouses.length > 0 ? otherWarehouses[0].id : '';

      setSourceWarehouseId(initialSource);
      setDestWarehouseId(initialDest);
      setProductId(effectiveProductId || (items.length > 0 ? items[0].id : ''));
      setQuantity(1);
      setNote('Inter-facility stock replenishment');
      setError(null);
      setTransferResult(null);
    }
  }, [isOpen, effectiveWarehouseId, effectiveProductId, warehouses, items]);

  if (!isOpen) return null;

  const sourceWarehouse = activeWarehouses.find((w) => w.id === sourceWarehouseId);
  const destWarehouse = activeWarehouses.find((w) => w.id === destWarehouseId);
  const selectedProduct = items.find((i) => i.id === productId);

  // Available quantity in source warehouse
  const sourceStockInfo = selectedProduct?.warehouseStocks?.find((ws) => ws.warehouseId === sourceWarehouseId);
  const availableInSource = sourceStockInfo ? sourceStockInfo.quantity : (selectedProduct?.quantity ?? 0);

  // Destination current quantity
  const destStockInfo = selectedProduct?.warehouseStocks?.find((ws) => ws.warehouseId === destWarehouseId);
  const currentInDest = destStockInfo ? destStockInfo.quantity : 0;

  const handleSourceChange = (newSourceId: string) => {
    setSourceWarehouseId(newSourceId);
    if (destWarehouseId === newSourceId) {
      const alternative = activeWarehouses.find((w) => w.id !== newSourceId);
      if (alternative) {
        setDestWarehouseId(alternative.id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sourceWarehouseId || !destWarehouseId) {
      setError('Please select both source and destination facilities');
      return;
    }

    if (sourceWarehouseId === destWarehouseId) {
      setError('Source and destination facilities must be different');
      return;
    }

    if (!productId) {
      setError('Please select a product to transfer');
      return;
    }

    if (quantity <= 0) {
      setError('Transfer quantity must be at least 1 unit');
      return;
    }

    if (quantity > availableInSource) {
      setError(
        `Cannot transfer ${quantity} units. Only ${availableInSource} units available in ${sourceWarehouse?.name || 'source facility'}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: StockTransferRequest = {
        sourceWarehouseId,
        destinationWarehouseId: destWarehouseId,
        productId,
        quantity: Number(quantity),
        note: note.trim() || undefined,
      };

      const result = onTransfer ? await onTransfer(payload) : await warehousesApi.transfer(payload);
      setTransferResult(result);
      if (onTransferSuccess) {
        onTransferSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to complete stock transfer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172033]/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-[9px] bg-white border border-[#E5E1D8] shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EEEAE3]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-[7px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center border border-[#D5E0FF]">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#172033]">Inter-Facility Stock Transfer</h2>
              <p className="text-xs text-[#626D82]">
                Atomically move physical inventory between tenant facilities
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9FA7B3] hover:text-[#172033] p-1 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Confirmation Modal State */}
        {transferResult ? (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[8px] flex items-start space-x-3 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-sm text-emerald-900">Transfer Completed Successfully</p>
                <p>{transferResult.message}</p>
                <p className="font-mono text-[11px] text-emerald-700">Tx ID: {transferResult.transactionId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-xs">
              <div>
                <p className="text-[#626D82] text-[11px]">Source ({sourceWarehouse?.code})</p>
                <p className="font-semibold text-[#172033]">{transferResult.sourceRemainingQuantity} units remaining</p>
              </div>
              <div>
                <p className="text-[#626D82] text-[11px]">Destination ({destWarehouse?.code})</p>
                <p className="font-semibold text-[#172033]">{transferResult.destinationNewQuantity} units updated</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-white bg-[#3157D5] hover:bg-[#2546B8] rounded-[7px] transition"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          /* Transfer Form */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-[7px] flex items-start space-x-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Transfer Validation Failed</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Warehouse Selector Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <label className="font-medium text-[#172033]">Origin Facility *</label>
                <select
                  value={sourceWarehouseId}
                  onChange={(e) => handleSourceChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white"
                >
                  {activeWarehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} — {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-[#172033]">Destination Facility *</label>
                <select
                  value={destWarehouseId}
                  onChange={(e) => setDestWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white"
                >
                  {activeWarehouses
                    .filter((w) => w.id !== sourceWarehouseId)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} — {w.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Product Selector */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-medium text-[#172033]">Product Catalog Item *</label>
                {selectedProduct && (
                  <span className="text-[11px] font-medium text-[#3157D5]">
                    Available in {sourceWarehouse?.code}: {availableInSource} units
                  </span>
                )}
              </div>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white"
              >
                {items.map((item) => {
                  const stockInSrc =
                    item.warehouseStocks?.find((ws) => ws.warehouseId === sourceWarehouseId)?.quantity ?? item.quantity;
                  return (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.sku}) — {stockInSrc} available in source
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Transfer Quantity & Live Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="font-medium text-[#172033]">Transfer Quantity *</label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={availableInSource || 1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white font-medium"
                  />
                  {availableInSource > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuantity(availableInSource)}
                      className="absolute right-2 top-1.5 px-2 py-0.5 text-[10px] font-semibold text-[#3157D5] bg-[#E9EEFF] rounded-[4px] hover:bg-[#D5E0FF] transition"
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-[#172033]">Unit Price (INR)</label>
                <div className="px-3 py-2 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-[#4D576B] font-mono">
                  {selectedProduct ? formatINR(selectedProduct.price) : '₹0'}
                </div>
              </div>
            </div>

            {/* Live Movement Flow Diagram */}
            {selectedProduct && sourceWarehouse && destWarehouse && (
              <div className="p-3 bg-[#FAF9F5] border border-[#E5E1D8] rounded-[8px] space-y-2">
                <div className="text-[11px] font-medium text-[#626D82] uppercase tracking-wider">
                  Transfer Projection
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="text-left">
                    <p className="font-semibold text-[#172033]">{sourceWarehouse.code}</p>
                    <p className="text-[11px] text-[#626D82]">
                      {availableInSource} → <span className="font-bold text-amber-700">{Math.max(0, availableInSource - quantity)}</span> units
                    </p>
                  </div>

                  <div className="flex flex-col items-center px-2">
                    <span className="text-[10px] font-mono font-bold text-[#3157D5] bg-[#E9EEFF] px-2 py-0.5 rounded-full mb-0.5">
                      {quantity} units
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#3157D5]" />
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-[#172033]">{destWarehouse.code}</p>
                    <p className="text-[11px] text-[#626D82]">
                      {currentInDest} → <span className="font-bold text-emerald-700">{currentInDest + quantity}</span> units
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Transfer Notes */}
            <div className="space-y-1">
              <label className="font-medium text-[#172033]">Reason / Dispatch Note</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Stock balancing for North region, PO ref #998"
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-[#172033] placeholder-[#9FA7B3] focus:outline-none focus:border-[#3157D5] focus:bg-white"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#EEEAE3]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#4D576B] bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] hover:bg-[#F2EFE9] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || availableInSource <= 0 || !destWarehouseId}
                className="px-4 py-2 text-xs font-medium text-white bg-[#3157D5] hover:bg-[#2546B8] rounded-[7px] transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
              >
                <span>{isSubmitting ? 'Transferring...' : 'Execute Stock Transfer'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
