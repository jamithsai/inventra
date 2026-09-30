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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-2.5">
              <span className="text-sm font-semibold tracking-tight text-slate-900 font-mono uppercase">
                Nexus
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
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
              className="p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            </button>

            {/* Tenant Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setTenantDropdownOpen(!tenantDropdownOpen);
                  setUserDropdownOpen(false);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:border-slate-400 transition text-xs text-slate-800 shadow-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-medium text-slate-900 max-w-[130px] truncate">
                  {currentTenant ? currentTenant.name : 'Select Tenant'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {tenantDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-64 rounded-lg bg-white border border-slate-200 shadow-xl py-1 z-50 animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-mono uppercase tracking-wider text-slate-400">
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
                            isSelected ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <div className="truncate">
                              <div className="truncate font-medium">{t.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">{t.id}</div>
                            </div>
                          </div>
                          <div>
                            {authorized ? (
                              <span className="text-[10px] font-mono text-emerald-600 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
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
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md bg-white border border-slate-300 hover:border-slate-400 transition text-xs text-slate-800 shadow-sm"
              >
                <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center text-[10px] font-medium text-white">
                  {currentUser?.name.charAt(0) || 'U'}
                </div>
                <span className="font-medium text-slate-900 hidden sm:inline truncate max-w-[110px]">
                  {currentUser ? currentUser.name : 'Select User'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-72 rounded-lg bg-white border border-slate-200 shadow-xl py-1 z-50 animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-mono uppercase tracking-wider text-slate-400">
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
                            isSelected ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">{u.name}</span>
                            <span className="text-[10px] font-mono text-slate-500 uppercase">{u.role}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{u.email}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {u.authorizedTenants.map((tId) => (
                              <span key={tId} className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
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
