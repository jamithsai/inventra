import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ScanBarcode, 
  Camera, 
  CameraOff, 
  Search, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Minus, 
  SlidersHorizontal, 
  Edit3, 
  ExternalLink, 
  RefreshCw, 
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Building2,
  ArrowRightLeft
} from 'lucide-react';
import type { InventoryItem, Tenant, UpdateStockDto } from '../types';
import { inventoryApi } from '../services/api';
import { formatINR } from '../utils/currency';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTenant: Tenant | null;
  onViewProductInInventory: (item: InventoryItem) => void;
  onEditProduct: (item: InventoryItem) => void;
  onAddNewProductWithBarcode: (barcode: string) => void;
  onStockUpdated: () => void;
  onOpenTransferModal?: (warehouseId?: string, productId?: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  currentTenant,
  onViewProductInInventory,
  onEditProduct,
  onAddNewProductWithBarcode,
  onStockUpdated,
  onOpenTransferModal,
}) => {
  // Mode: 'camera' | 'manual'
  const [activeMode, setActiveMode] = useState<'camera' | 'manual'>('camera');

  const [manualBarcode, setManualBarcode] = useState('');
  
  // Camera & Detection States
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unsupported'>('idle');
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Lookup result states
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [foundItem, setFoundItem] = useState<InventoryItem | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Quick Stock Adjustment state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [quickStockAmount, setQuickStockAmount] = useState<number>(10);
  const [quickStockType, setQuickStockType] = useState<'IN' | 'OUT'>('IN');
  const [quickStockNote, setQuickStockNote] = useState<string>('Barcode quick restock');
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [stockAdjustSuccess, setStockAdjustSuccess] = useState<string | null>(null);


  // Stop camera media tracks cleanly
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  // Start camera stream
  const startCamera = async () => {
    stopCamera();
    setCameraState('requesting');
    setLookupError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState('unsupported');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState('active');
      setIsScanning(true);
      startBarcodeDetectionLoop();
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('denied');
      } else {
        setCameraState('unsupported');
      }
    }
  };

  // Barcode Detection Loop
  const startBarcodeDetectionLoop = () => {
    if (scanIntervalRef.current) {
      window.clearInterval(scanIntervalRef.current);
    }

    // Check for native BarcodeDetector
    const hasNativeBarcodeDetector = 'BarcodeDetector' in window;

    if (hasNativeBarcodeDetector) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
        });

        scanIntervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;

          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const detectedCode = barcodes[0].rawValue;
              if (detectedCode) {
                handleBarcodeDetected(detectedCode);
              }
            }
          } catch {
            // Ignore frame detection failures
          }
        }, 300);
      } catch {
        // Fallback to manual entry if detector constructor throws
      }
    }
  };

  // When modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFoundItem(null);
      setScannedBarcode(null);
      setLookupError(null);
      setStockAdjustSuccess(null);
      setManualBarcode('');
      if (activeMode === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeMode]);

  // Handle barcode lookup
  const handleBarcodeDetected = async (code: string) => {
    if (!code || isLookingUp) return;
    stopCamera();
    setScannedBarcode(code);
    setIsLookingUp(true);
    setLookupError(null);
    setStockAdjustSuccess(null);

    try {
      const item = await inventoryApi.getByBarcode(code);
      setFoundItem(item);
      if (item.warehouseStocks && item.warehouseStocks.length > 0) {
        const defaultWs = item.warehouseStocks.find((ws) => ws.isDefault && ws.isActive) || item.warehouseStocks[0];
        setSelectedWarehouseId(defaultWs.warehouseId);
      }
    } catch (err: any) {
      setFoundItem(null);
      if (err.response?.status === 404) {
        setLookupError(`No product found with barcode "${code}" in active workspace "${currentTenant?.name || currentTenant?.id}".`);
      } else {
        setLookupError(err.response?.data?.message || err.message || 'Error looking up barcode.');
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleManualLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleBarcodeDetected(manualBarcode.trim());
    }
  };

  // Reset to scan another barcode
  const handleScanAnother = () => {
    setFoundItem(null);
    setScannedBarcode(null);
    setLookupError(null);
    setStockAdjustSuccess(null);
    setManualBarcode('');
    setSelectedWarehouseId('');
    if (activeMode === 'camera') {
      startCamera();
    }
  };

  // Quick Stock Adjustment handler
  const handleQuickStockAdjustment = async () => {
    if (!foundItem) return;
    setIsAdjustingStock(true);
    setStockAdjustSuccess(null);

    try {
      const updated = await inventoryApi.updateStock(foundItem.id, {
        type: quickStockType,
        quantityChange: Number(quickStockAmount),
        note: quickStockNote || 'Barcode scanner quick adjust',
        warehouseId: selectedWarehouseId || undefined,
      });

      setFoundItem(updated);
      setStockAdjustSuccess(`Stock updated! New balance: ${updated.quantity} units.`);
      onStockUpdated();
    } catch (err: any) {
      setLookupError(err.response?.data?.message || err.message || 'Failed to adjust stock');
    } finally {
      setIsAdjustingStock(false);
    }
  };


  // Tenant test presets for immediate warehouse testing
  const tenantPresets = [
    { label: 'iPhone 15 Pro Max', barcode: '0194253789012', tenant: 'acme-retail' },
    { label: 'Dell XPS 15', barcode: '0884116412345', tenant: 'acme-retail' },
    { label: 'ESP32-WROOM-32D', barcode: '5901234123457', tenant: 'nova-electronics' },
    { label: 'Raspberry Pi 5', barcode: '7501031311309', tenant: 'nova-electronics' },
    { label: '5-Axis CNC Mill', barcode: '8901234000011', tenant: 'forge' },
    { label: 'Aeron Chair', barcode: '9780201379624', tenant: 'zenith-supplies' },
  ];

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#172033]/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-[12px] bg-white border border-[#E5E1D8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E1D8] bg-[#FAF9F6]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center border border-[#C7D7FE]">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#172033] text-sm flex items-center space-x-2">
                <span>Barcode Scanner & Quick Lookup</span>
              </h3>
              <p className="text-[11px] text-[#667085] font-mono">
                Active Tenant: {currentTenant?.name} ({currentTenant?.id})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-[6px] text-[#98A2B3] hover:text-[#172033] hover:bg-[#EEEAE3] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        {!foundItem && !isLookingUp && (
          <div className="flex border-b border-[#E5E1D8] bg-[#FAF9F6] px-4 pt-2">
            <button
              onClick={() => {
                setActiveMode('camera');
                setLookupError(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold border-b-2 transition ${
                activeMode === 'camera'
                  ? 'border-[#3157D5] text-[#3157D5]'
                  : 'border-transparent text-[#667085] hover:text-[#172033]'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Scanner</span>
            </button>
            <button
              onClick={() => {
                setActiveMode('manual');
                stopCamera();
                setLookupError(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-semibold border-b-2 transition ${
                activeMode === 'manual'
                  ? 'border-[#3157D5] text-[#3157D5]'
                  : 'border-transparent text-[#667085] hover:text-[#172033]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Manual Entry & Presets</span>
            </button>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* STATE 1: Looking Up Indicator */}
          {isLookingUp && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#E9EEFF] border border-[#C7D7FE] flex items-center justify-center mx-auto text-[#3157D5] animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <p className="font-semibold text-sm text-[#172033]">
                Looking up barcode in workspace...
              </p>
              <p className="font-mono text-xs text-[#3157D5] font-semibold bg-[#E9EEFF] px-2.5 py-1 rounded inline-block">
                {scannedBarcode}
              </p>
            </div>
          )}

          {/* STATE 2: Product Found Result Card */}
          {!isLookingUp && foundItem && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Header result banner */}
              <div className="p-3.5 rounded-[9px] bg-[#EBFDF3] border border-[#A6F4C5] flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#027A48] shrink-0" />
                  <div>
                    <div className="font-bold text-xs text-[#027A48]">Product Detected & Verified</div>
                    <div className="text-[11px] font-mono text-[#027A48]/80">
                      Barcode: {foundItem.barcode || scannedBarcode}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleScanAnother}
                  className="px-2.5 py-1 rounded-[6px] bg-white border border-[#A6F4C5] text-[#027A48] hover:bg-[#DCFCE7] text-xs font-semibold transition"
                >
                  Scan Another
                </button>
              </div>

              {/* Product Specifications Card */}
              <div className="p-4 rounded-[10px] bg-[#FBFAF7] border border-[#E5E1D8] space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#667085] bg-white px-2 py-0.5 rounded border border-[#EEEAE3]">
                      {foundItem.category}
                    </span>
                    <h4 className="font-bold text-base text-[#172033] leading-snug">
                      {foundItem.name}
                    </h4>
                    <div className="flex items-center space-x-2 text-xs font-mono text-[#667085]">
                      <span>SKU: <strong className="text-[#172033]">{foundItem.sku}</strong></span>
                      <span>•</span>
                      <span>Tenant: <strong className="text-[#172033]">{foundItem.tenantId}</strong></span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${
                    foundItem.status === 'IN_STOCK'
                      ? 'bg-[#EBFDF3] border-[#A6F4C5] text-[#027A48]'
                      : foundItem.status === 'LOW_STOCK'
                      ? 'bg-[#FFF9EB] border-[#FEDF89] text-[#B54708]'
                      : 'bg-[#FDECEC] border-[#F9C5C5] text-[#D9383A]'
                  }`}>
                    {foundItem.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Stock Depth & Valuation Metrics */}
                <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-[#EEEAE3]">
                  <div className="p-2.5 rounded-[7px] bg-white border border-[#EEEAE3] text-center">
                    <div className="text-[10px] uppercase font-mono text-[#667085]">In Stock</div>
                    <div className="text-lg font-bold font-mono text-[#172033] mt-0.5">{foundItem.quantity}</div>
                  </div>
                  <div className="p-2.5 rounded-[7px] bg-white border border-[#EEEAE3] text-center">
                    <div className="text-[10px] uppercase font-mono text-[#667085]">Unit Price</div>
                    <div className="text-base font-bold font-mono text-[#172033] mt-0.5">{formatINR(foundItem.price)}</div>
                  </div>
                  <div className="p-2.5 rounded-[7px] bg-white border border-[#EEEAE3] text-center">
                    <div className="text-[10px] uppercase font-mono text-[#3157D5] font-semibold">Total Valuation</div>
                    <div className="text-base font-bold font-mono text-[#3157D5] mt-0.5">
                      {formatINR(foundItem.quantity * foundItem.price)}
                    </div>
                  </div>
                </div>

                {/* Multi-Warehouse Distribution */}
                {foundItem.warehouseStocks && foundItem.warehouseStocks.length > 0 && (
                  <div className="p-3 bg-[#FAF9F5] border border-[#E5E1D8] rounded-[8px] space-y-2 mt-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#172033]">
                      <span className="flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#3157D5]" />
                        <span>Facility Distribution ({foundItem.warehouseStocks.length} Hubs)</span>
                      </span>
                      <span className="text-[#626D82] font-mono font-normal">
                        {foundItem.warehouseStocks.filter((ws) => ws.quantity > 0).length} stocked
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {foundItem.warehouseStocks.map((ws) => (
                        <div
                          key={ws.warehouseId}
                          className={`p-2 rounded-[6px] border text-xs transition ${
                            selectedWarehouseId === ws.warehouseId
                              ? 'bg-[#E9EEFF] border-[#3157D5] text-[#172033]'
                              : 'bg-white border-[#EEEAE3] text-[#4D576B]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-[#3157D5] text-[10px]">{ws.warehouseCode}</span>
                            {ws.isDefault && (
                              <span className="text-[8px] font-bold text-purple-700 bg-purple-50 px-1 rounded">Default</span>
                            )}
                          </div>
                          <div className="text-[10px] font-medium truncate mt-0.5" title={ws.warehouseName}>
                            {ws.warehouseName}
                          </div>
                          <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-[#EEEAE3]/60">
                            <span className="text-[9px] text-[#626D82]">Stock:</span>
                            <span className="font-mono font-bold text-[#172033]">{ws.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Stock Adjustment Section */}
              <div className="p-4 rounded-[10px] bg-white border border-[#E5E1D8] shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-xs text-[#172033] flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#3157D5]" />
                    <span>Quick Facility Stock Adjust</span>
                  </h5>
                  {stockAdjustSuccess && (
                    <span className="text-[11px] font-mono text-[#027A48] font-semibold">
                      ✓ {stockAdjustSuccess}
                    </span>
                  )}
                </div>

                {/* Target Warehouse Selector for Adjustment */}
                {foundItem.warehouseStocks && foundItem.warehouseStocks.length > 1 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#626D82] block">Target Facility:</label>
                    <select
                      value={selectedWarehouseId}
                      onChange={(e) => setSelectedWarehouseId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#FAF9F5] border border-[#DDD8CE] rounded-[6px] text-xs text-[#172033] focus:outline-none focus:border-[#3157D5]"
                    >
                      {foundItem.warehouseStocks.map((ws) => (
                        <option key={ws.warehouseId} value={ws.warehouseId}>
                          {ws.warehouseCode} — {ws.warehouseName} ({ws.quantity} units currently)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickStockType('IN')}
                    className={`py-1.5 px-3 rounded-[7px] text-xs font-semibold border flex items-center justify-center space-x-1.5 transition ${
                      quickStockType === 'IN'
                        ? 'bg-[#EBFDF3] border-[#A6F4C5] text-[#027A48] font-bold'
                        : 'bg-[#FBFAF7] border-[#E5E1D8] text-[#667085] hover:bg-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Restock / Inbound (+Qty)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickStockType('OUT')}
                    className={`py-1.5 px-3 rounded-[7px] text-xs font-semibold border flex items-center justify-center space-x-1.5 transition ${
                      quickStockType === 'OUT'
                        ? 'bg-[#FDECEC] border-[#F9C5C5] text-[#D9383A] font-bold'
                        : 'bg-[#FBFAF7] border-[#E5E1D8] text-[#667085] hover:bg-white'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Dispatch / Outbound (-Qty)</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {[5, 10, 25, 50].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setQuickStockAmount(amt)}
                      className={`px-3 py-1 rounded-[6px] text-xs font-mono font-bold border transition ${
                        quickStockAmount === amt
                          ? 'bg-[#E9EEFF] border-[#3157D5] text-[#3157D5]'
                          : 'bg-[#FBFAF7] border-[#EEEAE3] text-[#667085] hover:bg-white'
                      }`}
                    >
                      {quickStockType === 'IN' ? `+${amt}` : `-${amt}`}
                    </button>
                  ))}
                  <div className="flex-1">
                    <input
                      type="number"
                      min="1"
                      value={quickStockAmount}
                      onChange={(e) => setQuickStockAmount(Math.max(1, Number(e.target.value)))}
                      className="w-full px-2.5 py-1 text-xs border border-[#E5E1D8] rounded-[6px] font-mono text-center font-bold"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isAdjustingStock}
                  onClick={handleQuickStockAdjustment}
                  className="w-full py-2 rounded-[7px] bg-[#3157D5] hover:bg-[#2545B8] text-white text-xs font-semibold transition flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isAdjustingStock ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    Apply {quickStockType === 'IN' ? `+${quickStockAmount}` : `-${quickStockAmount}`} Units Adjustment
                  </span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewProductInInventory(foundItem);
                  }}
                  className="px-2.5 py-2 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] hover:bg-[#EEEAE3] text-[#172033] text-xs font-semibold transition flex items-center justify-center space-x-1"
                >
                  <Package className="w-3.5 h-3.5 text-[#3157D5]" />
                  <span>View Catalog</span>
                </button>

                {onOpenTransferModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTransferModal(selectedWarehouseId || undefined, foundItem.id);
                    }}
                    className="px-2.5 py-2 rounded-[7px] bg-[#E9EEFF] border border-[#D5E0FF] hover:bg-[#D5E0FF] text-[#3157D5] text-xs font-semibold transition flex items-center justify-center space-x-1"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#3157D5]" />
                    <span>Transfer Stock</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditProduct(foundItem);
                  }}
                  className="px-2.5 py-2 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] hover:bg-[#EEEAE3] text-[#172033] text-xs font-semibold transition flex items-center justify-center space-x-1"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#344054]" />
                  <span>Edit Product</span>
                </button>
              </div>
            </div>
          )}


          {/* STATE 3: Barcode Not Found or Lookup Error */}
          {!isLookingUp && lookupError && (
            <div className="p-4 rounded-[10px] bg-[#FDECEC] border border-[#F9C5C5] space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start space-x-2.5">
                <ShieldAlert className="w-5 h-5 text-[#D9383A] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-[#D9383A]">Barcode Not Found in Workspace</h4>
                  <p className="text-xs text-[#D9383A]/90 leading-relaxed">
                    {lookupError}
                  </p>
                  <p className="text-[11px] text-[#D9383A]/70 font-mono">
                    Zero-Trust Tenant Isolation: Barcodes belonging to other organizations cannot be accessed.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2 border-t border-[#F9C5C5]">
                {scannedBarcode && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAddNewProductWithBarcode(scannedBarcode);
                    }}
                    className="flex-1 px-3 py-2 rounded-[7px] bg-[#D9383A] hover:bg-[#B82527] text-white text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Product with "{scannedBarcode}"</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleScanAnother}
                  className="px-3 py-2 rounded-[7px] bg-white border border-[#F9C5C5] text-[#D9383A] hover:bg-[#FDECEC] text-xs font-semibold transition"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: Camera Scanner Mode */}
          {!foundItem && !isLookingUp && activeMode === 'camera' && (
            <div className="space-y-3">
              {/* Video Camera Viewfinder Box */}
              <div className="relative w-full h-64 rounded-[10px] bg-[#172033] border border-[#E5E1D8] overflow-hidden flex items-center justify-center shadow-inner">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Camera Active Viewfinder Overlay */}
                {cameraState === 'active' && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    {/* Viewfinder Bounding Box */}
                    <div className="relative w-64 h-36 border-2 border-[#3157D5] rounded-[8px] bg-white/5 backdrop-blur-[0.5px]">
                      {/* Laser Line Scanning Animation */}
                      <div className="absolute left-0 right-0 h-0.5 bg-[#3157D5] shadow-[0_0_8px_#3157D5] animate-pulse" 
                           style={{ top: '50%' }} />
                      {/* Corner Accents */}
                      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
                    </div>

                    <p className="text-[11px] text-white/90 font-medium mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs font-mono">
                      Align barcode within the blue frame
                    </p>
                  </div>
                )}

                {/* Camera Permission Denied or Unsupported Screen */}
                {(cameraState === 'denied' || cameraState === 'unsupported') && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-[#172033] text-white space-y-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-[#FEDF89]">
                      <CameraOff className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-white">
                        {cameraState === 'denied' ? 'Camera Access Denied' : 'Camera Unavailable'}
                      </p>
                      <p className="text-[11px] text-white/70 mt-1 max-w-xs">
                        Use the manual barcode lookup tab to search by barcode number or test presets.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveMode('manual')}
                      className="px-3 py-1.5 rounded-[7px] bg-[#3157D5] text-white text-xs font-semibold hover:bg-[#2545B8] transition"
                    >
                      Enter Barcode Manually
                    </button>
                  </div>
                )}

                {/* Requesting Camera Permission */}
                {cameraState === 'requesting' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#172033] text-white space-y-2">
                    <RefreshCw className="w-6 h-6 text-[#3157D5] animate-spin" />
                    <p className="text-xs text-white/80 font-mono">Requesting camera access...</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-[#667085]">
                <span>Status: <strong className="font-mono text-[#172033]">{cameraState.toUpperCase()}</strong></span>
                <button
                  type="button"
                  onClick={() => setActiveMode('manual')}
                  className="text-[#3157D5] font-semibold hover:underline"
                >
                  Can't scan? Enter barcode manually →
                </button>
              </div>
            </div>
          )}

          {/* STATE 5: Manual Barcode Entry & Test Presets */}
          {!foundItem && !isLookingUp && activeMode === 'manual' && (
            <div className="space-y-4">
              <form onSubmit={handleManualLookupSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1.5">
                    Enter Barcode Value (EAN-13, UPC-A, Code-128)
                  </label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <ScanBarcode className="w-4 h-4 text-[#868C98] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={manualBarcode}
                        onChange={(e) => setManualBarcode(e.target.value)}
                        placeholder="e.g. 0194253789012 or 5901234123457"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-[#E5E1D8] rounded-[7px] font-mono text-[#172033] placeholder-[#98A2B3] focus:outline-none focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5]"
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!manualBarcode.trim()}
                      className="px-4 py-2 rounded-[7px] bg-[#3157D5] hover:bg-[#2545B8] text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      Lookup
                    </button>
                  </div>
                </div>
              </form>

              {/* Warehouse Quick Test Presets */}
              <div className="p-3.5 rounded-[9px] bg-[#FBFAF7] border border-[#E5E1D8] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#172033] flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#3157D5]" />
                    <span>Quick Warehouse Barcode Presets</span>
                  </span>
                  <span className="text-[10px] font-mono text-[#667085]">
                    Click to test instant lookup
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {tenantPresets.map((preset) => {
                    const isCurrentTenant = preset.tenant === currentTenant?.id;
                    return (
                      <button
                        key={preset.barcode}
                        type="button"
                        onClick={() => {
                          setManualBarcode(preset.barcode);
                          handleBarcodeDetected(preset.barcode);
                        }}
                        className={`p-2 rounded-[7px] border text-left text-xs transition cursor-pointer ${
                          isCurrentTenant
                            ? 'bg-white border-[#C7D7FE] hover:border-[#3157D5] shadow-2xs'
                            : 'bg-white/60 border-[#EEEAE3] hover:bg-white text-[#667085]'
                        }`}
                      >
                        <div className="font-semibold text-[#172033] truncate flex items-center justify-between">
                          <span>{preset.label}</span>
                          {isCurrentTenant && (
                            <span className="text-[9px] font-mono px-1 py-0.2 bg-[#E9EEFF] text-[#3157D5] rounded">
                              Matches
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-[#667085] mt-0.5">
                          {preset.barcode}
                        </div>
                        <div className="text-[9px] font-mono text-[#98A2B3] mt-0.5">
                          Tenant: {preset.tenant}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5E1D8] bg-[#FAF9F6] flex items-center justify-between text-xs text-[#667085]">
          <span className="text-[11px] font-mono">
            {currentTenant?.name} • Secured by ITenantContext
          </span>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-[6px] bg-white border border-[#D0D5DD] text-[#344054] hover:bg-[#F2F4F7] font-semibold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
