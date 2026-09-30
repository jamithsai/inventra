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
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center text-zinc-100 shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2.5">
              <span className="text-sm font-semibold tracking-tight text-zinc-100 font-mono uppercase">
                Nexus
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                Multi-Tenant
              </span>
            </div>
          </div>

          {/* Right Actions: Tenant Selector, User Persona Switcher, Refresh */}
          <div className="flex items-center space-x-2.5">
            {/* Refresh Data Button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Data"
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition border border-transparent hover:border-zinc-800"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-zinc-200' : ''}`} />
            </button>

            {/* Tenant Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setTenantDropdownOpen(!tenantDropdownOpen);
                  setUserDropdownOpen(false);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition text-xs text-zinc-200"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-medium text-zinc-100 max-w-[120px] truncate">
                  {currentTenant ? currentTenant.name : 'Select Tenant'}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>

              {tenantDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl py-1 z-50 animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 border-b border-zinc-800/80 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    Switch Tenant Context
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
                            isSelected ? 'bg-zinc-800 text-zinc-100 font-medium' : 'text-zinc-300 hover:bg-zinc-800/60'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                            <div className="truncate">
                              <div className="truncate font-medium">{t.name}</div>
                              <div className="text-[10px] font-mono text-zinc-500">{t.id}</div>
                            </div>
                          </div>
                          <div>
                            {authorized ? (
                              <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                                <Check className="w-3 h-3 text-zinc-400" />
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                                <Lock className="w-3 h-3 text-zinc-600" />
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
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition text-xs text-zinc-200"
              >
                <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-[10px] font-semibold text-zinc-200">
                  {currentUser?.name.charAt(0) || 'U'}
                </div>
                <span className="font-medium text-zinc-200 hidden sm:inline truncate max-w-[100px]">
                  {currentUser ? currentUser.name : 'Select User'}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-72 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl py-1 z-50 animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 border-b border-zinc-800/80 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
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
                            isSelected ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{u.name}</span>
                            <span className="text-[10px] font-mono text-zinc-500 uppercase">{u.role}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">{u.email}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {u.authorizedTenants.map((tId) => (
                              <span key={tId} className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
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
