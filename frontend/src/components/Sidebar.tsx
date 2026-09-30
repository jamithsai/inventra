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
      label: 'Inventory',
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
      label: 'Architecture',
      icon: <Layers className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-56 bg-zinc-950 border-r border-zinc-800/80 flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      {/* Active Tenant Context Card */}
      <div className="p-3.5 border-b border-zinc-800/80">
        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
          Active Tenant
        </div>
        <div className="font-medium text-xs text-zinc-200 mt-0.5 truncate">
          {tenantName || 'No Context'}
        </div>
        <div className="mt-1 text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 truncate">
          {tenantId || 'none'}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-2 space-y-0.5 flex-1">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition ${
                isActive
                  ? 'bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span className={isActive ? 'text-zinc-100' : 'text-zinc-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded uppercase bg-zinc-900 text-zinc-400 border border-zinc-800">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Security Statement Footer */}
      <div className="p-3 m-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[11px] text-zinc-500 leading-normal">
        <div className="font-mono text-[10px] text-zinc-400 uppercase tracking-wide mb-0.5">Isolation Invariant</div>
        EF Core Query Filters enforce <code className="text-zinc-300 font-mono">TenantId</code> per query.
      </div>
    </aside>
  );
};
