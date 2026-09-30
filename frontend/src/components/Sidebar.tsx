import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  FolderLock, 
  ScrollText, 
  ShieldCheck, 
  Layers
} from 'lucide-react';

export type TabType = 'dashboard' | 'inventory' | 'files' | 'audit' | 'security-demo' | 'architecture';

interface SidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  tenantName?: string;
  tenantId?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  tenantName,
  tenantId,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'inventory',
      label: 'Inventory Catalog',
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'files',
      label: 'Files & Storage',
      icon: <FolderLock className="w-4 h-4" />,
      badge: 'S3',
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: <ScrollText className="w-4 h-4" />,
    },
    {
      id: 'security-demo',
      label: 'Isolation Bench',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: 'Demo',
    },
    {
      id: 'architecture',
      label: 'Architecture Specs',
      icon: <Layers className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      {/* Active Tenant Context Card */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/60">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-medium">
          Active Tenant Context
        </div>
        <div className="font-semibold text-xs text-slate-900 mt-1 truncate">
          {tenantName || 'No Context'}
        </div>
        <div className="mt-1.5 text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 truncate">
          {tenantId || 'none'}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span className={isActive ? 'text-slate-900' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded uppercase bg-white text-slate-600 border border-slate-200">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Security Statement Footer */}
      <div className="p-3 m-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-normal">
        <div className="flex items-center space-x-1.5 font-mono text-[10px] text-emerald-700 font-semibold uppercase tracking-wider mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Global Filter Active</span>
        </div>
        EF Core Query Filters enforce <code className="text-slate-800 font-mono font-medium">TenantId</code> on every database query.
      </div>
    </aside>
  );
};
