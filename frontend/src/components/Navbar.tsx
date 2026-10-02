import React, { useState } from 'react';
import { 
  Building2, 
  ChevronDown, 
  RotateCw, 
  Check, 
  Layers, 
  LogOut, 
  Radio,
  Users,
  Briefcase,
  Wifi,
  WifiOff
} from 'lucide-react';
import type { Tenant, User, UserPresence } from '../types';

interface NavbarProps {
  currentTenant: Tenant | null;
  authorizedTenants: Tenant[];
  currentUser: User | null;
  onSelectTenant: (tenantId: string) => void;
  onLogout: () => void;
  loading: boolean;
  onRefresh: () => void;
  isRealtimeConnected?: boolean;
  activeUsersCount?: number;
  activeUsers?: UserPresence[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTenant,
  authorizedTenants,
  currentUser,
  onSelectTenant,
  onLogout,
  loading,
  onRefresh,
  isRealtimeConnected = false,
  activeUsersCount = 1,
  activeUsers = [],
}) => {
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [presenceDropdownOpen, setPresenceDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E1D8] shadow-[0_1px_2px_rgba(23,32,51,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-[6px] bg-[#3157D5] flex items-center justify-center text-white shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold tracking-tight text-[#172033]">
                Inventra
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[#E9EEFF] text-[#3157D5] border border-[#C7D7FE] font-medium">
                Multi-Tenant
              </span>
            </div>
          </div>

          {/* Right Actions: Real-time Sync Status, Tenant Selector, Refresh, User Profile Menu */}
          <div className="flex items-center space-x-2.5">
            {/* Real-time SignalR Live Presence Pill */}
            <div className="relative">
              <button
                onClick={() => {
                  setPresenceDropdownOpen(!presenceDropdownOpen);
                  setTenantDropdownOpen(false);
                  setUserMenuOpen(false);
                }}
                title={isRealtimeConnected ? `Live Sync Active (${activeUsersCount} active collaborators)` : 'Connecting to real-time sync...'}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-[7px] border text-xs transition cursor-pointer ${
                  isRealtimeConnected 
                    ? 'bg-[#EBFDF3] border-[#A6F4C5] text-[#027A48] hover:bg-[#DCFCE7]' 
                    : 'bg-[#FFF9EB] border-[#FEDF89] text-[#B54708] hover:bg-[#FEF0C7]'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-[#12B76A]' : 'bg-[#F79009]'}`} />
                  {isRealtimeConnected && (
                    <span className="absolute w-2 h-2 rounded-full bg-[#12B76A] animate-ping opacity-75" />
                  )}
                </div>
                <span className="font-semibold text-[11px] hidden md:inline">
                  {isRealtimeConnected ? 'Live Sync' : 'Connecting'}
                </span>
                {isRealtimeConnected && (
                  <span className="text-[10px] font-mono bg-white/70 px-1 py-0.2 rounded text-[#027A48] border border-[#A6F4C5] font-bold">
                    {activeUsersCount}
                  </span>
                )}
              </button>

              {/* Collaborators Active Presence Popover */}
              {presenceDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-[9px] bg-white border border-[#E5E1D8] shadow-[0_4px_16px_rgba(23,32,51,0.08)] py-1.5 z-50 animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 border-b border-[#EEEAE3] flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#98A2B3] flex items-center gap-1">
                      <Radio className="w-3 h-3 text-[#12B76A]" />
                      <span>Live Presence</span>
                    </span>
                    <span className="text-[10px] font-mono text-[#027A48] bg-[#EBFDF3] px-1.5 py-0.5 rounded font-semibold">
                      {isRealtimeConnected ? 'SignalR Active' : 'Offline'}
                    </span>
                  </div>
                  
                  <div className="px-3 py-2 text-xs text-[#667085] border-b border-[#EEEAE3]">
                    Active team members in <strong className="text-[#172033] font-semibold">{currentTenant?.name}</strong>:
                  </div>

                  <div className="max-h-48 overflow-y-auto py-1 divide-y divide-[#F4F1EA]">
                    {activeUsers.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-[#667085] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#98A2B3]" />
                        <span>1 user online (You)</span>
                      </div>
                    ) : (
                      activeUsers.map((user) => (
                        <div key={user.userId} className="px-3 py-2 flex items-center justify-between text-xs hover:bg-[#FBFAF7]">
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-[#E9EEFF] text-[#3157D5] font-bold text-[9px] flex items-center justify-center">
                              {user.userName ? user.userName.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="truncate">
                              <div className="font-medium text-[#172033] truncate">{user.userName}</div>
                              <div className="text-[10px] font-mono text-[#98A2B3] truncate">{user.email}</div>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-[#F4F1EA] text-[#667085] font-medium uppercase">
                            {user.role}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Refresh Data Button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Data"
              className="p-2 rounded-[7px] text-[#667085] hover:text-[#172033] hover:bg-[#FBFAF7] transition border border-transparent hover:border-[#E5E1D8] cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3157D5]' : ''}`} />
            </button>

            {/* Tenant / Workspace Selector Dropdown (Filtered to Authorized Workspaces) */}
            <div className="relative">
              <button
                onClick={() => {
                  setTenantDropdownOpen(!tenantDropdownOpen);
                  setUserMenuOpen(false);
                  setPresenceDropdownOpen(false);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-[7px] bg-[#FBFAF7] hover:bg-white border border-[#E5E1D8] transition text-xs text-[#172033] cursor-pointer"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#238B5A]" />
                <Building2 className="w-3.5 h-3.5 text-[#667085]" />
                <span className="font-medium text-[#172033] max-w-[130px] truncate">
                  {currentTenant ? currentTenant.name : 'Select Workspace'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#98A2B3]" />
              </button>

              {tenantDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-[9px] bg-white border border-[#E5E1D8] shadow-[0_4px_16px_rgba(23,32,51,0.08)] py-1 z-50 animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 border-b border-[#EEEAE3] text-[10px] font-mono uppercase tracking-wider text-[#98A2B3] flex items-center justify-between">
                    <span>Authorized Workspaces</span>
                    <span className="text-[9px] bg-[#E9EEFF] text-[#3157D5] px-1.5 py-0.2 rounded font-bold">
                      {authorizedTenants.length}
                    </span>
                  </div>
                  <div className="py-1">
                    {authorizedTenants.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-[#667085]">No authorized workspaces found.</div>
                    ) : (
                      authorizedTenants.map((t) => {
                        const isSelected = currentTenant?.id === t.id;

                        return (
                          <button
                            key={t.id}
                            onClick={() => {
                              onSelectTenant(t.id);
                              setTenantDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition cursor-pointer ${
                              isSelected ? 'bg-[#E9EEFF] text-[#3157D5] font-medium' : 'text-[#172033] hover:bg-[#FBFAF7]'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#238B5A]" />
                              <div className="truncate">
                                <div className="truncate font-medium">{t.name}</div>
                                <div className="text-[10px] font-mono text-[#98A2B3]">{t.id}</div>
                              </div>
                            </div>
                            <div>
                              {isSelected && (
                                <span className="text-[10px] font-mono text-[#3157D5] flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Authenticated User Profile Menu & Sign Out */}
            <div className="relative">
              <button
                onClick={() => {
                  setUserMenuOpen(!userMenuOpen);
                  setTenantDropdownOpen(false);
                  setPresenceDropdownOpen(false);
                }}
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-[7px] bg-[#FBFAF7] hover:bg-white border border-[#E5E1D8] transition text-xs text-[#172033] cursor-pointer"
              >
                <div className="w-5 h-5 rounded-[5px] bg-[#3157D5] flex items-center justify-center text-[10px] font-bold text-white shadow-2xs">
                  {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="font-medium text-[#172033] hidden sm:inline truncate max-w-[120px]">
                  {currentUser ? currentUser.name : 'Account'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#98A2B3]" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-72 rounded-[9px] bg-white border border-[#E5E1D8] shadow-[0_4px_20px_rgba(23,32,51,0.08)] py-1.5 z-50 animate-in fade-in duration-100 divide-y divide-[#EEEAE3]">
                  {/* User Profile Header */}
                  <div className="px-3.5 py-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#172033]">{currentUser?.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#E9EEFF] text-[#3157D5] border border-[#C7D7FE] font-bold uppercase">
                        {currentUser?.role || 'USER'}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#667085] truncate">
                      {currentUser?.email}
                    </div>
                    <div className="text-[10px] font-mono text-[#98A2B3]">
                      User ID: {currentUser?.id}
                    </div>
                  </div>

                  {/* Authorized Workspaces section */}
                  <div className="px-3.5 py-2 space-y-1.5">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#98A2B3] flex items-center space-x-1">
                      <Briefcase className="w-3 h-3" />
                      <span>Authorized Tenants</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {currentUser?.authorizedTenants.map((tId) => (
                        <span key={tId} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FBFAF7] text-[#172033] border border-[#E5E1D8]">
                          {tId}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sign Out Action */}
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#D9383A] hover:bg-[#FDECEC] rounded-[6px] transition flex items-center space-x-2 font-medium cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-[#D9383A]" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
