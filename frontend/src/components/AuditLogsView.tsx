import React, { useState } from 'react';
import { 
  ScrollText, 
  Filter, 
  RefreshCw, 
  AlertTriangle,
  Trash2,
  Edit,
  PlusCircle
} from 'lucide-react';
import type { AuditLog, Tenant } from '../types';

interface AuditLogsViewProps {
  logs: AuditLog[];
  currentTenant: Tenant | null;
  loading: boolean;
  onRefresh: () => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({
  logs,
  currentTenant,
  loading,
  onRefresh,
}) => {
  const [filterAction, setFilterAction] = useState('ALL');

  const filteredLogs = React.useMemo(() => {
    if (filterAction === 'ALL') return logs;
    return logs.filter((l) => l.action.toLowerCase().includes(filterAction.toLowerCase()));
  }, [logs, filterAction]);

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('ADD')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[5px] text-[10px] font-mono bg-[#E8F6EF] text-[#1E7E51] border border-[#BDE5D2] font-semibold">
          <PlusCircle className="w-2.5 h-2.5 text-[#1E7E51]" />
          <span>{action}</span>
        </span>
      );
    }
    if (act.includes('UPDATE') || act.includes('STOCK')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[5px] text-[10px] font-mono bg-[#E9EEFF] text-[#3157D5] border border-[#D5E0FF] font-semibold">
          <Edit className="w-2.5 h-2.5 text-[#3157D5]" />
          <span>{action}</span>
        </span>
      );
    }
    if (act.includes('DELETE')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[5px] text-[10px] font-mono bg-[#FDECEC] text-[#D9383A] border border-[#F9C5C5] font-semibold">
          <Trash2 className="w-2.5 h-2.5 text-[#D9383A]" />
          <span>{action}</span>
        </span>
      );
    }
    if (act.includes('SECURITY') || act.includes('BLOCKED') || act.includes('ATTACK')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[5px] text-[10px] font-mono bg-[#FDECEC] text-[#D9383A] border border-[#F9C5C5] font-bold">
          <AlertTriangle className="w-2.5 h-2.5 text-[#D9383A]" />
          <span>{action}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[5px] text-[10px] font-mono bg-[#FBFAF7] text-[#667085] border border-[#E5E1D8] font-medium">
        <ScrollText className="w-2.5 h-2.5 text-[#98A2B3]" />
        <span>{action}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E1D8]">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">Audit Trail</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-[6px] font-mono bg-[#FBFAF7] text-[#172033] border border-[#E5E1D8] font-medium">
              {filteredLogs.length} Events
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-1">
            Immutable audit log stream strictly isolated for <strong className="text-[#172033] font-semibold">{currentTenant?.name}</strong> via EF Core query filter.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Action Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-[#98A2B3]" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-2.5 py-1.5 rounded-[7px] bg-white border border-[#E5E1D8] text-xs text-[#172033] focus:outline-none focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5] shadow-xs font-medium"
            >
              <option value="ALL">All Event Types</option>
              <option value="Product">Product Actions</option>
              <option value="Stock">Stock Changes</option>
              <option value="File">File Operations</option>
              <option value="Security">Security Events</option>
            </select>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-[7px] bg-white hover:bg-[#FBFAF7] text-[#667085] hover:text-[#172033] border border-[#E5E1D8] transition shadow-xs"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3157D5]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-[9px] bg-white border border-[#E5E1D8] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FBFAF7] border-b border-[#E5E1D8] text-[11px] text-[#667085] font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Entity ID</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEAE3]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#FBFAF7] transition-colors">
                  {/* Timestamp */}
                  <td className="px-4 py-3 font-mono text-[#667085] whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>

                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded-full bg-[#E9EEFF] border border-[#D5E0FF] flex items-center justify-center text-[10px] text-[#3157D5] font-bold">
                        {log.userName?.charAt(0) || 'U'}
                      </div>
                      <span className="font-semibold text-[#172033]">{log.userName}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">{getActionBadge(log.action)}</td>

                  {/* Resource Entity */}
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-[4px] font-mono text-[10px] bg-[#FBFAF7] text-[#172033] border border-[#E5E1D8] font-medium">
                      {log.entityType}
                    </span>
                  </td>

                  {/* Entity ID */}
                  <td className="px-4 py-3 font-mono text-[11px] text-[#667085]">
                    {log.entityId || '—'}
                  </td>

                  {/* Details */}
                  <td className="px-4 py-3 text-[#172033] max-w-md truncate font-mono text-[11px]">
                    {log.details || '—'}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#98A2B3]">
                    <ScrollText className="w-7 h-7 mx-auto text-[#D5E0FF] mb-2" />
                    No audit records recorded yet for this tenant.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
