import React from 'react';
import { 
  Building2, 
  User as UserIcon, 
  ShieldCheck, 
  ChevronDown, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Lock
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
  const [tenantDropdownOpen, setTenantDropdownOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);

  const isTenantAuthorized = (tenantId: string) => {
    return currentUser?.authorizedTenants.includes(tenantId);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  NEXUS
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60">
                  Multi-Tenant
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                EF Core Query Filters • Tenant Middleware • S3 Isolation
              </p>
            </div>
          </div>

          {/* Right Actions: Tenant Selector, User Persona Switcher, Refresh */}
          <div className="flex items-center space-x-3">
            {/* Refresh Data Button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              title="Refresh Data"
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Tenant Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setTenantDropdownOpen(!tenantDropdownOpen);
                  setUserDropdownOpen(false);
                }}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 hover:border-slate-600 hover:bg-slate-750 transition text-sm text-slate-200"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <Building2 className="w-4 h-4 text-cyan-400" />
                <div className="text-left">
                  <div className="text-xs text-slate-400 font-mono leading-none">TENANT</div>
                  <div className="font-semibold text-slate-100 leading-tight">
                    {currentTenant ? currentTenant.name : 'Select Tenant'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {tenantDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                    <span>Switch Tenant Context</span>
                    <span className="font-mono text-[10px] text-slate-400">X-Tenant-ID Header</span>
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
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-700/60 transition ${
                            isSelected ? 'bg-cyan-950/40 text-cyan-300 font-medium' : 'text-slate-200'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                            }`}>
                              {t.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{t.name}</div>
                              <div className="text-xs font-mono text-slate-400">{t.id}</div>
                            </div>
                          </div>
                          <div>
                            {authorized ? (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-400 border border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Allowed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] bg-rose-950 text-rose-400 border border-rose-800">
                                <Lock className="w-3 h-3" />
                                <span>Forbidden</span>
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-3 pt-2 border-t border-slate-700/80 text-[11px] text-slate-400 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Middleware rejects unauthorized tenant headers</span>
                  </div>
                </div>
              )}
            </div>

            {/* User Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setUserDropdownOpen(!userDropdownOpen);
                  setTenantDropdownOpen(false);
                }}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 hover:border-slate-600 hover:bg-slate-750 transition text-sm text-slate-200"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow">
                  {currentUser?.name.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs text-slate-400 font-mono leading-none">{currentUser?.role || 'USER'}</div>
                  <div className="font-semibold text-slate-100 leading-tight">
                    {currentUser ? currentUser.name : 'Select User'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-1.5 border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Demo User Persona (Permissions)
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
                          className={`w-full text-left px-3 py-2.5 flex items-start space-x-3 hover:bg-slate-700/60 transition ${
                            isSelected ? 'bg-indigo-950/40 border-l-2 border-indigo-400' : ''
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-700 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                            {u.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-100">{u.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-700 text-slate-300">
                                {u.role}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 truncate">{u.email}</div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {u.authorizedTenants.map((tId) => (
                                <span
                                  key={tId}
                                  className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800"
                                >
                                  ✓ {tId}
                                </span>
                              ))}
                            </div>
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
