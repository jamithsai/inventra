import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  LayoutDashboard, 
  Package, 
  ScanBarcode, 
  PlusCircle, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  FolderLock, 
  ScrollText, 
  ShieldCheck, 
  Layers, 
  Building2, 
  RotateCw, 
  LogOut, 
  ArrowRight,
  ArrowLeftRight,
  Sparkles,
  Command as CommandIcon,
  CornerDownLeft
} from 'lucide-react';
import type { Tenant, User } from '../types';
import type { TabType } from './Sidebar';

export interface CommandItem {
  id: string;
  category: 'NAVIGATION' | 'INVENTORY' | 'WORKSPACE' | 'SYSTEM' | 'ACCOUNT';
  label: string;
  description?: string;
  keywords: string[];
  icon: React.ReactNode;
  badge?: string;
  action: () => void;
  adminOnly?: boolean;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  currentTenant: Tenant | null;
  authorizedTenants: Tenant[];
  onNavigateTab: (tab: TabType) => void;
  onNavigateWithFilter: (filter?: { category?: string; status?: string }) => void;
  onOpenAddProduct: () => void;
  onOpenBarcodeScanner: () => void;
  onOpenTransferModal?: () => void;
  onSelectTenant: (tenantId: string) => void;
  onRefreshData: () => void;
  onLogout: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentTenant,
  authorizedTenants,
  onNavigateTab,
  onNavigateWithFilter,
  onOpenAddProduct,
  onOpenBarcodeScanner,
  onOpenTransferModal,
  onSelectTenant,
  onRefreshData,
  onLogout,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Define full command registry
  const allCommands = useMemo<CommandItem[]>(() => {
    const isPlatformAdmin = currentUser?.role === 'ADMIN';

    const commands: CommandItem[] = [
      // --- INVENTORY & QUICK ACTIONS ---
      {
        id: 'cmd-scan-barcode',
        category: 'INVENTORY',
        label: 'Scan Product Barcode',
        description: 'Open camera viewfinder or manual barcode quick-lookup',
        keywords: ['scan', 'barcode', 'camera', 'upc', 'ean', 'qr', 'reader', 'lookup', 'product'],
        icon: <ScanBarcode className="w-4 h-4 text-[#3157D5]" />,
        badge: 'Quick Tool',
        action: () => {
          onClose();
          onOpenBarcodeScanner();
        },
      },
      {
        id: 'cmd-add-product',
        category: 'INVENTORY',
        label: 'Add New Product',
        description: 'Create a new inventory SKU in current workspace',
        keywords: ['add', 'create', 'new', 'sku', 'product', 'item', 'inventory'],
        icon: <PlusCircle className="w-4 h-4 text-[#027A48]" />,
        action: () => {
          onClose();
          onOpenAddProduct();
        },
      },
      {
        id: 'cmd-transfer-stock',
        category: 'INVENTORY',
        label: 'Transfer Stock Across Warehouses',
        description: 'Initiate an atomic inter-facility stock transfer with audit trail',
        keywords: ['transfer', 'move', 'warehouse', 'facility', 'relocate', 'stock', 'inventory', 'shift'],
        icon: <ArrowLeftRight className="w-4 h-4 text-[#3157D5]" />,
        badge: 'Multi-Warehouse',
        action: () => {
          onClose();
          if (onOpenTransferModal) {
            onOpenTransferModal();
          } else {
            onNavigateTab('warehouses');
          }
        },
      },
      {
        id: 'cmd-filter-low-stock',
        category: 'INVENTORY',
        label: 'Low Stock Watchlist',
        description: 'Jump to inventory filtered to items requiring reorder',
        keywords: ['low', 'stock', 'alert', 'warning', 'reorder', 'replenish', 'inventory'],
        icon: <AlertTriangle className="w-4 h-4 text-[#B54708]" />,
        badge: 'Filter',
        action: () => {
          onClose();
          onNavigateWithFilter({ status: 'LOW_STOCK' });
        },
      },
      {
        id: 'cmd-filter-out-stock',
        category: 'INVENTORY',
        label: 'Out of Stock Items',
        description: 'Filter inventory to critical zero-quantity items',
        keywords: ['out', 'empty', 'zero', 'critical', 'stock', 'depleted'],
        icon: <XCircle className="w-4 h-4 text-[#D9383A]" />,
        badge: 'Filter',
        action: () => {
          onClose();
          onNavigateWithFilter({ status: 'OUT_OF_STOCK' });
        },
      },
      {
        id: 'cmd-filter-in-stock',
        category: 'INVENTORY',
        label: 'Healthy / In Stock Catalog',
        description: 'View products with optimal inventory stock levels',
        keywords: ['in', 'stock', 'healthy', 'available', 'active'],
        icon: <CheckCircle2 className="w-4 h-4 text-[#027A48]" />,
        badge: 'Filter',
        action: () => {
          onClose();
          onNavigateWithFilter({ status: 'IN_STOCK' });
        },
      },

      // --- PRIMARY NAVIGATION ---
      {
        id: 'cmd-nav-dashboard',
        category: 'NAVIGATION',
        label: 'Executive Overview',
        description: 'Executive KPIs, stock velocity, and valuation analytics',
        keywords: ['dashboard', 'overview', 'home', 'kpi', 'analytics', 'charts', 'valuation'],
        icon: <LayoutDashboard className="w-4 h-4 text-[#3157D5]" />,
        action: () => {
          onClose();
          onNavigateTab('dashboard');
        },
      },
      {
        id: 'cmd-nav-inventory',
        category: 'NAVIGATION',
        label: 'Inventory Management',
        description: 'View all products, manage stock levels, and audit SKUs',
        keywords: ['inventory', 'products', 'skus', 'items', 'catalog', 'table', 'stock'],
        icon: <Package className="w-4 h-4 text-[#3157D5]" />,
        action: () => {
          onClose();
          onNavigateWithFilter({ category: 'ALL', status: 'ALL' });
        },
      },
      {
        id: 'cmd-nav-warehouses',
        category: 'NAVIGATION',
        label: 'Warehouses & Facilities',
        description: 'Manage warehouse locations, partition stock, and track capacity',
        keywords: ['warehouses', 'facilities', 'hubs', 'storage', 'depot', 'locations', 'transfer'],
        icon: <Building2 className="w-4 h-4 text-[#3157D5]" />,
        badge: 'Multi-Warehouse',
        action: () => {
          onClose();
          onNavigateTab('warehouses');
        },
      },
      {
        id: 'cmd-nav-files',
        category: 'NAVIGATION',
        label: 'Storage & S3 Files',
        description: 'Tenant-isolated AWS S3 document and product asset storage',
        keywords: ['files', 'storage', 's3', 'documents', 'attachments', 'upload', 'bucket'],
        icon: <FolderLock className="w-4 h-4 text-[#3157D5]" />,
        badge: 'S3',
        action: () => {
          onClose();
          onNavigateTab('files');
        },
      },
      {
        id: 'cmd-nav-audit',
        category: 'NAVIGATION',
        label: 'Audit Trail & Compliance',
        description: 'Immutable security and mutation logs for active workspace',
        keywords: ['audit', 'logs', 'trail', 'compliance', 'security', 'history', 'events'],
        icon: <ScrollText className="w-4 h-4 text-[#667085]" />,
        action: () => {
          onClose();
          onNavigateTab('audit');
        },
      },
      {
        id: 'cmd-nav-security-demo',
        category: 'NAVIGATION',
        label: 'Isolation Bench (Attack Scenarios)',
        description: 'Execute live zero-trust multi-tenant security verification tests',
        keywords: ['security', 'bench', 'attack', 'isolation', 'zero trust', 'idor', 'test', 'demo'],
        icon: <ShieldCheck className="w-4 h-4 text-[#12B76A]" />,
        badge: 'Live Tests',
        action: () => {
          onClose();
          onNavigateTab('security-demo');
        },
      },
      {
        id: 'cmd-nav-architecture',
        category: 'NAVIGATION',
        label: 'Architecture Specifications',
        description: 'Inspect multi-tenant defense-in-depth pipeline diagrams',
        keywords: ['architecture', 'specs', 'diagram', 'middleware', 'pipeline', 'ef core', 'docs'],
        icon: <Layers className="w-4 h-4 text-[#7E56D8]" />,
        action: () => {
          onClose();
          onNavigateTab('architecture');
        },
      },
      {
        id: 'cmd-nav-platform-tenants',
        category: 'NAVIGATION',
        label: 'Platform Tenant Directory & Provisioning',
        description: 'Manage tenant workspaces, atomic onboarding, and suspension',
        keywords: ['platform', 'tenants', 'admin', 'onboarding', 'provision', 'organizations', 'workspaces'],
        icon: <Building2 className="w-4 h-4 text-[#F79009]" />,
        badge: 'Platform Admin',
        adminOnly: true,
        action: () => {
          onClose();
          onNavigateTab('platform-tenants');
        },
      },

      // --- WORKSPACE SWITCHING ---
      ...authorizedTenants.map((t) => ({
        id: `cmd-switch-tenant-${t.id}`,
        category: 'WORKSPACE' as const,
        label: `Switch Workspace: ${t.name}`,
        description: `Set active authorized context to ${t.id}`,
        keywords: ['switch', 'tenant', 'workspace', 'organization', t.name.toLowerCase(), t.code.toLowerCase(), t.id],
        icon: <Building2 className="w-4 h-4 text-[#3157D5]" />,
        badge: t.id === currentTenant?.id ? 'Current' : 'Switch',
        action: () => {
          onClose();
          if (t.id !== currentTenant?.id) {
            onSelectTenant(t.id);
          }
        },
      })),

      // --- SYSTEM & SESSION ---
      {
        id: 'cmd-refresh-data',
        category: 'SYSTEM',
        label: 'Refresh Workspace Data',
        description: 'Reload latest inventory, stats, and real-time state from server',
        keywords: ['refresh', 'reload', 'sync', 'update', 'fetch'],
        icon: <RotateCw className="w-4 h-4 text-[#344054]" />,
        action: () => {
          onClose();
          onRefreshData();
        },
      },
      {
        id: 'cmd-account-logout',
        category: 'ACCOUNT',
        label: 'Sign Out / Logout',
        description: `Terminate current session for ${currentUser?.email || 'user'}`,
        keywords: ['logout', 'sign out', 'exit', 'disconnect', 'leave'],
        icon: <LogOut className="w-4 h-4 text-[#D9383A]" />,
        action: () => {
          onClose();
          onLogout();
        },
      },
    ];

    // Filter out admin-only commands if user is not ADMIN
    return commands.filter((cmd) => !cmd.adminOnly || isPlatformAdmin);
  }, [
    currentUser,
    currentTenant,
    authorizedTenants,
    onNavigateTab,
    onNavigateWithFilter,
    onOpenAddProduct,
    onOpenBarcodeScanner,
    onSelectTenant,
    onRefreshData,
    onLogout,
    onClose,
  ]);

