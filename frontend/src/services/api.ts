import axios from 'axios';
import type {
  Tenant,
  User,
  InventoryItem,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  UpdateStockDto,
  TenantFile,
  AuditLog,
  DashboardStats,
  SecurityTestResult,
  InventoryTransaction,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create base axios client
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// State holder for active tenant and auth token
let currentTenantId: string = 'acme-retail';
let currentUserId: string = 'usr_admin_1';
let currentAuthToken: string = '';

export const setApiTenantId = (tenantId: string) => {
  currentTenantId = tenantId;
};

export const getApiTenantId = () => currentTenantId;

export const setApiUser = (userId: string, token: string = '') => {
  currentUserId = userId;
  currentAuthToken = token;
};

export const getApiUser = () => ({ userId: currentUserId, token: currentAuthToken });

// Request interceptor to inject X-Tenant-ID and User/Auth headers
apiClient.interceptors.request.use((config) => {
  if (currentTenantId && !config.headers['X-Tenant-ID']) {
    config.headers['X-Tenant-ID'] = currentTenantId;
  }
  if (currentUserId && !config.headers['X-User-ID']) {
    config.headers['X-User-ID'] = currentUserId;
  }
  if (currentAuthToken) {
    config.headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }
  return config;
});

// --- Auth & Users API ---
export const authApi = {
  getUsers: async (): Promise<User[]> => {
    const res = await apiClient.get<User[]>('/auth/users');
    return res.data;
  },
  loginAs: async (userId: string): Promise<{ user: User; token: string; authorizedTenants: Tenant[] }> => {
    const res = await apiClient.post(`/auth/login-as`, { userId });
    setApiUser(res.data.user.id, res.data.token);
    return res.data;
  },
  getCurrentUser: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },
};

// --- Tenants API ---
export const tenantsApi = {
  getAll: async (): Promise<Tenant[]> => {
    const res = await apiClient.get<Tenant[]>('/tenants');
    return res.data;
  },
  getAuthorizedForUser: async (): Promise<Tenant[]> => {
    const res = await apiClient.get<Tenant[]>('/tenants/authorized');
    return res.data;
  },
  getById: async (tenantId: string): Promise<Tenant> => {
    const res = await apiClient.get<Tenant>(`/tenants/${tenantId}`);
    return res.data;
  },
};

// --- Inventory API ---
export const inventoryApi = {
  getAll: async (params?: { search?: string; category?: string; status?: string }): Promise<InventoryItem[]> => {
    const res = await apiClient.get<InventoryItem[]>('/inventory', { params });
    return res.data;
  },
  getById: async (id: string): Promise<InventoryItem> => {
    const res = await apiClient.get<InventoryItem>(`/inventory/${id}`);
    return res.data;
  },
  create: async (data: CreateInventoryItemDto): Promise<InventoryItem> => {
    const res = await apiClient.post<InventoryItem>('/inventory', data);
    return res.data;
  },
  update: async (id: string, data: UpdateInventoryItemDto): Promise<InventoryItem> => {
    const res = await apiClient.put<InventoryItem>(`/inventory/${id}`, data);
    return res.data;
  },
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/inventory/${id}`);
    return res.data;
  },
  updateStock: async (id: string, data: UpdateStockDto): Promise<InventoryItem> => {
    const res = await apiClient.patch<InventoryItem>(`/inventory/${id}/stock`, data);
    return res.data;
  },
  getTransactions: async (id?: string): Promise<InventoryTransaction[]> => {
    const res = await apiClient.get<InventoryTransaction[]>('/inventory/transactions', {
      params: id ? { itemId: id } : undefined,
    });
    return res.data;
  },
  getStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get<DashboardStats>('/inventory/stats');
    return res.data;
  },
};

// --- Files API (S3 Tenant Isolated) ---
export const filesApi = {
  getAll: async (): Promise<TenantFile[]> => {
    const res = await apiClient.get<TenantFile[]>('/files');
    return res.data;
  },
  getById: async (id: string): Promise<TenantFile> => {
    const res = await apiClient.get<TenantFile>(`/files/${id}`);
    return res.data;
  },
  upload: async (file: File, associatedItemId?: string): Promise<TenantFile> => {
    const formData = new FormData();
    formData.append('file', file);
    if (associatedItemId) {
      formData.append('associatedItemId', associatedItemId);
    }
    const res = await apiClient.post<TenantFile>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.delete(`/files/${id}`);
    return res.data;
  },
};

// --- Audit Logs API ---
export const auditApi = {
  getAll: async (limit: number = 50): Promise<AuditLog[]> => {
    const res = await apiClient.get<AuditLog[]>('/audit-logs', { params: { limit } });
    return res.data;
  },
};

// --- Security / Isolation Attack Simulation API ---
export const securityDemoApi = {
  runIsolationTest: async (params: {
    testType: 'cross_tenant_item_get' | 'unauthorized_tenant_header' | 'cross_tenant_update' | 'cross_tenant_delete' | 'cross_tenant_file_get';
    targetTenantId: string;
    overrideHeaderTenantId?: string;
    targetItemId?: string;
    targetFileId?: string;
  }): Promise<SecurityTestResult> => {
    const res = await apiClient.post<SecurityTestResult>('/security/simulate-attack', params);
    return res.data;
  },
  
  // Direct raw tests to demonstrate standard HTTP status codes
  directRawAttack: async (config: {
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    tenantHeader?: string;
    userIdHeader?: string;
    body?: any;
  }) => {
    try {
      const response = await axios({
        method: config.method,
        url: `${API_BASE_URL}${config.url}`,
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': config.tenantHeader ?? currentTenantId,
          'X-User-ID': config.userIdHeader ?? currentUserId,
          ...(currentAuthToken ? { Authorization: `Bearer ${currentAuthToken}` } : {}),
        },
        data: config.body,
        validateStatus: () => true, // Don't throw on error status codes
      });
      return {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
      };
    } catch (err: any) {
      return {
        status: err.response?.status || 500,
        statusText: err.response?.statusText || 'Network Error',
        data: err.response?.data || { error: err.message },
      };
    }
  },
};
