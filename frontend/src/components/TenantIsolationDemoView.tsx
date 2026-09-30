import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Play, 
  CheckCircle2, 
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
      <div className="rounded-[9px] bg-white border border-[#E5E1D8] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-[#3157D5] text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <ShieldAlert className="w-4 h-4 text-[#3157D5]" />
              <span>Security Validation Benchmark</span>
            </div>
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">
              Tenant Isolation Verification
            </h1>
            <p className="text-xs text-[#667085] mt-1 max-w-2xl leading-relaxed">
              Verify multi-tenant data boundaries by executing real penetration tests against EF Core query filters, tenant middleware, and S3 file keys.
            </p>
          </div>

          <button
            onClick={handleRunAllAttacks}
            disabled={runningTestId !== null}
            className="px-4 py-2 rounded-[7px] bg-[#3157D5] hover:bg-[#2648BE] disabled:opacity-40 text-white font-medium text-xs transition shadow-sm flex items-center space-x-2 shrink-0 self-start md:self-auto"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Run All 5 Test Scenarios</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-[#E5E1D8] pb-2">
        <button
          onClick={() => setActiveTab('attacks')}
          className={`px-3 py-1.5 rounded-[7px] text-xs font-medium transition ${
            activeTab === 'attacks'
              ? 'bg-[#3157D5] text-white shadow-xs'
              : 'text-[#667085] hover:text-[#172033] hover:bg-[#FBFAF7]'
          }`}
        >
          Attack Scenarios
        </button>
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-3 py-1.5 rounded-[7px] text-xs font-medium transition ${
            activeTab === 'matrix'
              ? 'bg-[#3157D5] text-white shadow-xs'
              : 'text-[#667085] hover:text-[#172033] hover:bg-[#FBFAF7]'
          }`}
        >
          Authorization Matrix
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`px-3 py-1.5 rounded-[7px] text-xs font-medium transition ${
            activeTab === 'layers'
              ? 'bg-[#3157D5] text-white shadow-xs'
              : 'text-[#667085] hover:text-[#172033] hover:bg-[#FBFAF7]'
          }`}
        >
          Defense Layers
        </button>
      </div>

      {/* TAB 1: Live Attack Simulations */}
      {activeTab === 'attacks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Scenarios list */}
          <div className="lg:col-span-7 space-y-3.5">
            <h3 className="font-semibold text-[#172033] text-xs flex items-center space-x-2">
              <Bug className="w-3.5 h-3.5 text-[#3157D5]" />
              <span>Available Isolation Bypass Tests</span>
            </h3>

            {attackScenarios.map((sc) => {
              const result = testResults.find((r) => r.id === sc.id);
              const isRunning = runningTestId === sc.id;

              return (
                <div
                  key={sc.id}
                  className="p-4 rounded-[9px] bg-white border border-[#E5E1D8] shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-xs text-[#172033] flex items-center gap-2">
                        <span>{sc.title}</span>
                      </div>
                      <p className="text-xs text-[#667085] mt-0.5 leading-relaxed">{sc.description}</p>
                    </div>

                    <button
                      onClick={() => handleRunAttack(sc)}
                      disabled={isRunning}
                      className="px-3 py-1.5 rounded-[7px] bg-white hover:bg-[#FBFAF7] text-[#172033] border border-[#E5E1D8] text-xs font-mono flex items-center space-x-1.5 shrink-0 transition shadow-xs font-medium"
                    >
                      {isRunning ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin text-[#3157D5]" />
                          <span>Testing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-2.5 h-2.5 fill-[#3157D5] text-[#3157D5]" />
                          <span>Simulate</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded-[5px] bg-[#FBFAF7] text-[#667085] border border-[#E5E1D8]">
                      Layer: {sc.defenseLayer}
                    </span>
                    <span className="px-2 py-0.5 rounded-[5px] bg-[#FBFAF7] text-[#172033] border border-[#E5E1D8] font-semibold">
                      Expected: {sc.expectedStatus}
                    </span>
                  </div>

                  {/* Result Box if Run */}
                  {result && (
                    <div
                      className={`p-3 rounded-[7px] border text-xs font-mono space-y-1 ${
                        result.passed
                          ? 'bg-[#E8F6EF] text-[#1E7E51] border-[#BDE5D2]'
                          : 'bg-[#FDECEC] text-[#D9383A] border-[#F9C5C5]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              result.passed ? 'bg-[#1E7E51]' : 'bg-[#D9383A]'
                            }`}
                          />
                          <span>
                            {result.passed ? 'ATTACK BLOCKED (DEFENSE PASSED)' : 'VULNERABILITY DETECTED'}
                          </span>
                        </span>
                        <span className="px-1.5 py-0.5 rounded-[4px] bg-white text-[#172033] border border-[#E5E1D8] text-[10px]">
                          HTTP {result.actualStatus}
                        </span>
                      </div>
                      <div className="text-[11px] leading-relaxed mt-1">{result.message}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right: Real-Time Execution Console */}
          <div className="lg:col-span-5 rounded-[9px] bg-[#172033] border border-[#263554] p-4 font-mono text-xs shadow-lg flex flex-col h-[560px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#263554] text-[#98A2B3] text-[11px]">
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-[#3157D5]" />
                <span className="font-semibold text-white">Security Audit Stream</span>
              </div>
              <span className="text-[10px] text-[#34D399] flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" />
                Active Monitor
              </span>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3 text-[11px]">
              <div className="text-[#98A2B3]">// Security tests executed in real-time against ASP.NET Core API:</div>

              {testResults.map((r, i) => (
                <div key={i} className="p-2.5 rounded-[6px] bg-[#0E1524] border border-[#263554] space-y-1">
                  <div className="text-[#98A2B3] text-[10px]">
                    [{new Date(r.timestamp).toLocaleTimeString()}] {r.method} {r.endpoint}
                  </div>
                  <div className="text-[#CBD5E1] text-[10px]">
                    Headers: &#123; "X-Tenant-ID": "{r.requestedTenantId}", "X-User-ID": "{r.authenticatedUserId}" &#125;
                  </div>
                  <div className={r.passed ? 'text-[#34D399] font-semibold' : 'text-[#F87171] font-semibold'}>
                    STATUS: {r.actualStatus} (Expected {r.expectedStatus}) → {r.passed ? 'DEFENSE SUCCESSFUL' : 'DEFENSE FAILED'}
                  </div>
                  {r.responsePayload && (
                    <pre className="text-[10px] text-[#94A3B8] bg-[#172033]/80 p-1.5 rounded border border-[#263554] overflow-x-auto">
                      {JSON.stringify(r.responsePayload, null, 2)}
                    </pre>
                  )}
                </div>
              ))}

              {testResults.length === 0 && (
                <div className="text-center py-20 text-[#64748B]">
                  Ready to simulate attacks. Click "Simulate" on any test to inspect the server response.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#263554] text-[10px] text-[#98A2B3] flex justify-between font-mono">
              <span>Tests Completed: {testResults.length}/{attackScenarios.length}</span>
              <span className="text-[#34D399] font-semibold">
                Passed: {testResults.filter((r) => r.passed).length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Authorization Matrix */}
      {activeTab === 'matrix' && (
        <div className="rounded-[9px] bg-white border border-[#E5E1D8] p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-[#172033] text-xs">Tenant Membership & Role Matrix</h3>
            <p className="text-xs text-[#667085] mt-0.5">
              Users only possess cryptographic membership records for specific tenants. Changing headers alone cannot bypass server-side validation.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBFAF7] text-[#667085] uppercase font-mono text-[10px] border-b border-[#E5E1D8]">
                <tr>
                  <th className="p-3">Tenant Name</th>
                  <th className="p-3">Tenant ID (X-Tenant-ID)</th>
                  <th className="p-3">Active User Status</th>
                  <th className="p-3">Server Policy Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEAE3]">
                {allTenants.map((t) => {
                  const isAuth = currentUser?.authorizedTenants.includes(t.id);
                  const isCurrent = currentTenant?.id === t.id;
                  return (
                    <tr key={t.id} className={isCurrent ? 'bg-[#F7F5F0]' : 'hover:bg-[#FBFAF7] transition-colors'}>
                      <td className="p-3 font-semibold text-[#172033] flex items-center space-x-2">
                        <span>{t.name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-[4px] text-[10px] bg-[#E9EEFF] text-[#3157D5] border border-[#D5E0FF] font-mono font-bold">
                            CURRENT
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[#667085]">{t.id}</td>
                      <td className="p-3 text-[#172033]">
                        {isAuth ? (
                          <span className="inline-flex items-center space-x-1 text-[#1E7E51] font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7E51]" />
                            <span>Membership Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[#98A2B3]">
                            <Lock className="w-3.5 h-3.5" />
                            <span>No Membership</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {isAuth ? (
                          <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-mono bg-[#E8F6EF] text-[#1E7E51] border border-[#BDE5D2] font-semibold">
                            200 OK (ALLOWED)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-mono bg-[#FDECEC] text-[#D9383A] border border-[#F9C5C5] font-semibold">
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
          <div className="p-4 rounded-[9px] bg-white border border-[#E5E1D8] shadow-sm space-y-2">
            <div className="w-6 h-6 rounded-[5px] bg-[#E9EEFF] border border-[#D5E0FF] text-[#3157D5] font-mono text-xs flex items-center justify-center font-bold">
              1
            </div>
            <div className="font-semibold text-xs text-[#172033]">HTTP Request Header</div>
            <div className="text-[11px] font-mono text-[#3157D5]">X-Tenant-ID: acme-retail</div>
            <p className="text-xs text-[#667085] leading-relaxed">
              Untrusted client claim transmitted with request. Never trusted blindly by backend layers.
            </p>
          </div>

          <div className="p-4 rounded-[9px] bg-white border border-[#E5E1D8] shadow-sm space-y-2">
            <div className="w-6 h-6 rounded-[5px] bg-[#E9EEFF] border border-[#D5E0FF] text-[#3157D5] font-mono text-xs flex items-center justify-center font-bold">
              2
            </div>
            <div className="font-semibold text-xs text-[#172033]">Tenant Middleware</div>
            <div className="text-[11px] font-mono text-[#3157D5]">TenantResolutionMiddleware</div>
            <p className="text-xs text-[#667085] leading-relaxed">
              Validates tenant existence, checks authenticated user membership, sets scoped <code className="text-[#172033] font-medium font-mono">ITenantContext</code>.
            </p>
          </div>

          <div className="p-4 rounded-[9px] bg-white border border-[#E5E1D8] shadow-sm space-y-2">
            <div className="w-6 h-6 rounded-[5px] bg-[#E9EEFF] border border-[#D5E0FF] text-[#3157D5] font-mono text-xs flex items-center justify-center font-bold">
              3
            </div>
            <div className="font-semibold text-xs text-[#172033]">EF Core Query Filters</div>
            <div className="text-[11px] font-mono text-[#3157D5]">e.TenantId == CurrentTenantId</div>
            <p className="text-xs text-[#667085] leading-relaxed">
              Engineered into DbContext model creation. Automatically appends WHERE clause to all SELECT, UPDATE, DELETE queries.
            </p>
          </div>

          <div className="p-4 rounded-[9px] bg-white border border-[#E5E1D8] shadow-sm space-y-2">
            <div className="w-6 h-6 rounded-[5px] bg-[#E9EEFF] border border-[#D5E0FF] text-[#3157D5] font-mono text-xs flex items-center justify-center font-bold">
              4
            </div>
            <div className="font-semibold text-xs text-[#172033]">S3 Storage Key Prefix</div>
            <div className="text-[11px] font-mono text-[#3157D5]">/tenants/{'{tenantId}'}/...</div>
            <p className="text-xs text-[#667085] leading-relaxed">
              S3 keys are assembled strictly using the resolved tenant context, ensuring physical separation of customer assets.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
