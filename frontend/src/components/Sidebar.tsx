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
  const workspaceItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
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
      label: 'Storage & Files',
      icon: <FolderLock className="w-4 h-4" />,
      badge: 'S3',
    },
  ];

  const adminItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
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
    <aside className="w-60 bg-white border-r border-[#E5E1D8] flex flex-col shrink-0 min-h-[calc(100vh-3.5rem)]">
      {/* Active Organization Context Box */}
      <div className="p-3.5 mx-3 mt-3 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8]">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#98A2B3] font-medium">
          Active Workspace
        </div>
        <div className="font-semibold text-xs text-[#172033] mt-0.5 truncate">
          {tenantName || 'No Organization'}
        </div>
        <div className="mt-1 text-[11px] font-mono text-[#667085] bg-white px-2 py-0.5 rounded-[4px] border border-[#EEEAE3] truncate">
          {tenantId || 'none'}
        </div>
      </div>

      {/* Navigation Links Grouped */}
      <nav className="p-3 space-y-4 flex-1">
        {/* Workspace Section */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#98A2B3] font-semibold">
            Workspace
          </div>
          <div className="space-y-0.5">
            {workspaceItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[7px] text-xs font-medium transition ${
                    isActive
                      ? 'bg-[#E9EEFF] text-[#3157D5] font-semibold'
                      : 'text-[#667085] hover:text-[#172033] hover:bg-[#FBFAF7]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className={isActive ? 'text-[#3157D5]' : 'text-[#667085]'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-[4px] uppercase font-semibold ${
                      isActive
                        ? 'bg-white text-[#3157D5] border border-[#C7D7FE]'
                        : 'bg-[#FBFAF7] text-[#667085] border border-[#E5E1D8]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Administration & Security Section */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-mono uppercase tracking-wider text-[#98A2B3] font-semibold">
            Security & System
          </div>
          <div className="space-y-0.5">
            {adminItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[7px] text-xs font-medium transition ${
                    isActive
                      ? 'bg-[#E9EEFF] text-[#3157D5] font-semibold'
                      : 'text-[#667085] hover:text-[#172033] hover:bg-[#FBFAF7]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className={isActive ? 'text-[#3157D5]' : 'text-[#667085]'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-[4px] uppercase font-semibold ${
                      isActive
                        ? 'bg-white text-[#3157D5] border border-[#C7D7FE]'
                        : 'bg-[#FBFAF7] text-[#667085] border border-[#E5E1D8]'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Security Statement Footer */}
      <div className="p-3 m-3 rounded-[7px] bg-[#E8F6EF] border border-[#C8EBD9] text-xs text-[#238B5A] leading-normal">
        <div className="flex items-center space-x-1.5 font-mono text-[10px] font-bold uppercase tracking-wider mb-0.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#238B5A]" />
          <span>Global Filter Active</span>
        </div>
        <p className="text-[11px] text-[#238B5A]/90">
          EF Core Query Filters enforce <code className="font-mono font-bold text-[#1e6b47]">TenantId</code> per query.
        </p>
      </div>
    </aside>
  );
};
