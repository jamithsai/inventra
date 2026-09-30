import React from 'react';
import { 
  Layers, 
  ShieldCheck, 
  Database, 
  Server, 
  Cloud, 
  Lock, 
  Cpu, 
  ArrowDown, 
  CheckCircle2, 
  KeyRound,
  FileCheck,
  Code2
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Architecture & Isolation Proof</h1>
        <p className="text-xs text-slate-400 mt-1">
          Complete breakdown of multi-tenant isolation across Application, Middleware, API, Database, and S3 Storage layers.
        </p>
      </div>

      {/* Mermaid Architecture Flow Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-6">
        <h3 className="font-semibold text-white text-base flex items-center space-x-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span>End-to-End Tenant Resolution & Isolation Pipeline</span>
        </h3>

        {/* Step-by-Step Pipeline Flow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Step 1 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-800">
              1
            </div>
            <div className="font-bold text-xs text-slate-200">React Client</div>
            <div className="text-[10px] font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded">
              X-Tenant-ID
            </div>
            <p className="text-[11px] text-slate-400">
              Sends selected tenant header & auth credentials.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-800">
              2
            </div>
            <div className="font-bold text-xs text-slate-200">Tenant Middleware</div>
            <div className="text-[10px] font-mono text-indigo-300 bg-slate-900 px-2 py-0.5 rounded">
              TenantResolution
            </div>
            <p className="text-[11px] text-slate-400">
              Checks DB membership. Blocks unauthenticated/unauthorized spoofing.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-sky-950 text-sky-400 flex items-center justify-center font-bold text-xs border border-sky-800">
              3
            </div>
            <div className="font-bold text-xs text-slate-200">Scoped Context</div>
            <div className="text-[10px] font-mono text-sky-300 bg-slate-900 px-2 py-0.5 rounded">
              ITenantContext
            </div>
            <p className="text-[11px] text-slate-400">
              Injects current validated TenantId across ASP.NET DI lifecycle.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-800">
              4
            </div>
            <div className="font-bold text-xs text-slate-200">EF Core Filter</div>
            <div className="text-[10px] font-mono text-emerald-300 bg-slate-900 px-2 py-0.5 rounded">
              HasQueryFilter
            </div>
            <p className="text-[11px] text-slate-400">
              Automatically appends <code className="text-emerald-400">TenantId == CurrentTenantId</code> to all queries.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-teal-950 text-teal-400 flex items-center justify-center font-bold text-xs border border-teal-800">
              5
            </div>
            <div className="font-bold text-xs text-slate-200">SQL Database</div>
            <div className="text-[10px] font-mono text-teal-300 bg-slate-900 px-2 py-0.5 rounded">
              Tenant Tables
            </div>
            <p className="text-[11px] text-slate-400">
              Every table stores TenantId with indexes for high-speed querying.
            </p>
          </div>

          {/* Step 6 */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-amber-950 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-800">
              6
            </div>
            <div className="font-bold text-xs text-slate-200">AWS S3 Storage</div>
            <div className="text-[10px] font-mono text-amber-300 bg-slate-900 px-2 py-0.5 rounded">
              /tenants/{'{id}'}/...
            </div>
            <p className="text-[11px] text-slate-400">
              Object keys derived strictly from server tenant context.
            </p>
          </div>
        </div>
      </div>

      {/* The 6 Isolation Pillars Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pillar 1 & 2 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-sm">
            <Server className="w-4 h-4" />
            <span>1. Middleware & API Level Isolation</span>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              • <strong className="text-white">Zero Trust on Header:</strong> The header <code className="text-cyan-300">X-Tenant-ID</code> is treated merely as a request intent.
            </p>
            <p>
              • <strong className="text-white">Cryptographic Membership Check:</strong> <code className="text-cyan-300">TenantResolutionMiddleware</code> intercepts all incoming HTTP calls, queries user tenant memberships, and immediately halts with <code className="text-rose-400">403 Forbidden</code> if the user lacks access.
            </p>
            <p>
              • <strong className="text-white">Scoped Dependency Injection:</strong> <code className="text-cyan-300">ITenantContext</code> is registered as a scoped service in ASP.NET Core DI, guaranteeing thread-safe, per-request tenant propagation.
            </p>
          </div>
        </div>

        {/* Pillar 3 & 4 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
            <Database className="w-4 h-4" />
            <span>2. EF Core Data Access & Query Filter Isolation</span>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              • <strong className="text-white">Automatic Query Rewriting:</strong> EF Core <code className="text-emerald-300">HasQueryFilter(e =&gt; e.TenantId == _tenantContext.CurrentTenantId)</code> applies to every entity query without developer intervention.
            </p>
            <p>
              • <strong className="text-white">Protection Against IDOR:</strong> Direct queries like <code className="text-emerald-300">_context.InventoryItems.FindAsync(id)</code> evaluate to <code className="text-emerald-300">WHERE Id = @id AND TenantId = @currentTenant</code>, making foreign tenant data invisible and inaccessible.
            </p>
            <p>
              • <strong className="text-white">Mutation Guard:</strong> <code className="text-emerald-300">SaveChangesAsync</code> automatically assigns <code className="text-emerald-300">TenantId</code> on entity creation and rejects cross-tenant modification.
            </p>
          </div>
        </div>

        {/* Pillar 5 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
            <Cloud className="w-4 h-4" />
            <span>3. AWS S3 File Storage Isolation</span>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              • <strong className="text-white">Deterministic S3 Prefixes:</strong> All file storage operations use structured S3 paths: <code className="text-amber-300">tenants/{'{tenantId}'}/products/{'{fileName}'}</code>.
            </p>
            <p>
              • <strong className="text-white">Clean Abstraction:</strong> <code className="text-amber-300">IFileStorageService</code> resolves the tenant ID exclusively from <code className="text-amber-300">ITenantContext</code>, preventing clients from supplying custom prefixes.
            </p>
            <p>
              • <strong className="text-white">Dual Implementation:</strong> Includes production <code className="text-amber-300">S3FileStorageService</code> (Amazon.S3 SDK) with automatic Local File Storage fallback for offline hackathon environments.
            </p>
          </div>
        </div>

        {/* Pillar 6 */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>4. Frontend & Audit Trail Isolation</span>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              • <strong className="text-white">Complete Data Invalidation on Switch:</strong> Switching tenants triggers a clean cache wipe and executes new authenticated network queries with the fresh tenant header.
            </p>
            <p>
              • <strong className="text-white">Tenant-Scoped Audit Logging:</strong> Operational events (stock changes, item additions, security blocks) are committed with <code className="text-indigo-300">TenantId</code> and query-filtered per tenant.
            </p>
            <p>
              • <strong className="text-white">Live Attack Harness:</strong> Dedicated security panel allows judge-verifiable real-time simulation of IDOR, header spoofing, and file traversal attacks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
