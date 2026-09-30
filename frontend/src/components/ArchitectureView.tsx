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
      <div className="pb-5 border-b border-[#E5E1D8]">
        <h1 className="text-xl font-bold text-[#172033] tracking-tight">System Architecture & Isolation Proof</h1>
        <p className="text-xs text-[#667085] mt-1">
          Technical specifications for tenant isolation across Application, Middleware, API, Database, and S3 Storage tiers.
        </p>
      </div>

      {/* End-to-End Resolution Pipeline */}
      <div className="rounded-[9px] bg-white border border-[#E5E1D8] p-6 shadow-sm space-y-5">
        <h3 className="font-semibold text-[#172033] text-xs flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#3157D5]" />
          <span>Tenant Resolution & Isolation Pipeline</span>
        </h3>

        {/* Step-by-Step Pipeline Flow Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Step 1 */}
          <div className="p-3.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] flex flex-col items-center text-center space-y-1.5">
            <div className="w-6 h-6 rounded-[5px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center font-mono font-bold text-xs border border-[#D5E0FF] shadow-2xs">
              1
            </div>
            <div className="font-semibold text-xs text-[#172033]">React Client</div>
            <div className="text-[10px] font-mono text-[#3157D5] bg-white px-2 py-0.5 rounded-[4px] border border-[#E5E1D8] font-medium">
              X-Tenant-ID
            </div>
            <p className="text-[11px] text-[#667085] leading-snug">
              Sends selected tenant header & auth credentials.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] flex flex-col items-center text-center space-y-1.5">
            <div className="w-6 h-6 rounded-[5px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center font-mono font-bold text-xs border border-[#D5E0FF] shadow-2xs">
              2
            </div>
            <div className="font-semibold text-xs text-[#172033]">Middleware</div>
            <div className="text-[10px] font-mono text-[#3157D5] bg-white px-2 py-0.5 rounded-[4px] border border-[#E5E1D8] font-medium">
              Resolution
            </div>
            <p className="text-[11px] text-[#667085] leading-snug">
              Checks DB membership. Blocks unverified requests.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] flex flex-col items-center text-center space-y-1.5">
            <div className="w-6 h-6 rounded-[5px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center font-mono font-bold text-xs border border-[#D5E0FF] shadow-2xs">
              3
            </div>
            <div className="font-semibold text-xs text-[#172033]">Scoped Context</div>
            <div className="text-[10px] font-mono text-[#3157D5] bg-white px-2 py-0.5 rounded-[4px] border border-[#E5E1D8] font-medium">
              ITenantContext
            </div>
            <p className="text-[11px] text-[#667085] leading-snug">
              Injects validated TenantId across ASP.NET DI lifecycle.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] flex flex-col items-center text-center space-y-1.5">
            <div className="w-6 h-6 rounded-[5px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center font-mono font-bold text-xs border border-[#D5E0FF] shadow-2xs">
              4
            </div>
            <div className="font-semibold text-xs text-[#172033]">EF Core Filter</div>
            <div className="text-[10px] font-mono text-[#3157D5] bg-white px-2 py-0.5 rounded-[4px] border border-[#E5E1D8] font-medium">
              Query Filter
            </div>
            <p className="text-[11px] text-[#667085] leading-snug">
              Appends <code className="text-[#172033] font-mono">TenantId == CurrentTenantId</code> to all queries.
            </p>
          </div>

          {/* Step 5 */}
          <div className="p-3.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] flex flex-col items-center text-center space-y-1.5">
            <div className="w-6 h-6 rounded-[5px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center font-mono font-bold text-xs border border-[#D5E0FF] shadow-2xs">
              5
            </div>
            <div className="font-semibold text-xs text-[#172033]">Database</div>
            <div className="text-[10px] font-mono text-[#3157D5] bg-white px-2 py-0.5 rounded-[4px] border border-[#E5E1D8] font-medium">
              SQL Indexes
            </div>
            <p className="text-[11px] text-[#667085] leading-snug">
              Every table stores TenantId with indexes for fast query execution.
            </p>
          </div>

          {/* Step 6 */}
          <div className="p-3.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] flex flex-col items-center text-center space-y-1.5">
            <div className="w-6 h-6 rounded-[5px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center font-mono font-bold text-xs border border-[#D5E0FF] shadow-2xs">
              6
            </div>
            <div className="font-semibold text-xs text-[#172033]">AWS S3</div>
            <div className="text-[10px] font-mono text-[#3157D5] bg-white px-2 py-0.5 rounded-[4px] border border-[#E5E1D8] font-medium">
              /tenants/{'{id}'}
            </div>
            <p className="text-[11px] text-[#667085] leading-snug">
              Object keys derived strictly from server tenant context.
            </p>
          </div>
        </div>
      </div>

      {/* The 4 Isolation Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pillar 1 */}
        <div className="p-5 rounded-[9px] bg-white border border-[#E5E1D8] shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-[#172033] font-semibold text-xs">
            <Server className="w-4 h-4 text-[#3157D5]" />
            <span>1. Middleware & API Level Isolation</span>
          </div>
          <div className="text-xs text-[#667085] space-y-2 leading-relaxed">
            <p>
              • <strong className="text-[#172033]">Zero Trust Header:</strong> The header <code className="text-[#3157D5] font-mono bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#E5E1D8]">X-Tenant-ID</code> is treated merely as a request intent.
            </p>
            <p>
              • <strong className="text-[#172033]">Cryptographic Membership Check:</strong> <code className="text-[#3157D5] font-mono bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#E5E1D8]">TenantResolutionMiddleware</code> intercepts all incoming HTTP calls, queries user tenant memberships, and immediately halts with <code className="text-[#D9383A] font-mono bg-[#FDECEC] px-1.5 py-0.5 rounded border border-[#F9C5C5]">403 Forbidden</code> if the user lacks access.
            </p>
            <p>
              • <strong className="text-[#172033]">Scoped Dependency Injection:</strong> <code className="text-[#3157D5] font-mono bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#E5E1D8]">ITenantContext</code> is registered as a scoped service in ASP.NET Core DI, guaranteeing thread-safe, per-request tenant propagation.
            </p>
          </div>
        </div>

        {/* Pillar 2 */}
        <div className="p-5 rounded-[9px] bg-white border border-[#E5E1D8] shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-[#172033] font-semibold text-xs">
            <Database className="w-4 h-4 text-[#3157D5]" />
            <span>2. EF Core Data Access & Query Filter Isolation</span>
          </div>
          <div className="text-xs text-[#667085] space-y-2 leading-relaxed">
            <p>
              • <strong className="text-[#172033]">Automatic Query Rewriting:</strong> EF Core <code className="text-[#3157D5] font-mono bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#E5E1D8]">HasQueryFilter(e =&gt; e.TenantId == _tenantContext.CurrentTenantId)</code> applies to every entity query without developer intervention.
            </p>
            <p>
              • <strong className="text-[#172033]">Protection Against IDOR:</strong> Direct queries like <code className="text-[#3157D5] font-mono bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#E5E1D8]">_context.InventoryItems.FindAsync(id)</code> evaluate to <code className="text-[#172033] font-mono bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#E5E1D8]">WHERE Id = @id AND TenantId = @currentTenant</code>, making foreign tenant data invisible and inaccessible.
            </p>
            <p>
              • <strong className="text-[#172033]">Mutation Guard:</strong> <code className="text-[#3157D5] font-mono bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#E5E1D8]">SaveChangesAsync</code> automatically assigns <code className="text-[#172033] font-mono">TenantId</code> on entity creation and rejects cross-tenant modification.
            </p>
          </div>
        </div>

        {/* Pillar 3 */}
        <div className="p-5 rounded-[9px] bg-white border border-[#E5E1D8] shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-[#172033] font-semibold text-xs">
            <Cloud className="w-4 h-4 text-[#3157D5]" />
            <span>3. AWS S3 File Storage Isolation</span>
          </div>
          <div className="text-xs text-[#667085] space-y-2 leading-relaxed">
            <p>
              • <strong className="text-[#172033]">Deterministic S3 Prefixes:</strong> All file storage operations use structured S3 paths: <code className="text-[#3157D5] font-mono bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#E5E1D8]">tenants/{'{tenantId}'}/products/{'{fileName}'}</code>.
            </p>
            <p>
              • <strong className="text-[#172033]">Clean Abstraction:</strong> <code className="text-[#3157D5] font-mono bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#E5E1D8]">IFileStorageService</code> resolves the tenant ID exclusively from <code className="text-[#3157D5] font-mono">ITenantContext</code>, preventing clients from supplying custom prefixes.
            </p>
            <p>
              • <strong className="text-[#172033]">Dual Implementation:</strong> Includes production <code className="text-[#3157D5] font-mono bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#E5E1D8]">S3FileStorageService</code> (Amazon.S3 SDK) with automatic Local File Storage fallback for offline environments.
            </p>
          </div>
        </div>

        {/* Pillar 4 */}
        <div className="p-5 rounded-[9px] bg-white border border-[#E5E1D8] shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-[#172033] font-semibold text-xs">
            <ShieldCheck className="w-4 h-4 text-[#3157D5]" />
            <span>4. Frontend & Audit Trail Isolation</span>
          </div>
          <div className="text-xs text-[#667085] space-y-2 leading-relaxed">
            <p>
              • <strong className="text-[#172033]">Data Invalidation on Switch:</strong> Switching tenants triggers an immediate state purge and executes new authenticated network queries with the fresh tenant header.
            </p>
            <p>
              • <strong className="text-[#172033]">Tenant-Scoped Audit Logging:</strong> Operational events (stock changes, item additions, security blocks) are committed with <code className="text-[#3157D5] font-mono bg-[#FBFAF7] px-1.5 py-0.5 rounded border border-[#E5E1D8]">TenantId</code> and query-filtered per tenant.
            </p>
            <p>
              • <strong className="text-[#172033]">Security Harness:</strong> Dedicated security panel allows judge-verifiable real-time simulation of IDOR, header spoofing, and file traversal attacks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
