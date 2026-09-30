import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  FolderLock, 
  ScrollText, 
  ShieldAlert, 
  BookOpen, 
  Layers, 
  KeyRound,
  ExternalLink
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
  const navItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'inventory',
      label: 'Inventory Catalog',
      icon: <Package className="w-5 h-5" />,
    },
    {
      id: 'files',
      label: 'S3 File Storage',
      icon: <FolderLock className="w-5 h-5" />,
      badge: 'S3 Path',
      badgeColor: 'bg-amber-950 text-amber-400 border border-amber-800',
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: <ScrollText className="w-5 h-5" />,
    },
    {
      id: 'security-demo',
      label: 'Tenant Isolation Demo',
      icon: <ShieldAlert className="w-5 h-5" />,
      badge: 'LIVE TEST',
      badgeColor: 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse',
    },
    {
      id: 'architecture',
      label: 'Architecture & Proof',
      icon: <Layers className="w-5 h-5" />,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Active Tenant Context Card */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Active Context</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <div className="mt-1 font-semibold text-slate-100 truncate">
          {tenantName || 'No Tenant Selected'}
        </div>
        <div className="mt-0.5 text-xs font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate">
          X-Tenant-ID: {tenantId || 'none'}
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
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition group ${
                isActive
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Security Guarantee Box */}
      <div className="p-4 m-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
        <div className="flex items-center space-x-2 text-cyan-400 font-semibold mb-1">
          <KeyRound className="w-4 h-4" />
          <span>Tenant Data Isolation</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          EF Core Global Query Filters enforce <code className="text-cyan-300">TenantId == CurrentTenantId</code> on all DB queries. S3 keys are prefixed <code className="text-amber-300">/tenants/{'{tenantId}'}/</code>.
        </p>
      </div>
    </aside>
  );
};
