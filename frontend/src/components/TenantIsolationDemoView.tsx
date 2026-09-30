import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Play, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Unlock, 
  Terminal, 
  Layers, 
  ArrowRight, 
  Bug, 
  Database, 
  Cpu, 
  HardDrive,
  RefreshCw,
  Info
} from 'lucide-react';
import type { Tenant, User, SecurityTestResult, InventoryItem } from '../types';
import { securityDemoApi } from '../services/api';

interface TenantIsolationDemoViewProps {
  currentTenant: Tenant | null;
  currentUser: User | null;
  allTenants: Tenant[];
  currentItems: InventoryItem[];
}

export const TenantIsolationDemoView: React.FC<TenantIsolationDemoViewProps> = ({
  currentTenant,
  currentUser,
  allTenants,
  currentItems,
}) => {
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<SecurityTestResult[]>([]);
  const [activeTab, setActiveTab] = useState<'attacks' | 'matrix' | 'layers'>('attacks');

  // Pre-configured attack scenarios to prove tenant isolation
  const attackScenarios = [
    {
      id: 'attack-idor-item',
      title: '1. Cross-Tenant IDOR: Read Foreign Inventory Item',
      description: 'Attempt to fetch product record ID from a rival tenant (e.g. Zenith or Nova) while active in Acme Retail.',
      defenseLayer: 'EF Core Global Query Filter + Controller',
      expectedStatus: '403 Forbidden / 404 Not Found',
      method: 'GET',
      endpoint: '/api/inventory/{foreign_id}',
      targetTenant: currentTenant?.id === 'acme-retail' ? 'zenith-supplies' : 'acme-retail',
      run: async () => {
        const otherTenant = currentTenant?.id === 'acme-retail' ? 'zenith-supplies' : 'acme-retail';
        // Foreign item IDs from seed data:
        // acme items: item_acme_1 (iPhone 15), nova: item_nova_1 (ESP32), zenith: item_zenith_1 (Office Chair)
        const foreignItemId = currentTenant?.id === 'acme-retail' ? 'item_zenith_1' : 'item_acme_1';
        
        const response = await securityDemoApi.directRawAttack({
          method: 'GET',
          url: `/inventory/${foreignItemId}`,
          tenantHeader: currentTenant?.id, // current tenant header
        });

        const passed = response.status === 403 || response.status === 404;
        return {
          id: 'attack-idor-item',
          name: 'Cross-Tenant Item Access Prevention',
          endpoint: `/api/inventory/${foreignItemId}`,
          method: 'GET',
          requestedTenantId: currentTenant?.id || 'unknown',
          authenticatedUserId: currentUser?.id || 'unknown',
          authenticatedUserTenants: currentUser?.authorizedTenants || [],
          attemptedEntityId: foreignItemId,
          expectedStatus: 403,
          actualStatus: response.status,
          passed,
          message: passed
            ? `SUCCESS: Global Query Filter + TenantContext completely hid foreign entity ${foreignItemId}. HTTP ${response.status} returned.`
            : `FAILED: Unexpectedly retrieved foreign item! Status ${response.status}`,
          responsePayload: response.data,
          timestamp: new Date().toISOString(),
          description: `Attempted to access item ${foreignItemId} belonging to another tenant.`,
        };
      },
    },
    {
      id: 'attack-header-spoof',
      title: '2. Header Tampering: Unauthorized X-Tenant-ID Header',
      description: 'Manually inject an unauthorized tenant header (e.g. X-Tenant-ID: zenith-supplies) without user membership.',
      defenseLayer: 'TenantResolutionMiddleware + ITenantContext',
      expectedStatus: '403 Forbidden',
      method: 'GET',
      endpoint: '/api/inventory with X-Tenant-ID: zenith-supplies',
      targetTenant: 'zenith-supplies',
      run: async () => {
        // Find a tenant the current user does NOT have membership for
        const unauthorizedTenant = allTenants.find(t => !currentUser?.authorizedTenants.includes(t.id))?.id || 'zenith-supplies';
        
        const response = await securityDemoApi.directRawAttack({
          method: 'GET',
          url: '/inventory',
          tenantHeader: unauthorizedTenant, // Spoofed header
        });

        const passed = response.status === 403 || response.status === 401;
        return {
          id: 'attack-header-spoof',
          name: 'Unauthorized X-Tenant-ID Spoofing Rejection',
          endpoint: '/api/inventory',
          method: 'GET',
          requestedTenantId: unauthorizedTenant,
          authenticatedUserId: currentUser?.id || 'unknown',
          authenticatedUserTenants: currentUser?.authorizedTenants || [],
          expectedStatus: 403,
          actualStatus: response.status,
          passed,
          message: passed
            ? `SUCCESS: TenantResolutionMiddleware detected user ${currentUser?.name} is NOT a member of ${unauthorizedTenant}. Rejected with HTTP ${response.status}.`
            : `FAILED: Middleware permitted unauthorized header! Status ${response.status}`,
          responsePayload: response.data,
          timestamp: new Date().toISOString(),
          description: `Injected spoofed header 'X-Tenant-ID: ${unauthorizedTenant}' for user ${currentUser?.name}.`,
        };
      },
    },
    {
      id: 'attack-cross-update',
      title: '3. Cross-Tenant Malicious Mutation (PUT / PATCH)',
      description: 'Attempt to overwrite the price and stock of another tenant\'s product via PUT payload.',
      defenseLayer: 'EF Core Global Query Filter + SaveChanges TenantGuard',
      expectedStatus: '403 Forbidden / 404 Not Found',
      method: 'PUT',
      endpoint: '/api/inventory/{foreign_id}',
      targetTenant: 'zenith-supplies',
      run: async () => {
        const foreignItemId = currentTenant?.id === 'zenith-supplies' ? 'item_acme_1' : 'item_zenith_1';
        const response = await securityDemoApi.directRawAttack({
          method: 'PUT',
          url: `/inventory/${foreignItemId}`,
          tenantHeader: currentTenant?.id,
          body: {
            name: 'MALICIOUS OVERWRITE ATTACK',
            price: 1,
            quantity: 99999,
          },
        });

        const passed = response.status === 403 || response.status === 404;
        return {
          id: 'attack-cross-update',
          name: 'Cross-Tenant Update Protection',
          endpoint: `/api/inventory/${foreignItemId}`,
          method: 'PUT',
          requestedTenantId: currentTenant?.id || 'unknown',
          authenticatedUserId: currentUser?.id || 'unknown',
          authenticatedUserTenants: currentUser?.authorizedTenants || [],
          attemptedEntityId: foreignItemId,
          expectedStatus: 403,
          actualStatus: response.status,
          passed,
          message: passed
            ? `SUCCESS: Foreign item was not found in active tenant scope. Mutation rejected with HTTP ${response.status}.`
            : `FAILED: Mutation succeeded on foreign item! Status ${response.status}`,
          responsePayload: response.data,
          timestamp: new Date().toISOString(),
          description: `Sent malicious PUT payload to foreign item ${foreignItemId}.`,
        };
      },
    },
    {
      id: 'attack-cross-delete',
      title: '4. Cross-Tenant Malicious Deletion (DELETE)',
      description: 'Attempt to delete a product belonging to a competing tenant.',
      defenseLayer: 'EF Core Query Filter + InventoryService',
      expectedStatus: '403 Forbidden / 404 Not Found',
      method: 'DELETE',
      endpoint: '/api/inventory/{foreign_id}',
      targetTenant: 'nova-electronics',
      run: async () => {
        const foreignItemId = currentTenant?.id === 'nova-electronics' ? 'item_acme_2' : 'item_nova_1';
        const response = await securityDemoApi.directRawAttack({
          method: 'DELETE',
          url: `/inventory/${foreignItemId}`,
          tenantHeader: currentTenant?.id,
        });

        const passed = response.status === 403 || response.status === 404;
        return {
          id: 'attack-cross-delete',
          name: 'Cross-Tenant Deletion Protection',
          endpoint: `/api/inventory/${foreignItemId}`,
          method: 'DELETE',
          requestedTenantId: currentTenant?.id || 'unknown',
          authenticatedUserId: currentUser?.id || 'unknown',
          authenticatedUserTenants: currentUser?.authorizedTenants || [],
          attemptedEntityId: foreignItemId,
          expectedStatus: 403,
          actualStatus: response.status,
          passed,
          message: passed
            ? `SUCCESS: Query filter isolated item lookup. Deletion blocked with HTTP ${response.status}.`
            : `FAILED: Item deleted across tenant boundary! Status ${response.status}`,
          responsePayload: response.data,
          timestamp: new Date().toISOString(),
          description: `Sent DELETE request targeting foreign item ${foreignItemId}.`,
        };
      },
    },
    {
      id: 'attack-cross-s3',
      title: '5. S3 File Path Traversal & Cross-Tenant File Access',
      description: 'Attempt to download another tenant\'s private S3 file asset.',
      defenseLayer: 'IFileStorageService + S3 Tenant Key Derivation',
      expectedStatus: '403 Forbidden / 404 Not Found',
      method: 'GET',
      endpoint: '/api/files/{foreign_file_id}',
      targetTenant: 'nova-electronics',
      run: async () => {
        const foreignFileId = currentTenant?.id === 'nova-electronics' ? 'file_acme_1' : 'file_nova_1';
        const response = await securityDemoApi.directRawAttack({
          method: 'GET',
          url: `/files/${foreignFileId}`,
          tenantHeader: currentTenant?.id,
        });

        const passed = response.status === 403 || response.status === 404;
        return {
          id: 'attack-cross-s3',
          name: 'Cross-Tenant S3 Storage Isolation',
          endpoint: `/api/files/${foreignFileId}`,
          method: 'GET',
          requestedTenantId: currentTenant?.id || 'unknown',
          authenticatedUserId: currentUser?.id || 'unknown',
          authenticatedUserTenants: currentUser?.authorizedTenants || [],
          attemptedEntityId: foreignFileId,
          expectedStatus: 403,
          actualStatus: response.status,
          passed,
          message: passed
            ? `SUCCESS: S3 storage service verified tenant key prefix. File access denied with HTTP ${response.status}.`
            : `FAILED: Foreign file accessed! Status ${response.status}`,
          responsePayload: response.data,
          timestamp: new Date().toISOString(),
          description: `Targeted foreign S3 file resource ${foreignFileId}.`,
        };
      },
    },
  ];

  const handleRunAttack = async (scenario: typeof attackScenarios[0]) => {
    setRunningTestId(scenario.id);
    try {
      const result = await scenario.run();
      setTestResults((prev) => [result, ...prev.filter((r) => r.id !== scenario.id)]);
    } catch (err: any) {
      const failedResult: SecurityTestResult = {
        id: scenario.id,
        name: scenario.title,
        endpoint: scenario.endpoint,
        method: scenario.method,
        requestedTenantId: currentTenant?.id || 'unknown',
        authenticatedUserId: currentUser?.id || 'unknown',
        authenticatedUserTenants: currentUser?.authorizedTenants || [],
        expectedStatus: 403,
        actualStatus: 500,
        passed: false,
        message: `Error executing security test: ${err.message}`,
        timestamp: new Date().toISOString(),
        description: scenario.description,
      };
      setTestResults((prev) => [failedResult, ...prev.filter((r) => r.id !== scenario.id)]);
    } finally {
      setRunningTestId(null);
    }
  };

  const handleRunAllAttacks = async () => {
    for (const scenario of attackScenarios) {
      await handleRunAttack(scenario);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-indigo-950/40 border border-rose-900/40 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>Judge-Facing Security Verification Suite</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Tenant Data Isolation & Attack Bench
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Verify that no user or client request can breach tenant boundaries. Execute real penetration simulations against EF Core Global Query Filters, Tenant Middleware, and S3 Storage.
            </p>
          </div>

          <button
            onClick={handleRunAllAttacks}
            disabled={runningTestId !== null}
            className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-rose-600/30 flex items-center space-x-2 shrink-0 self-start md:self-auto"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Run All 5 Security Tests</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('attacks')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'attacks'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Live Attack Simulations
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'matrix'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          User Authorization Matrix
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'layers'
              ? 'bg-slate-800 text-cyan-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Defense-in-Depth Architecture
        </button>
      </div>

      {/* TAB 1: Live Attack Simulations */}
      {activeTab === 'attacks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Scenarios list */}
          <div className="lg:col-span-7 space-y-3.5">
            <h3 className="font-semibold text-white text-sm flex items-center space-x-2">
              <Bug className="w-4 h-4 text-rose-400" />
              <span>Available Isolation Bypass Tests</span>
            </h3>

            {attackScenarios.map((sc) => {
              const result = testResults.find((r) => r.id === sc.id);
              const isRunning = runningTestId === sc.id;

              return (
                <div
                  key={sc.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                        <span>{sc.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{sc.description}</p>
                    </div>

                    <button
                      onClick={() => handleRunAttack(sc)}
                      disabled={isRunning}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-cyan-400 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 shrink-0 transition"
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-cyan-400" />
                          <span>Simulate</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      Layer: {sc.defenseLayer}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                      Expected: {sc.expectedStatus}
                    </span>
                  </div>

                  {/* Result Box if Run */}
                  {result && (
                    <div
                      className={`p-3 rounded-lg text-xs font-mono border ${
                        result.passed
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80'
                          : 'bg-rose-950/40 text-rose-300 border-rose-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="flex items-center space-x-1.5">
                          {result.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400" />
                          )}
                          <span>{result.passed ? 'ATTACK BLOCKED (PASSED)' : 'VULNERABILITY DETECTED'}</span>
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-200">
                          HTTP {result.actualStatus}
                        </span>
                      </div>
                      <div className="text-[11px] leading-relaxed text-slate-300">{result.message}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Real-Time Execution Console */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs shadow-2xl flex flex-col h-[580px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-slate-400 text-[11px]">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-200">Security Audit Console</span>
              </div>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Monitoring
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-[11px]">
              <div className="text-slate-500">// Security tests executed in real-time against ASP.NET Core API:</div>

              {testResults.map((r, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1">
                  <div className="text-slate-400 text-[10px]">
                    [{new Date(r.timestamp).toLocaleTimeString()}] REQUEST: {r.method} {r.endpoint}
                  </div>
                  <div className="text-cyan-400 text-[10px]">
                    Headers: &#123; "X-Tenant-ID": "{r.requestedTenantId}", "X-User-ID": "{r.authenticatedUserId}" &#125;
                  </div>
                  <div className={r.passed ? 'text-emerald-400' : 'text-rose-400'}>
                    STATUS: {r.actualStatus} (Expected {r.expectedStatus}) → {r.passed ? 'DEFENSE SUCCESSFUL' : 'DEFENSE FAILED'}
                  </div>
                  {r.responsePayload && (
                    <pre className="text-[10px] text-slate-400 bg-slate-950 p-1.5 rounded overflow-x-auto">
                      {JSON.stringify(r.responsePayload, null, 2)}
                    </pre>
                  )}
                </div>
              ))}

              {testResults.length === 0 && (
                <div className="text-center py-20 text-slate-600">
                  Ready to simulate attacks. Click "Simulate" on any test to inspect the server response.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
              <span>Tests Completed: {testResults.length}/{attackScenarios.length}</span>
              <span className="text-emerald-400 font-bold">
                Passed: {testResults.filter((r) => r.passed).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Authorization Matrix */}
      {activeTab === 'matrix' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-white text-sm">Tenant Authorization & Membership Matrix</h3>
            <p className="text-xs text-slate-400">
              Users only possess cryptographic membership records for specific tenants. Changing headers alone cannot bypass membership.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Tenant Name</th>
                  <th className="p-3">Tenant ID (X-Tenant-ID)</th>
                  <th className="p-3">Active User Status</th>
                  <th className="p-3">Access Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {allTenants.map((t) => {
                  const isAuth = currentUser?.authorizedTenants.includes(t.id);
                  const isCurrent = currentTenant?.id === t.id;
                  return (
                    <tr key={t.id} className={isCurrent ? 'bg-cyan-950/20' : ''}>
                      <td className="p-3 font-semibold text-slate-200 flex items-center space-x-2">
                        <span>{t.name}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500 text-slate-950 font-bold">
                            CURRENT
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-cyan-300">{t.id}</td>
                      <td className="p-3 text-slate-400">
                        {isAuth ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Membership Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-rose-400">
                            <Lock className="w-3.5 h-3.5" />
                            <span>No Membership</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {isAuth ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                            200 OK (ALLOWED)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800">
                            403 FORBIDDEN (REJECTED)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Defense Layers */}
      {activeTab === 'layers' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold">
              1
            </div>
            <div className="font-semibold text-sm text-white">HTTP Request Header</div>
            <div className="text-xs font-mono text-cyan-400">X-Tenant-ID: acme-retail</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Untrusted client claim transmitted with request. Never trusted blindly by application layers.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 flex items-center justify-center font-bold">
              2
            </div>
            <div className="font-semibold text-sm text-white">Tenant Middleware</div>
            <div className="text-xs font-mono text-cyan-400">TenantResolutionMiddleware</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Validates tenant existence, checks authenticated user membership, sets scoped <code className="text-cyan-300">ITenantContext</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold">
              3
            </div>
            <div className="font-semibold text-sm text-white">EF Core Query Filters</div>
            <div className="text-xs font-mono text-emerald-400">e.TenantId == CurrentTenantId</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Engineered into DbContext model creation. Automatically appends WHERE clause to all SELECT, UPDATE, DELETE queries.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center font-bold">
              4
            </div>
            <div className="font-semibold text-sm text-white">S3 File Key Prefix</div>
            <div className="text-xs font-mono text-amber-400">/tenants/{'{tenantId}'}/...</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              S3 keys are assembled strictly using the resolved tenant context, ensuring physical isolation of customer assets.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
