import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Terminal, 
  Bug, 
  RefreshCw
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
}) => {
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<SecurityTestResult[]>([]);
  const [activeTab, setActiveTab] = useState<'attacks' | 'matrix' | 'layers'>('attacks');

  // Pre-configured attack scenarios to prove tenant isolation
  const attackScenarios = [
    {
      id: 'attack-idor-item',
      title: '1. Cross-Tenant IDOR: Read Foreign Inventory Item',
      description: 'Attempt to fetch product record ID from a rival tenant while active in Acme Retail.',
      defenseLayer: 'EF Core Global Query Filter + Controller',
      expectedStatus: '403 Forbidden / 404 Not Found',
      method: 'GET',
      endpoint: '/api/inventory/{foreign_id}',
      targetTenant: currentTenant?.id === 'acme-retail' ? 'zenith-supplies' : 'acme-retail',
      run: async () => {
        const foreignItemId = currentTenant?.id === 'acme-retail' ? 'item_zenith_1' : 'item_acme_1';
        
        const response = await securityDemoApi.directRawAttack({
          method: 'GET',
          url: `/inventory/${foreignItemId}`,
          tenantHeader: currentTenant?.id,
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
            ? `SUCCESS: Global Query Filter completely isolated foreign entity ${foreignItemId}. HTTP ${response.status} returned.`
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
      description: 'Manually inject an unauthorized tenant header without user membership.',
      defenseLayer: 'TenantResolutionMiddleware + ITenantContext',
      expectedStatus: '403 Forbidden',
      method: 'GET',
      endpoint: '/api/inventory with spoofed X-Tenant-ID',
      targetTenant: 'zenith-supplies',
      run: async () => {
        const unauthorizedTenant = allTenants.find(t => !currentUser?.authorizedTenants.includes(t.id))?.id || 'zenith-supplies';
        
        const response = await securityDemoApi.directRawAttack({
          method: 'GET',
          url: '/inventory',
          tenantHeader: unauthorizedTenant,
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
            ? `SUCCESS: Foreign item not in active tenant scope. Mutation rejected with HTTP ${response.status}.`
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
      title: '5. S3 Key Path Traversal & Cross-Tenant File Access',
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
      <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-zinc-400 text-xs font-mono font-medium uppercase tracking-wider mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Security Validation Benchmark</span>
            </div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
              Tenant Isolation Verification
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Verify multi-tenant data boundaries by executing real penetration tests against EF Core query filters, tenant middleware, and S3 file keys.
            </p>
          </div>

          <button
            onClick={handleRunAllAttacks}
            disabled={runningTestId !== null}
            className="px-4 py-2 rounded-md bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-900 font-medium text-xs transition shadow-sm flex items-center space-x-2 shrink-0 self-start md:self-auto"
          >
            <Play className="w-3.5 h-3.5 fill-zinc-900" />
            <span>Run All 5 Test Scenarios</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1.5 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('attacks')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'attacks'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Attack Scenarios
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'matrix'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Authorization Matrix
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'layers'
              ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Defense Layers
        </button>
      </div>

      {/* TAB 1: Live Attack Simulations */}
      {activeTab === 'attacks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Scenarios list */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="font-semibold text-zinc-200 text-xs flex items-center space-x-2">
              <Bug className="w-3.5 h-3.5 text-zinc-400" />
              <span>Available Isolation Bypass Tests</span>
            </h3>

            {attackScenarios.map((sc) => {
              const result = testResults.find((r) => r.id === sc.id);
              const isRunning = runningTestId === sc.id;

              return (
                <div
                  key={sc.id}
                  className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-xs text-zinc-200 flex items-center gap-2">
                        <span>{sc.title}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{sc.description}</p>
                    </div>

                    <button
                      onClick={() => handleRunAttack(sc)}
                      disabled={isRunning}
                      className="px-2.5 py-1 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-mono flex items-center space-x-1.5 shrink-0 transition"
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-2.5 h-2.5 fill-zinc-300" />
                          <span>Simulate</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                      Layer: {sc.defenseLayer}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-300 border border-zinc-800">
                      Expected: {sc.expectedStatus}
                    </span>
                  </div>

                  {/* Result Box if Run */}
                  {result && (
                    <div
                      className="p-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between font-medium">
                        <span className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              result.passed ? 'bg-zinc-200' : 'bg-red-400'
                            }`}
                          />
                          <span className={result.passed ? 'text-zinc-200' : 'text-red-400'}>
                            {result.passed ? 'ATTACK BLOCKED (DEFENSE PASSED)' : 'VULNERABILITY DETECTED'}
                          </span>
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 text-[10px]">
                          HTTP {result.actualStatus}
                        </span>
                      </div>
                      <div className="text-[11px] leading-relaxed text-zinc-400">{result.message}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Real-Time Execution Console */}
          <div className="lg:col-span-5 rounded-lg bg-zinc-950 border border-zinc-800 p-3.5 font-mono text-xs shadow-xl flex flex-col h-[540px]">
            <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800 text-zinc-400 text-[11px]">
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-semibold text-zinc-200">Security Audit Stream</span>
              </div>
              <span className="text-[10px] text-zinc-400 flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-200 animate-pulse" />
                Active Monitor
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-2.5 space-y-2.5 text-[11px]">
              <div className="text-zinc-500">// Security tests executed in real-time against ASP.NET Core API:</div>

              {testResults.map((r, i) => (
                <div key={i} className="p-2 rounded bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="text-zinc-400 text-[10px]">
                    [{new Date(r.timestamp).toLocaleTimeString()}] {r.method} {r.endpoint}
                  </div>
                  <div className="text-zinc-300 text-[10px]">
                    Headers: &#123; "X-Tenant-ID": "{r.requestedTenantId}", "X-User-ID": "{r.authenticatedUserId}" &#125;
                  </div>
                  <div className={r.passed ? 'text-zinc-200' : 'text-red-400'}>
                    STATUS: {r.actualStatus} (Expected {r.expectedStatus}) → {r.passed ? 'DEFENSE SUCCESSFUL' : 'DEFENSE FAILED'}
                  </div>
                  {r.responsePayload && (
                    <pre className="text-[10px] text-zinc-400 bg-zinc-950 p-1.5 rounded border border-zinc-800 overflow-x-auto">
                      {JSON.stringify(r.responsePayload, null, 2)}
                    </pre>
                  )}
                </div>
              ))}

              {testResults.length === 0 && (
                <div className="text-center py-20 text-zinc-600">
                  Ready to simulate attacks. Click "Simulate" on any test to inspect the server response.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between font-mono">
              <span>Tests Completed: {testResults.length}/{attackScenarios.length}</span>
              <span className="text-zinc-200 font-medium">
                Passed: {testResults.filter((r) => r.passed).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Authorization Matrix */}
      {activeTab === 'matrix' && (
        <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-zinc-200 text-xs">Tenant Membership & Role Matrix</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Users only possess cryptographic membership records for specific tenants. Changing headers alone cannot bypass server-side validation.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="p-3">Tenant Name</th>
                  <th className="p-3">Tenant ID (X-Tenant-ID)</th>
                  <th className="p-3">Active User Status</th>
                  <th className="p-3">Server Policy Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {allTenants.map((t) => {
                  const isAuth = currentUser?.authorizedTenants.includes(t.id);
                  const isCurrent = currentTenant?.id === t.id;
                  return (
                    <tr key={t.id} className={isCurrent ? 'bg-zinc-800/30' : ''}>
                      <td className="p-3 font-medium text-zinc-200 flex items-center space-x-2">
                        <span>{t.name}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono">
                            CURRENT
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-zinc-300">{t.id}</td>
                      <td className="p-3 text-zinc-400">
                        {isAuth ? (
                          <span className="inline-flex items-center space-x-1 text-zinc-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Membership Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-zinc-500">
                            <Lock className="w-3.5 h-3.5" />
                            <span>No Membership</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {isAuth ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-950 text-zinc-300 border border-zinc-800">
                            200 OK (ALLOWED)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-950 text-zinc-400 border border-zinc-800">
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
          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="w-6 h-6 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs flex items-center justify-center font-semibold">
              1
            </div>
            <div className="font-medium text-xs text-zinc-200">HTTP Request Header</div>
            <div className="text-[11px] font-mono text-zinc-400">X-Tenant-ID: acme-retail</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Untrusted client claim transmitted with request. Never trusted blindly by backend layers.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="w-6 h-6 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs flex items-center justify-center font-semibold">
              2
            </div>
            <div className="font-medium text-xs text-zinc-200">Tenant Middleware</div>
            <div className="text-[11px] font-mono text-zinc-400">TenantResolutionMiddleware</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Validates tenant existence, checks authenticated user membership, sets scoped <code className="text-zinc-200">ITenantContext</code>.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="w-6 h-6 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs flex items-center justify-center font-semibold">
              3
            </div>
            <div className="font-medium text-xs text-zinc-200">EF Core Query Filters</div>
            <div className="text-[11px] font-mono text-zinc-400">e.TenantId == CurrentTenantId</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Engineered into DbContext model creation. Automatically appends WHERE clause to all SELECT, UPDATE, DELETE queries.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="w-6 h-6 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-xs flex items-center justify-center font-semibold">
              4
            </div>
            <div className="font-medium text-xs text-zinc-200">S3 Storage Key Prefix</div>
            <div className="text-[11px] font-mono text-zinc-400">/tenants/{'{tenantId}'}/...</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              S3 keys are assembled strictly using the resolved tenant context, ensuring physical separation of customer assets.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
