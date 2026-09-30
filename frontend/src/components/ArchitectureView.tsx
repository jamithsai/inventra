import React from 'react';
import { 
  Layers, 
  ShieldCheck, 
  Database, 
  Server, 
  Cloud
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Architecture & Isolation Proof</h1>
        <p className="text-xs text-slate-500 mt-1">
          Technical specifications for tenant isolation across Application, Middleware, API, Database, and S3 Storage tiers.
        </p>
      </div>

      {/* End-to-End Resolution Pipeline */}
      <div className="rounded-lg bg-white border border-slate-200 p-6 shadow-sm space-y-5">
        <h3 className="font-semibold text-slate-900 text-xs flex items-center space-x-2">
          <Layers className="w-4 h-4 text-slate-700" />
          <span>Tenant Resolution & Isolation Pipeline</span>
        </h3>

        {/* Step-by-Step Pipeline Flow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Step 1 */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col items-center text-center space-y-1.5">
            <div className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center font-mono font-bold text-xs border border-slate-300 shadow-xs">
              1
            </div>
            <div className="font-semibold text-xs text-slate-900">React Client</div>
            <div className="text-[10px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              X-Tenant-ID
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Sends selected tenant header & auth credentials.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col items-center text-center space-y-1.5">
            <div className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center font-mono font-bold text-xs border border-slate-300 shadow-xs">
              2
            </div>
            <div className="font-semibold text-xs text-slate-900">Middleware</div>
            <div className="text-[10px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              Resolution
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Checks DB membership. Blocks unverified requests.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col items-center text-center space-y-1.5">
            <div className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center font-mono font-bold text-xs border border-slate-300 shadow-xs">
              3
            </div>
            <div className="font-semibold text-xs text-slate-900">Scoped Context</div>
            <div className="text-[10px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              ITenantContext
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Injects validated TenantId across ASP.NET DI lifecycle.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col items-center text-center space-y-1.5">
            <div className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center font-mono font-bold text-xs border border-slate-300 shadow-xs">
              4
            </div>
            <div className="font-semibold text-xs text-slate-900">EF Core Filter</div>
            <div className="text-[10px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              Query Filter
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Appends <code className="text-slate-800 font-mono">TenantId == CurrentTenantId</code> to all queries.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col items-center text-center space-y-1.5">
            <div className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center font-mono font-bold text-xs border border-slate-300 shadow-xs">
              5
            </div>
            <div className="font-semibold text-xs text-slate-900">Database</div>
            <div className="text-[10px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              SQL Indexes
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Every table stores TenantId with indexes for fast query execution.
            </p>
          </div>

          {/* Step 6 */}
          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col items-center text-center space-y-1.5">
            <div className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center font-mono font-bold text-xs border border-slate-300 shadow-xs">
              6
            </div>
            <div className="font-semibold text-xs text-slate-900">AWS S3</div>
            <div className="text-[10px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              /tenants/{'{id}'}
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              Object keys derived strictly from server tenant context.
            </p>
          </div>
        </div>
      </div>

      {/* The 4 Isolation Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pillar 1 */}
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs">
            <Server className="w-4 h-4 text-slate-700" />
            <span>1. Middleware & API Level Isolation</span>
          </div>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              • <strong className="text-slate-900">Zero Trust Header:</strong> The header <code className="text-slate-800 font-mono">X-Tenant-ID</code> is treated merely as a request intent.
            </p>
            <p>
              • <strong className="text-slate-900">Cryptographic Membership Check:</strong> <code className="text-slate-800 font-mono">TenantResolutionMiddleware</code> intercepts all incoming HTTP calls, queries user tenant memberships, and immediately halts with <code className="text-rose-600 font-mono">403 Forbidden</code> if the user lacks access.
            </p>
            <p>
              • <strong className="text-slate-900">Scoped Dependency Injection:</strong> <code className="text-slate-800 font-mono">ITenantContext</code> is registered as a scoped service in ASP.NET Core DI, guaranteeing thread-safe, per-request tenant propagation.
            </p>
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs">
            <Database className="w-4 h-4 text-slate-700" />
            <span>2. EF Core Data Access & Query Filter Isolation</span>
          </div>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              • <strong className="text-slate-900">Automatic Query Rewriting:</strong> EF Core <code className="text-slate-800 font-mono">HasQueryFilter(e =&gt; e.TenantId == _tenantContext.CurrentTenantId)</code> applies to every entity query without developer intervention.
            </p>
            <p>
              • <strong className="text-slate-900">Protection Against IDOR:</strong> Direct queries like <code className="text-slate-800 font-mono">_context.InventoryItems.FindAsync(id)</code> evaluate to <code className="text-slate-800 font-mono">WHERE Id = @id AND TenantId = @currentTenant</code>, making foreign tenant data invisible and inaccessible.
            </p>
            <p>
              • <strong className="text-slate-900">Mutation Guard:</strong> <code className="text-slate-800 font-mono">SaveChangesAsync</code> automatically assigns <code className="text-slate-800 font-mono">TenantId</code> on entity creation and rejects cross-tenant modification.
            </p>
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs">
            <Cloud className="w-4 h-4 text-slate-700" />
            <span>3. AWS S3 File Storage Isolation</span>
          </div>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              • <strong className="text-slate-900">Deterministic S3 Prefixes:</strong> All file storage operations use structured S3 paths: <code className="text-slate-800 font-mono">tenants/{'{tenantId}'}/products/{'{fileName}'}</code>.
            </p>
            <p>
              • <strong className="text-slate-900">Clean Abstraction:</strong> <code className="text-slate-800 font-mono">IFileStorageService</code> resolves the tenant ID exclusively from <code className="text-slate-800 font-mono">ITenantContext</code>, preventing clients from supplying custom prefixes.
            </p>
            <p>
              • <strong className="text-slate-900">Dual Implementation:</strong> Includes production <code className="text-slate-800 font-mono">S3FileStorageService</code> (Amazon.S3 SDK) with automatic Local File Storage fallback for offline environments.
            </p>
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="p-5 rounded-lg bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <span>4. Frontend & Audit Trail Isolation</span>
          </div>
          <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <p>
              • <strong className="text-slate-900">Data Invalidation on Switch:</strong> Switching tenants triggers an immediate state purge and executes new authenticated network queries with the fresh tenant header.
            </p>
            <p>
              • <strong className="text-slate-900">Tenant-Scoped Audit Logging:</strong> Operational events (stock changes, item additions, security blocks) are committed with <code className="text-slate-800 font-mono">TenantId</code> and query-filtered per tenant.
            </p>
            <p>
              • <strong className="text-slate-900">Security Harness:</strong> Dedicated security panel allows judge-verifiable real-time simulation of IDOR, header spoofing, and file traversal attacks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
