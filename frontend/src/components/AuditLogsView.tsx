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
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
          <PlusCircle className="w-2.5 h-2.5 text-emerald-600" />
          <span>{action}</span>
        </span>
      );
    }
    if (act.includes('UPDATE') || act.includes('STOCK')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200 font-medium">
          <Edit className="w-2.5 h-2.5 text-slate-500" />
          <span>{action}</span>
        </span>
      );
    }
    if (act.includes('DELETE')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200 font-medium">
          <Trash2 className="w-2.5 h-2.5 text-slate-400" />
          <span>{action}</span>
        </span>
      );
    }
    if (act.includes('SECURITY') || act.includes('BLOCKED') || act.includes('ATTACK')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200 font-medium">
          <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
          <span>{action}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200 font-medium">
        <ScrollText className="w-2.5 h-2.5 text-slate-400" />
        <span>{action}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Audit Trail</h1>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-700 border border-slate-200">
              {filteredLogs.length} Events
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable audit log stream filtered for <strong className="text-slate-800 font-medium">{currentTenant?.name}</strong> via EF Core query filter.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Action Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-2.5 py-1.5 rounded-md bg-white border border-slate-300 text-xs text-slate-700 focus:outline-none focus:border-slate-400 shadow-xs"
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
            className="p-2 rounded-md bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition shadow-sm"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-slate-900' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-lg bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 font-mono uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Entity ID</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70 transition">
                  {/* Timestamp */}
                  <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>

                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-700 font-semibold">
                        {log.userName?.charAt(0) || 'U'}
                      </div>
                      <span className="font-semibold text-slate-800">{log.userName}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">{getActionBadge(log.action)}</td>

                  {/* Resource Entity */}
                  <td className="px-4 py-3">
                    <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                      {log.entityType}
                    </span>
                  </td>

                  {/* Entity ID */}
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                    {log.entityId || '—'}
                  </td>

                  {/* Details */}
                  <td className="px-4 py-3 text-slate-700 max-w-md truncate font-mono text-[11px]">
                    {log.details || '—'}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <ScrollText className="w-7 h-7 mx-auto text-slate-300 mb-2" />
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
