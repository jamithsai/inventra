import React, { useState } from 'react';
import { 
  ScrollText, 
  ShieldCheck, 
  User, 
  Clock, 
  Filter, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit,
  PlusCircle,
  FolderLock
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
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
          <PlusCircle className="w-3 h-3" />
          <span>{action}</span>
        </span>
      );
    }
    if (act.includes('UPDATE') || act.includes('STOCK')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800">
          <Edit className="w-3 h-3" />
          <span>{action}</span>
        </span>
      );
    }
    if (act.includes('DELETE')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800">
          <Trash2 className="w-3 h-3" />
          <span>{action}</span>
        </span>
      );
    }
    if (act.includes('SECURITY') || act.includes('BLOCKED') || act.includes('ATTACK')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-700 animate-pulse">
          <AlertTriangle className="w-3 h-3" />
          <span>{action}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        <ScrollText className="w-3 h-3" />
        <span>{action}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Tenant Audit Trail</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
              {filteredLogs.length} Events
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable audit logs filtered for <strong className="text-slate-200">{currentTenant?.name}</strong> via EF Core query filter.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Action Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Event Types</option>
              <option value="Product">Product Actions</option>
              <option value="Stock">Stock Changes</option>
              <option value="File">File Operations</option>
              <option value="Security">Security Interceptions</option>
            </select>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5">Resource Entity</th>
                <th className="px-4 py-3.5">Entity ID</th>
                <th className="px-5 py-3.5">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  {/* Timestamp */}
                  <td className="px-5 py-3.5 font-mono text-slate-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>

                  {/* User */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-cyan-400 font-bold">
                        {log.userName?.charAt(0) || 'U'}
                      </div>
                      <span className="font-medium text-slate-200">{log.userName}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3.5">{getActionBadge(log.action)}</td>

                  {/* Resource Entity */}
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-slate-800 text-slate-300">
                      {log.entityType}
                    </span>
                  </td>

                  {/* Entity ID */}
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-400">
                    {log.entityId || 'N/A'}
                  </td>

                  {/* Details */}
                  <td className="px-5 py-3.5 text-slate-300 max-w-md truncate">
                    {log.details || '—'}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <ScrollText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
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
