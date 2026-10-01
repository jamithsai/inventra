import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import type { TabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { FilesView } from './components/FilesView';
import { AuditLogsView } from './components/AuditLogsView';
import { TenantIsolationDemoView } from './components/TenantIsolationDemoView';
import { ArchitectureView } from './components/ArchitectureView';
import { ProductModal } from './components/ProductModal';
import { StockAdjustModal } from './components/StockAdjustModal';
import { LoginPage } from './components/LoginPage';
import { PlatformTenantsView } from './components/PlatformTenantsView';
import { AcceptInvitationPage } from './components/AcceptInvitationPage';
import type { 
  Tenant, 
  User, 
  LoginResponse,
  InventoryItem, 
  DashboardStats, 
  InventoryTransaction, 
  TenantFile, 
  AuditLog, 
  CreateInventoryItemDto, 
  UpdateStockDto 
} from './types';
import { 
  authApi, 
  tenantsApi, 
  inventoryApi, 
  filesApi, 
  auditApi, 
  setApiTenantId, 
  setApiUser,
  getStoredAuth,
  clearStoredAuth,
  onAuthStateChanged
} from './services/api';

export const App: React.FC = () => {
  // Navigation & UI State
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Authentication & Multi-Tenant State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);

  // Tenant-Scoped Data
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [files, setFiles] = useState<TenantFile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Public Token Invitation Handling
  const [invitationToken, setInvitationToken] = useState<string | null>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/invite/')) {
      return path.replace('/invite/', '').trim();
    }
    const params = new URLSearchParams(window.location.search);
    return params.get('invite');
  });
  const [prefilledLoginEmail, setPrefilledLoginEmail] = useState<string>('');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // 1. Fetch Tenant-Scoped Data (called whenever active tenant switches or after mutations)
  const fetchTenantData = useCallback(async (tenantId?: string) => {
    const activeId = tenantId || currentTenant?.id;
    if (!activeId) return;

    setLoading(true);
    try {
      setApiTenantId(activeId);

      const [itemsRes, statsRes, txRes, filesRes, auditRes] = await Promise.all([
        inventoryApi.getAll(),
        inventoryApi.getStats(),
        inventoryApi.getTransactions(),
        filesApi.getAll(),
        auditApi.getAll(),
      ]);

      setItems(itemsRes);
      setStats(statsRes);
      setTransactions(txRes);
      setFiles(filesRes);
      setAuditLogs(auditRes);
    } catch (err: any) {
      const status = err.response?.status;
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch tenant data';
      
      if (status === 403) {
        showToast(`Tenant Access Denied: User is not authorized to access tenant ${activeId}.`, 'error');
      } else if (status === 401) {
        showToast('Session expired. Please sign in again.', 'error');
        handleLogout();
      } else {
        showToast(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  // 2. Initial Setup: Check stored auth token and bootstrap
  useEffect(() => {
    const { token, user, activeTenantId } = getStoredAuth();

    // Subscribe to global 401 unauth / logout events
    const unsubscribe = onAuthStateChanged((newUser, newToken) => {
      setCurrentUser(newUser);
      setAuthToken(newToken);
    });

    if (token && user) {
      setAuthToken(token);
      setCurrentUser(user);
      setApiUser(user.id, token);

      // Load tenants and bootstrap
      const bootstrapSession = async () => {
        setLoading(true);
        try {
          const tenants = await tenantsApi.getAll();
          setAllTenants(tenants);

          // Find preferred tenant (matching stored or first authorized)
          const authorized = tenants.filter((t) => user.authorizedTenants.includes(t.id));
          const initialTenant = authorized.find((t) => t.id === activeTenantId) || authorized[0] || tenants[0];

          if (initialTenant) {
            setCurrentTenant(initialTenant);
            setApiTenantId(initialTenant.id);
            await fetchTenantData(initialTenant.id);
          }
        } catch {
          // Token may be invalid/expired
          clearStoredAuth();
          setCurrentUser(null);
          setAuthToken('');
        } finally {
          setLoading(false);
        }
      };

      bootstrapSession();
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // 3. Handle Successful Login
  const handleLoginSuccess = async (data: LoginResponse) => {
    setLoading(true);
    try {
      setCurrentUser(data.user);
      setAuthToken(data.token);
      setApiUser(data.user.id, data.token);

      const tenants = await tenantsApi.getAll();
      setAllTenants(tenants);

      const authorized = tenants.filter((t) => data.user.authorizedTenants.includes(t.id));
      const initialTenant = authorized[0] || tenants[0];

      if (initialTenant) {
        setCurrentTenant(initialTenant);
        setApiTenantId(initialTenant.id);
        await fetchTenantData(initialTenant.id);
      }

      showToast(`Welcome back, ${data.user.name}! Connected to ${initialTenant?.name || 'Workspace'}.`, 'success');
    } catch (err: any) {
      showToast('Error loading workspace data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Logout
  const handleLogout = () => {
    authApi.logout();
    setCurrentUser(null);
    setAuthToken('');
    setCurrentTenant(null);
    setItems([]);
    setFiles([]);
    setAuditLogs([]);
    setTransactions([]);
    setStats(null);
    showToast('Signed out successfully', 'info');
  };

  // 5. Handle Switching Tenant Context
  const handleSelectTenant = async (tenantId: string) => {
    const targetTenant = allTenants.find((t) => t.id === tenantId);
    if (!targetTenant) return;

    const isAuthorized = currentUser?.authorizedTenants.includes(tenantId);
    setApiTenantId(tenantId);

    if (!isAuthorized) {
      showToast(`Warning: Attempting unauthorized switch to ${targetTenant.name}. Server middleware will enforce security.`, 'info');
    }

    try {
      setLoading(true);
      const [itemsRes, statsRes, txRes, filesRes, auditRes] = await Promise.all([
        inventoryApi.getAll(),
        inventoryApi.getStats(),
        inventoryApi.getTransactions(),
        filesApi.getAll(),
        auditApi.getAll(),
      ]);

      setCurrentTenant(targetTenant);
      setItems(itemsRes);
      setStats(statsRes);
      setTransactions(txRes);
      setFiles(filesRes);
      setAuditLogs(auditRes);
      showToast(`Switched workspace to ${targetTenant.name}`, 'success');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403 || status === 401) {
        showToast(`403 FORBIDDEN: Server TenantResolutionMiddleware rejected access to ${targetTenant.name}.`, 'error');
        if (currentTenant) {
          setApiTenantId(currentTenant.id);
        }
      } else {
        showToast(`Failed to switch tenant: ${err.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // 6. Product Management CRUD Handlers
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (dto: CreateInventoryItemDto) => {
    if (editingItem) {
      await inventoryApi.update(editingItem.id, dto);
      showToast(`Product "${dto.name}" updated successfully`, 'success');
    } else {
      await inventoryApi.create(dto);
      showToast(`Product "${dto.name}" created in ${currentTenant?.name}`, 'success');
    }
    await fetchTenantData();
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from ${currentTenant?.name}?`)) return;
    try {
      await inventoryApi.delete(id);
      showToast(`Product "${name}" deleted`, 'success');
      await fetchTenantData();
    } catch (err: any) {
      showToast(`Failed to delete product: ${err.message}`, 'error');
    }
  };

  // 7. Stock Level Adjustments
  const handleOpenStockModal = (item: InventoryItem) => {
    setStockItem(item);
    setIsStockModalOpen(true);
  };

  const handleAdjustStock = async (id: string, dto: UpdateStockDto) => {
    await inventoryApi.updateStock(id, dto);
    showToast(`Stock updated for item. Transaction logged to audit trail.`, 'success');
    await fetchTenantData();
  };

  // 8. S3 File Upload & Delete
  const handleUploadFile = async (file: File, associatedItemId?: string) => {
    try {
      await filesApi.upload(file, associatedItemId);
      showToast(`File "${file.name}" uploaded to S3 path /tenants/${currentTenant?.id}/`, 'success');
      await fetchTenantData();
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteFile = async (id: string, fileName: string) => {
    if (!confirm(`Delete S3 file "${fileName}"?`)) return;
    try {
      await filesApi.delete(id);
      showToast(`File "${fileName}" deleted from tenant S3 bucket`, 'success');
      await fetchTenantData();
    } catch (err: any) {
      showToast(`Failed to delete file: ${err.message}`, 'error');
    }
  };

  // Filter authorized tenants for the current user
  const authorizedTenants = allTenants.filter((t) => currentUser?.authorizedTenants.includes(t.id));

  // If an invitation token is present in the URL, render the AcceptInvitationPage
  if (invitationToken) {
    return (
      <>
        <AcceptInvitationPage
          token={invitationToken}
          onInvitationAccepted={(email) => {
            setPrefilledLoginEmail(email);
            setInvitationToken(null);
            window.history.replaceState({}, '', '/');
            showToast('Account activated! Sign in with your new password.', 'success');
          }}
          onGoToLogin={() => {
            setInvitationToken(null);
            window.history.replaceState({}, '', '/');
          }}
        />
        {toast && (
          <div
            className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-[7px] shadow-[0_4px_16px_rgba(23,32,51,0.08)] flex items-center space-x-3 text-xs font-medium border bg-white border-[#E5E1D8] text-[#172033] animate-in slide-in-from-bottom-3 duration-150"
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-[#238B5A]' : toast.type === 'error' ? 'bg-[#D64545]' : 'bg-[#3157D5]'}`} />
            <span className="text-[#172033] font-medium">{toast.message}</span>
          </div>
        )}
      </>
    );
  }

  // If unauthenticated, show the enterprise Login Page
  if (!currentUser || !authToken) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          initialEmail={prefilledLoginEmail}
        />
        {toast && (
          <div
            className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-[7px] shadow-[0_4px_16px_rgba(23,32,51,0.08)] flex items-center space-x-3 text-xs font-medium border bg-white border-[#E5E1D8] text-[#172033] animate-in slide-in-from-bottom-3 duration-150"
          >
            <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-[#238B5A]' : toast.type === 'error' ? 'bg-[#D64545]' : 'bg-[#3157D5]'}`} />
            <span className="text-[#172033] font-medium">{toast.message}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#172033] flex flex-col selection:bg-[#E9EEFF] selection:text-[#3157D5]">
      {/* Top Navigation Bar with Filtered Tenant Workspaces and User Profile */}
      <Navbar
        currentTenant={currentTenant}
        authorizedTenants={authorizedTenants.length > 0 ? authorizedTenants : allTenants}
        currentUser={currentUser}
        onSelectTenant={handleSelectTenant}
        onLogout={handleLogout}
        loading={loading}
        onRefresh={() => fetchTenantData()}
      />

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          tenantName={currentTenant?.name}
          tenantId={currentTenant?.id}
          isPlatformAdmin={currentUser?.role === 'ADMIN'}
        />

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              items={items}
              transactions={transactions}
              currentTenant={currentTenant}
              onNavigateToInventory={() => setCurrentTab('inventory')}
              onOpenAddModal={handleOpenAddModal}
            />
          )}

          {currentTab === 'inventory' && (
            <InventoryView
              items={items}
              currentTenant={currentTenant}
              loading={loading}
              onRefresh={() => fetchTenantData()}
              onOpenAddModal={handleOpenAddModal}
              onOpenEditModal={handleOpenEditModal}
              onOpenStockModal={handleOpenStockModal}
              onDeleteItem={handleDeleteItem}
            />
          )}

          {currentTab === 'files' && (
            <FilesView
              files={files}
              items={items}
              currentTenant={currentTenant}
              loading={loading}
              onRefresh={() => fetchTenantData()}
              onUploadFile={handleUploadFile}
              onDeleteFile={handleDeleteFile}
            />
          )}

          {currentTab === 'audit' && (
            <AuditLogsView
              logs={auditLogs}
              currentTenant={currentTenant}
              loading={loading}
              onRefresh={() => fetchTenantData()}
            />
          )}

          {currentTab === 'security-demo' && (
            <TenantIsolationDemoView
              currentTenant={currentTenant}
              currentUser={currentUser}
              allTenants={allTenants}
              currentItems={items}
            />
          )}

          {currentTab === 'architecture' && <ArchitectureView />}

          {currentTab === 'platform-tenants' && <PlatformTenantsView />}
        </main>
      </div>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        editingItem={editingItem}
        currentTenant={currentTenant}
      />

      <StockAdjustModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        item={stockItem}
        onAdjust={handleAdjustStock}
        currentTenant={currentTenant}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-[7px] shadow-[0_4px_16px_rgba(23,32,51,0.08)] flex items-center space-x-3 text-xs font-medium border bg-white border-[#E5E1D8] text-[#172033] animate-in slide-in-from-bottom-3 duration-150"
        >
          {toast.type === 'success' ? (
            <div className="w-2 h-2 rounded-full bg-[#238B5A] shrink-0" />
          ) : toast.type === 'error' ? (
            <div className="w-2 h-2 rounded-full bg-[#D64545] shrink-0" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-[#3157D5] shrink-0" />
          )}
          <span className="text-[#172033] font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default App;