  // Filter commands based on user query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.trim().toLowerCase();

    return allCommands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(q);
      const matchDesc = cmd.description?.toLowerCase().includes(q);
      const matchCategory = cmd.category.toLowerCase().includes(q);
      const matchKeywords = cmd.keywords.some((k) => k.toLowerCase().includes(q));
      return matchLabel || matchDesc || matchCategory || matchKeywords;
    });
  }, [allCommands, query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle Keyboard Navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands.length > 0 && filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const listElement = listRef.current;
    if (listElement) {
      const activeItem = listElement.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 p-4 bg-[#172033]/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
    >
      <div 
        className="w-full max-w-xl rounded-[12px] bg-white border border-[#E5E1D8] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Input */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#E5E1D8] bg-[#FAF9F6]">
          <Search className="w-5 h-5 text-[#3157D5] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, product, barcode, or workspace..."
            className="w-full bg-transparent border-none text-sm text-[#172033] placeholder-[#98A2B3] focus:outline-none focus:ring-0 font-medium"
            autoComplete="off"
            spellCheck="false"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="text-xs font-mono text-[#98A2B3] hover:text-[#172033] px-1.5 py-0.5 rounded bg-[#EEEAE3]"
            >
              Clear
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold text-[#667085] bg-white border border-[#D0D5DD] rounded shadow-2xs">
              ESC to close
            </kbd>
          )}
        </div>

        {/* Command List Area */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[380px]"
          role="listbox"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-[#FBFAF7] border border-[#E5E1D8] flex items-center justify-center mx-auto text-[#98A2B3] mb-2.5">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-[#172033]">No commands found</p>
              <p className="text-xs text-[#667085] mt-0.5">
                No matching actions for "{query}". Try "scan", "inventory", or "stock".
              </p>
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onClick={cmd.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-[8px] cursor-pointer transition text-xs select-none ${
                    isSelected
                      ? 'bg-[#E9EEFF] text-[#172033] shadow-2xs'
                      : 'text-[#344054] hover:bg-[#FAF9F6]'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className={`p-1.5 rounded-[6px] shrink-0 border ${
                      isSelected ? 'bg-white border-[#C7D7FE] shadow-2xs' : 'bg-[#FBFAF7] border-[#EEEAE3]'
                    }`}>
                      {cmd.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold truncate ${isSelected ? 'text-[#3157D5]' : 'text-[#172033]'}`}>
                          {cmd.label}
                        </span>
                        {cmd.badge && (
                          <span className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded border ${
                            cmd.badge === 'Quick Tool'
                              ? 'bg-[#EBFDF3] border-[#A6F4C5] text-[#027A48]'
                              : cmd.badge === 'Platform Admin'
                              ? 'bg-[#FFF9EB] border-[#FEDF89] text-[#B54708]'
                              : cmd.badge === 'Current'
                              ? 'bg-[#E9EEFF] border-[#C7D7FE] text-[#3157D5]'
                              : 'bg-[#F2F4F7] border-[#D0D5DD] text-[#475467]'
                          }`}>
                            {cmd.badge}
                          </span>
                        )}
                      </div>
                      {cmd.description && (
                        <p className="text-[11px] text-[#667085] truncate mt-0.5">
                          {cmd.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pl-3 shrink-0">
                    <span className="text-[10px] font-mono text-[#98A2B3] uppercase tracking-wider hidden sm:inline">
                      {cmd.category}
                    </span>
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-[#3157D5]" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2.5 border-t border-[#E5E1D8] bg-[#FAF9F6] flex items-center justify-between text-[11px] text-[#667085] font-mono">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#D0D5DD] text-[#344054] font-semibold text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#D0D5DD] text-[#344054] font-semibold text-[10px]">↓</kbd>
              <span className="ml-1 text-[10px]">to navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#D0D5DD] text-[#344054] font-semibold text-[10px]">↵</kbd>
              <span className="ml-1 text-[10px]">to select</span>
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] text-[#98A2B3]">Active:</span>
            <span className="font-semibold text-[#172033] bg-[#E9EEFF] px-1.5 py-0.2 rounded border border-[#C7D7FE] text-[10px]">
              {currentTenant?.name || currentTenant?.id || 'acme-retail'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
