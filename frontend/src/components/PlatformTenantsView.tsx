import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  ShieldCheck, 
  Users, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  RefreshCw, 
  ChevronRight, 
  UserCheck, 
  X, 
  Sliders, 
  Filter, 
  Layers, 
  Mail, 
  Phone, 
  Lock, 
  Unlock 
} from 'lucide-react';
import { platformApi } from '../services/api';
import { CreateTenantModal } from './CreateTenantModal';
import type { PlatformTenant, TenantMember } from '../types';

export const PlatformTenantsView: React.FC = () => {
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTenantMembers, setSelectedTenantMembers] = useState<{
    tenant: PlatformTenant;
    members: TenantMember[];
  } | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await platformApi.getAllTenants();
      setTenants(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch platform tenants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = async (tenant: PlatformTenant, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmMsg =
      newStatus === 'SUSPENDED'
        ? `Are you sure you want to SUSPEND "${tenant.name}"? All users under this workspace will be immediately blocked from accessing inventory and storage.`
        : `Activate "${tenant.name}"? Users will immediately regain access.`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoadingId(tenant.id);
    try {
      const updated = await platformApi.updateTenantStatus(tenant.id, newStatus);
      setTenants((prev) =>
        prev.map((t) => (t.id === updated.id ? { ...t, status: updated.status } : t))
      );
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update tenant status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewMembers = async (tenant: PlatformTenant) => {
    setLoadingMembers(true);
    try {
      const members = await platformApi.getTenantMembers(tenant.id);
      setSelectedTenantMembers({ tenant, members });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to fetch tenant members.');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Filtered list
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.industry && t.industry.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL' || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate high level metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === 'ACTIVE').length;
  const suspendedTenants = tenants.filter((t) => t.status === 'SUSPENDED').length;
  const totalUsers = tenants.reduce((acc, t) => acc + (t.userCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-[10px] border border-[#E5E1D8] shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#3157D5] bg-[#E9EEFF] px-2 py-0.5 rounded-[4px]">
              Platform Administration
            </span>
            <span className="text-xs text-[#98A2B3]">•</span>
            <span className="text-xs text-[#667085]">Multi-Tenant Workspaces</span>
          </div>
          <h1 className="text-xl font-bold text-[#172033] mt-1">
            Tenant Directory & Workspace Provisioning
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Administer tenant organizations, isolate database partitions with EF Core Global Filters, and provision new workspaces.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchTenants}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-[#667085] hover:text-[#172033] bg-[#FBFAF7] hover:bg-[#EEEAE3] border border-[#E5E1D8] rounded-[7px] transition"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#3157D5] hover:bg-[#2545B0] text-white text-xs font-bold rounded-[7px] shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Provision New Tenant</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-[10px] border border-[#E5E1D8] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#667085]">Total Organizations</span>
            <Building2 className="w-4 h-4 text-[#3157D5]" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-2">{totalTenants}</div>
          <div className="text-[11px] text-[#98A2B3] mt-0.5">Provisioned workspaces</div>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5E1D8] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#667085]">Active Workspaces</span>
            <CheckCircle2 className="w-4 h-4 text-[#238B5A]" />
          </div>
          <div className="text-2xl font-bold text-[#238B5A] mt-2">{activeTenants}</div>
          <div className="text-[11px] text-[#98A2B3] mt-0.5">Unrestricted tenant access</div>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5E1D8] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#667085]">Suspended Workspaces</span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-2xl font-bold text-[#D97706] mt-2">{suspendedTenants}</div>
          <div className="text-[11px] text-[#98A2B3] mt-0.5">403 Middleware blocked</div>
        </div>

        <div className="bg-white p-4 rounded-[10px] border border-[#E5E1D8] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#667085]">Enterprise Users</span>
            <Users className="w-4 h-4 text-[#7F56D9]" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-2">{totalUsers}</div>
          <div className="text-[11px] text-[#98A2B3] mt-0.5">Associated tenant members</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-[10px] border border-[#E5E1D8]">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, ID, code, industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-[7px] border border-[#E5E1D8] bg-[#FBFAF7] focus:bg-white focus:outline-hidden focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5]"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 bg-[#FBFAF7] p-1 rounded-[7px] border border-[#E5E1D8] self-stretch sm:self-auto">
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1 text-xs font-semibold rounded-[5px] transition ${
                statusFilter === filter
                  ? 'bg-white text-[#172033] shadow-xs font-bold'
                  : 'text-[#667085] hover:text-[#172033]'
              }`}
            >
              {filter === 'ALL' ? 'All Tenants' : filter === 'ACTIVE' ? 'Active' : 'Suspended'}
            </button>
          ))}
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-[10px] border border-[#E5E1D8] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-[#667085] flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#3157D5]" />
            <span>Loading tenant directory...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-[#DC2626] bg-[#FEE2E2]/30">
            {error}
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-8 h-8 text-[#98A2B3] mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#172033]">No tenants found</h3>
            <p className="text-xs text-[#667085] mt-1">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by provisioning your first tenant.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBFAF7] border-b border-[#E5E1D8] text-[11px] font-mono uppercase tracking-wider text-[#667085]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Organization</th>
                  <th className="py-3 px-4 font-semibold">Tenant Slug / ID</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Administrator</th>
                  <th className="py-3 px-4 font-semibold text-center">Workspaces & Products</th>
                  <th className="py-3 px-4 font-semibold">Created</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEAE3]">
                {filteredTenants.map((t) => {
                  const isActionLoading = actionLoadingId === t.id;
                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-[#FBFAF7] transition group cursor-pointer"
                      onClick={() => handleViewMembers(t)}
                    >
                      {/* Organization Name & Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-[5px] bg-[#E9EEFF] border border-[#C7D7FE] flex items-center justify-center text-[#3157D5] font-bold text-[10px] shrink-0 font-mono">
                            {t.code || t.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#172033] flex items-center space-x-1.5">
                              <span>{t.name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#EEEAE3] text-[#667085] rounded">
                                {t.code}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#98A2B3] truncate max-w-xs mt-0.5">
                              {t.industry || t.description || 'Enterprise Workspace'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Slug / Tenant ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <code className="font-mono text-[11px] text-[#3157D5] bg-[#E9EEFF]/60 px-2 py-0.5 rounded border border-[#C7D7FE]/50 font-bold">
                            {t.id}
                          </code>
                          <button
                            onClick={(e) => handleCopyId(t.id, e)}
                            className="p-1 rounded text-[#98A2B3] hover:text-[#172033] hover:bg-[#EEEAE3] transition"
                            title="Copy Tenant ID"
                          >
                            {copiedId === t.id ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {t.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E8F6EF] text-[#238B5A] border border-[#C8EBD9]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#238B5A]"></span>
                            <span>ACTIVE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                            <span>SUSPENDED</span>
                          </span>
                        )}
                      </td>

                      {/* Administrator Info */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-semibold text-[#172033]">
                            {t.initialAdminName || 'Admin Assigned'}
                          </div>
                          <div className="text-[11px] text-[#667085] flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-[#98A2B3]" />
                            <span>{t.initialAdminEmail || 'Configured via Auth'}</span>
                          </div>
                          {t.pendingInvitation && t.pendingInvitation.status === 'PENDING' && (
                            <span className="mt-0.5 inline-block text-[9px] font-mono font-semibold bg-[#FEF3C7] text-[#D97706] px-1.5 py-0.2 rounded border border-[#FDE68A]">
                              Invite Pending Setup
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Counts */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center space-x-3 text-xs">
                          <div className="flex items-center space-x-1 text-[#667085]" title="Assigned Users">
                            <Users className="w-3.5 h-3.5 text-[#98A2B3]" />
                            <span className="font-bold text-[#172033]">{t.userCount}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-[#667085]" title="Inventory Products">
                            <Package className="w-3.5 h-3.5 text-[#98A2B3]" />
                            <span className="font-bold text-[#172033]">{t.productCount}</span>
                          </div>
                        </div>
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-[11px] font-mono text-[#667085]">
                        {new Date(t.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={(e) => handleToggleStatus(t, e)}
                            disabled={isActionLoading}
                            className={`px-2.5 py-1 rounded-[5px] text-[11px] font-semibold transition border ${
                              t.status === 'ACTIVE'
                                ? 'bg-white hover:bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                                : 'bg-white hover:bg-[#E8F6EF] text-[#238B5A] border-[#C8EBD9]'
                            }`}
                            title={t.status === 'ACTIVE' ? 'Suspend Tenant Access' : 'Reactivate Tenant Access'}
                          >
                            {isActionLoading ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : t.status === 'ACTIVE' ? (
                              <span className="flex items-center space-x-1">
                                <Lock className="w-3 h-3" />
                                <span>Suspend</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1">
                                <Unlock className="w-3 h-3" />
                                <span>Activate</span>
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => handleViewMembers(t)}
                            className="p-1 rounded text-[#98A2B3] hover:text-[#172033] hover:bg-[#EEEAE3] transition"
                            title="View Tenant Members"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tenant Members Drawer / Modal */}
      {selectedTenantMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-[10px] border border-[#E5E1D8] shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-[#FBFAF7] border-b border-[#E5E1D8] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#172033]">
                  Workspace Members — {selectedTenantMembers.tenant.name}
                </h3>
                <p className="text-[11px] font-mono text-[#667085] mt-0.5">
                  Tenant ID: <code className="text-[#3157D5] font-bold">{selectedTenantMembers.tenant.id}</code>
                </p>
              </div>
              <button
                onClick={() => setSelectedTenantMembers(null)}
                className="p-1 rounded text-[#98A2B3] hover:text-[#172033] hover:bg-[#EEEAE3]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 max-h-96 overflow-y-auto space-y-3">
              {selectedTenantMembers.members.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#98A2B3]">
                  No authenticated users mapped to this tenant yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTenantMembers.members.map((m) => (
                    <div
                      key={m.userId}
                      className="p-3 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center font-bold text-xs">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#172033]">{m.name}</div>
                          <div className="text-[11px] text-[#667085] font-mono">{m.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#E5E1D8] text-[#172033]">
                          {m.role}
                        </span>
                        <div className="text-[10px] text-[#98A2B3] font-mono mt-0.5">
                          Joined {new Date(m.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-[#FBFAF7] border-t border-[#E5E1D8] flex justify-end">
              <button
                onClick={() => setSelectedTenantMembers(null)}
                className="px-4 py-1.5 rounded-[6px] bg-[#172033] hover:bg-[#2A3756] text-white text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tenant Modal */}
      <CreateTenantModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTenantCreated={fetchTenants}
      />
    </div>
  );
};
