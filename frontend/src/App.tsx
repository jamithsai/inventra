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
import type { 
  Tenant, 
  User, 
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
  setApiUser 
} from './services/api';
import { ShieldCheck, AlertCircle, CheckCircle, Info, Lock } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation & UI State
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Core Multi-Tenant State
  const [allTenants, setAllTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Tenant-Scoped Data
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [files, setFiles] = useState<TenantFile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

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
      // Set the active tenant in API client
      setApiTenantId(activeId);

      // Parallel fetch of isolated data
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
      } else {
        showToast(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id]);

  // 2. Initial Setup: Load Tenants & Users
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        const [tenantsData, usersData] = await Promise.all([
          tenantsApi.getAll(),
          authApi.getUsers(),
        ]);

        setAllTenants(tenantsData);
        setAllUsers(usersData);

        // Default to first user (Admin User) and first tenant (Acme Retail)
        if (usersData.length > 0) {
          const defaultUser = usersData[0];
          setCurrentUser(defaultUser);
          setApiUser(defaultUser.id);

          const defaultTenant = tenantsData.find((t) => defaultUser.authorizedTenants.includes(t.id)) || tenantsData[0];
          if (defaultTenant) {
            setCurrentTenant(defaultTenant);
            setApiTenantId(defaultTenant.id);
            // Fetch tenant-scoped data for initial tenant
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
          }
        }
      } catch (err: any) {
        showToast('Initial bootstrap error: ' + (err.message || 'Server offline'), 'error');
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // 3. Handle Switching Tenant Context
  const handleSelectTenant = async (tenantId: string) => {
    const targetTenant = allTenants.find((t) => t.id === tenantId);
    if (!targetTenant) return;

    // Check frontend membership expectation
    const isAuthorized = currentUser?.authorizedTenants.includes(tenantId);
    
    // Set API header to requested tenant
    setApiTenantId(tenantId);

    if (!isAuthorized) {
      showToast(`Warning: Attempting unauthorized switch to ${targetTenant.name}. Server middleware will enforce security.`, 'info');
    }

    try {
      setLoading(true);
      // Fetch data directly using new X-Tenant-ID header
      const [itemsRes, statsRes, txRes, filesRes, auditRes] = await Promise.all([
        inventoryApi.getAll(),
        inventoryApi.getStats(),
        inventoryApi.getTransactions(),
        filesApi.getAll(),
        auditApi.getAll(),
      ]);

      // If authorized and backend succeeded:
      setCurrentTenant(targetTenant);
      setItems(itemsRes);
      setStats(statsRes);
      setTransactions(txRes);
      setFiles(filesRes);
      setAuditLogs(auditRes);
      showToast(`Switched tenant context to ${targetTenant.name} (${tenantId})`, 'success');
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403 || status === 401) {
        showToast(`403 FORBIDDEN: Server TenantResolutionMiddleware rejected access to ${targetTenant.name}.`, 'error');
        // Reset header back to valid tenant
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

  // 4. Handle Switching Demo User Persona
  const handleSelectUser = async (userId: string) => {
    const targetUser = allUsers.find((u) => u.id === userId);
    if (!targetUser) return;

    try {
      setLoading(true);
      const loginRes = await authApi.loginAs(userId);
      setCurrentUser(loginRes.user);
      setApiUser(loginRes.user.id, loginRes.token);

      showToast(`Switched user persona to ${loginRes.user.name} (${loginRes.user.role})`, 'success');

      // Check if current active tenant is still authorized for new user
      if (!loginRes.user.authorizedTenants.includes(currentTenant?.id || '')) {
        const nextTenantId = loginRes.user.authorizedTenants[0] || 'acme-retail';
        const nextTenant = allTenants.find((t) => t.id === nextTenantId);
        if (nextTenant) {
          setCurrentTenant(nextTenant);
          setApiTenantId(nextTenant.id);
          await fetchTenantData(nextTenant.id);
        }
      } else {
        await fetchTenantData();
      }
    } catch (err: any) {
      showToast(`Error changing user: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 5. Product Management CRUD Handlers
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

  // 6. Stock Level Adjustments
  const handleOpenStockModal = (item: InventoryItem) => {
    setStockItem(item);
    setIsStockModalOpen(true);
  };

  const handleAdjustStock = async (id: string, dto: UpdateStockDto) => {
    await inventoryApi.updateStock(id, dto);
    showToast(`Stock updated for item. Transaction logged to audit trail.`, 'success');
    await fetchTenantData();
  };

  // 7. S3 File Upload & Delete
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

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#172033] flex flex-col selection:bg-[#E9EEFF] selection:text-[#3157D5]">
      {/* Top Navigation Bar */}
      <Navbar
        currentTenant={currentTenant}
        allTenants={allTenants}
        currentUser={currentUser}
        allUsers={allUsers}
        onSelectTenant={handleSelectTenant}
        onSelectUser={handleSelectUser}
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
