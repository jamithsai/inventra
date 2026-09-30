import React, { useState } from 'react';
import { 
  Building2, 
  ChevronDown, 
  RotateCw, 
  Check, 
  Lock,
  Layers
} from 'lucide-react';
import type { Tenant, User } from '../types';

interface NavbarProps {
  currentTenant: Tenant | null;
  allTenants: Tenant[];
  currentUser: User | null;
  allUsers: User[];
  onSelectTenant: (tenantId: string) => void;
  onSelectUser: (userId: string) => void;
  loading: boolean;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTenant,
  allTenants,
  currentUser,
  allUsers,
  onSelectTenant,
  onSelectUser,
  loading,
  onRefresh,
}) => {
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isTenantAuthorized = (tenantId: string) => {
    return currentUser?.authorizedTenants.includes(tenantId);
  };

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
                Nexus
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[#E9EEFF] text-[#3157D5] border border-[#C7D7FE] font-medium">
                Multi-Tenant
              </span>
            </div>
          </div>

          {/* Right Actions: Tenant Selector, User Persona Switcher, Refresh */}
          <div className="flex items-center space-x-2">
            {/* Refresh Data Button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Data"
              className="p-2 rounded-[7px] text-[#667085] hover:text-[#172033] hover:bg-[#FBFAF7] transition border border-transparent hover:border-[#E5E1D8]"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3157D5]' : ''}`} />
            </button>

            {/* Tenant Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setTenantDropdownOpen(!tenantDropdownOpen);
                  setUserDropdownOpen(false);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-[7px] bg-[#FBFAF7] hover:bg-white border border-[#E5E1D8] transition text-xs text-[#172033]"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#238B5A]" />
                <Building2 className="w-3.5 h-3.5 text-[#667085]" />
                <span className="font-medium text-[#172033] max-w-[130px] truncate">
                  {currentTenant ? currentTenant.name : 'Select Organization'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#98A2B3]" />
              </button>

              {tenantDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-[9px] bg-white border border-[#E5E1D8] shadow-[0_4px_16px_rgba(23,32,51,0.08)] py-1 z-50 animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 border-b border-[#EEEAE3] text-[10px] font-mono uppercase tracking-wider text-[#98A2B3]">
                    Switch Organization Context
                  </div>
                  <div className="py-1">
                    {allTenants.map((t) => {
                      const authorized = isTenantAuthorized(t.id);
                      const isSelected = currentTenant?.id === t.id;

                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            onSelectTenant(t.id);
                            setTenantDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition ${
                            isSelected ? 'bg-[#E9EEFF] text-[#3157D5] font-medium' : 'text-[#172033] hover:bg-[#FBFAF7]'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#667085]" />
                            <div className="truncate">
                              <div className="truncate font-medium">{t.name}</div>
                              <div className="text-[10px] font-mono text-[#98A2B3]">{t.id}</div>
                            </div>
                          </div>
                          <div>
                            {authorized ? (
                              <span className="text-[10px] font-mono text-[#238B5A] flex items-center gap-1">
                                <Check className="w-3 h-3" />
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-[#98A2B3] flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* User Persona Switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setUserDropdownOpen(!userDropdownOpen);
                  setTenantDropdownOpen(false);
                }}
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-[7px] bg-[#FBFAF7] hover:bg-white border border-[#E5E1D8] transition text-xs text-[#172033]"
              >
                <div className="w-5 h-5 rounded-[5px] bg-[#3157D5] flex items-center justify-center text-[10px] font-medium text-white">
                  {currentUser?.name.charAt(0) || 'U'}
                </div>
                <span className="font-medium text-[#172033] hidden sm:inline truncate max-w-[110px]">
                  {currentUser ? currentUser.name : 'Select User'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#98A2B3]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-72 rounded-[9px] bg-white border border-[#E5E1D8] shadow-[0_4px_16px_rgba(23,32,51,0.08)] py-1 z-50 animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 border-b border-[#EEEAE3] text-[10px] font-mono uppercase tracking-wider text-[#98A2B3]">
                    Switch User Persona
                  </div>
                  <div className="py-1">
                    {allUsers.map((u) => {
                      const isSelected = currentUser?.id === u.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            onSelectUser(u.id);
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs transition ${
                            isSelected ? 'bg-[#E9EEFF] text-[#3157D5] font-medium' : 'text-[#172033] hover:bg-[#FBFAF7]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-[#172033]">{u.name}</span>
                            <span className="text-[10px] font-mono text-[#667085] uppercase">{u.role}</span>
                          </div>
                          <div className="text-[10px] text-[#98A2B3] font-mono mt-0.5 truncate">{u.email}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {u.authorizedTenants.map((tId) => (
                              <span key={tId} className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#FBFAF7] text-[#667085] border border-[#EEEAE3]">
                                {tId}
                              </span>
                            ))}
                          </div>
                        </button>
                      );
                    })}
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
