import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle } from 'lucide-react';
import type { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from '../types';

interface WarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: Warehouse | null; // If null, create mode; if set, edit mode
  onSubmitCreate: (data: CreateWarehouseRequest) => Promise<void>;
  onSubmitUpdate: (id: string, data: UpdateWarehouseRequest) => Promise<void>;
}

export const WarehouseModal: React.FC<WarehouseModalProps> = ({
  isOpen,
  onClose,
  warehouse,
  onSubmitCreate,
  onSubmitUpdate,
}) => {
  const isEdit = !!warehouse;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (warehouse) {
      setName(warehouse.name);
      setCode(warehouse.code);
      setAddress(warehouse.address || '');
      setCity(warehouse.city || '');
      setState(warehouse.state || '');
      setIsDefault(warehouse.isDefault);
      setIsActive(warehouse.isActive);
    } else {
      setName('');
      setCode('');
      setAddress('');
      setCity('');
      setState('');
      setIsDefault(false);
      setIsActive(true);
    }
    setError(null);
  }, [warehouse, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Facility name is required');
      return;
    }

    if (!isEdit && !code.trim()) {
      setError('Warehouse code is required (e.g. WH-HYD-01)');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit && warehouse) {
        await onSubmitUpdate(warehouse.id, {
          name: name.trim(),
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          isDefault,
          isActive,
        });
      } else {
        await onSubmitCreate({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          isDefault,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save warehouse facility');
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
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#172033]">
                {isEdit ? `Edit Facility: ${warehouse?.name}` : 'New Warehouse Facility'}
              </h2>
              <p className="text-xs text-[#626D82]">
                {isEdit ? 'Update facility parameters and status' : 'Add a new physical distribution or storage hub'}
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

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-[7px] flex items-start space-x-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Validation / Operation Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-medium text-[#172033]">Facility Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hyderabad Central Depot"
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-[#172033] placeholder-[#9FA7B3] focus:outline-none focus:border-[#3157D5] focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-[#172033]">
                Facility Code * {isEdit && <span className="text-[#9FA7B3]">(Immutable)</span>}
              </label>
              <input
                type="text"
                required
                disabled={isEdit}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. WH-HYD-01"
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-[#172033] font-mono placeholder-[#9FA7B3] focus:outline-none focus:border-[#3157D5] focus:bg-white disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-[#172033]">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. HITEC City Phase 2, Industrial Logistics Zone"
              className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-[#172033] placeholder-[#9FA7B3] focus:outline-none focus:border-[#3157D5] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="font-medium text-[#172033]">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Hyderabad"
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-[#172033] placeholder-[#9FA7B3] focus:outline-none focus:border-[#3157D5] focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-[#172033]">State / Region</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Telangana"
                className="w-full px-3 py-2 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[7px] text-[#172033] placeholder-[#9FA7B3] focus:outline-none focus:border-[#3157D5] focus:bg-white"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="pt-2 border-t border-[#EEEAE3] space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-[#3157D5] rounded border-[#DDD8CE] focus:ring-[#3157D5]"
              />
              <span className="text-xs text-[#172033] font-medium">Set as Default Warehouse</span>
              <span className="text-[11px] text-[#626D82]">(Receives new catalog products by default)</span>
            </label>

            {isEdit && (
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#3157D5] rounded border-[#DDD8CE] focus:ring-[#3157D5]"
                />
                <span className="text-xs text-[#172033] font-medium">Facility is Active</span>
                <span className="text-[11px] text-[#626D82]">(Can only be deactivated when total stock is 0)</span>
              </label>
            )}
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
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-[#3157D5] hover:bg-[#2546B8] rounded-[7px] transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
            >
              <span>{isSubmitting ? 'Saving...' : isEdit ? 'Update Facility' : 'Create Facility'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
