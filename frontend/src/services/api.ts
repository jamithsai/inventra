import axios from 'axios';
import type {
  Tenant,
  User,
  DemoAccount,
  LoginResponse,
  InventoryItem,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  UpdateStockDto,
  TenantFile,
  AuditLog,
  DashboardStats,
  SecurityTestResult,
  InventoryTransaction,
  PlatformTenant,
  CreateTenantRequest,
  TenantProvisioningResponse,
  InvitationDetails,
  AcceptInvitationRequest,
  TenantMember,
  DashboardAnalytics,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Storage keys
const TOKEN_KEY = 'inventra_auth_token';
const USER_KEY = 'inventra_auth_user';
const TENANT_KEY = 'inventra_active_tenant';

// Load stored session on startup
let currentAuthToken: string = localStorage.getItem(TOKEN_KEY) || '';
let currentUserId: string = '';
let currentTenantId: string = localStorage.getItem(TENANT_KEY) || 'acme-retail';

try {
  const storedUser = localStorage.getItem(USER_KEY);
  if (storedUser) {
    const parsed = JSON.parse(storedUser);
    currentUserId = parsed.id || '';
  }
} catch {
  // Ignore parse errors
}

// Listeners for auth state changes (e.g., 401 unauthorized triggers logout)
type AuthChangeListener = (user: User | null, token: string) => void;
const authChangeListeners: AuthChangeListener[] = [];

export const onAuthStateChanged = (listener: AuthChangeListener) => {
  authChangeListeners.push(listener);
  return () => {
    const index = authChangeListeners.indexOf(listener);
    if (index > -1) authChangeListeners.splice(index, 1);
  };
};

const notifyAuthChanged = (user: User | null, token: string) => {
  authChangeListeners.forEach((fn) => fn(user, token));
};

// Create base axios client
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setApiTenantId = (tenantId: string) => {
  currentTenantId = tenantId;
  localStorage.setItem(TENANT_KEY, tenantId);
};

export const getApiTenantId = () => currentTenantId;

export const setApiUser = (userId: string, token: string = '') => {
  currentUserId = userId;
  currentAuthToken = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const getApiUser = () => ({ userId: currentUserId, token: currentAuthToken });

export const getStoredAuth = (): { token: string; user: User | null; activeTenantId: string } => {
  let user: User | null = null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) user = JSON.parse(raw);
  } catch {
    user = null;
  }
  return {
    token: localStorage.getItem(TOKEN_KEY) || '',
    user,
    activeTenantId: localStorage.getItem(TENANT_KEY) || 'acme-retail',
  };
};

export const clearStoredAuth = () => {
  currentAuthToken = '';
  currentUserId = '';
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  notifyAuthChanged(null, '');
};

// Request interceptor to inject X-Tenant-ID and User/Auth headers
apiClient.interceptors.request.use((config) => {
  if (currentTenantId && !config.headers['X-Tenant-ID']) {
    config.headers['X-Tenant-ID'] = currentTenantId;
  }
  if (currentUserId && !config.headers['X-User-ID']) {
    config.headers['X-User-ID'] = currentUserId;
  }
  if (currentAuthToken && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }
  return config;
});

// Response interceptor to handle 401 Unauthorized globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If we got a 401 on an authenticated call, clear tokens so UI redirects to Login
      if (currentAuthToken) {
        clearStoredAuth();
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth & Users API ---
export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    const { token, user } = res.data;
    setApiUser(user.id, token);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    notifyAuthChanged(user, token);
    return res.data;
  },

  getDemoAccounts: async (): Promise<DemoAccount[]> => {
    const res = await apiClient.get<DemoAccount[]>('/auth/demo-accounts');
    return res.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },

  logout: () => {
    clearStoredAuth();
  },

  getUsers: async (): Promise<User[]> => {
    const res = await apiClient.get<User[]>('/auth/users');
    return res.data;
  },

  loginAs: async (userId: string): Promise<{ user: User; token: string; authorizedTenants: Tenant[] }> => {
    const res = await apiClient.post(`/auth/login-as`, { userId });
    setApiUser(res.data.user.id, res.data.token);
    localStorage.setItem(TOKEN_KEY, res.data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    notifyAuthChanged(res.data.user, res.data.token);
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
  getByBarcode: async (barcode: string): Promise<InventoryItem> => {
    const res = await apiClient.get<InventoryItem>(`/inventory/barcode/${encodeURIComponent(barcode.trim())}`);
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

// --- Platform Tenant Management API (Platform Admin only) ---
export const platformApi = {
  getAllTenants: async (): Promise<PlatformTenant[]> => {
    const res = await apiClient.get<PlatformTenant[]>('/platform/tenants');
    return res.data;
  },
  getTenantById: async (id: string): Promise<PlatformTenant> => {
    const res = await apiClient.get<PlatformTenant>(`/platform/tenants/${id}`);
    return res.data;
  },
  provisionTenant: async (data: CreateTenantRequest): Promise<TenantProvisioningResponse> => {
    const res = await apiClient.post<TenantProvisioningResponse>('/platform/tenants', data);
    return res.data;
  },
  updateTenantStatus: async (id: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<PlatformTenant> => {
    const res = await apiClient.patch<PlatformTenant>(`/platform/tenants/${id}/status`, { status });
    return res.data;
  },
  getTenantMembers: async (id: string): Promise<TenantMember[]> => {
    const res = await apiClient.get<TenantMember[]>(`/platform/tenants/${id}/members`);
    return res.data;
  },
};

// --- Tenant Invitations API (Public / Token-based) ---
export const invitationsApi = {
  getInvitation: async (token: string): Promise<InvitationDetails> => {
    const res = await apiClient.get<InvitationDetails>(`/invitations/${token}`);
    return res.data;
  },
  acceptInvitation: async (token: string, data: AcceptInvitationRequest): Promise<{ success: boolean; message: string; tenantId: string; email: string }> => {
    const res = await apiClient.post<{ success: boolean; message: string; tenantId: string; email: string }>(`/invitations/${token}/accept`, data);
    return res.data;
  },
};

// --- Executive Visual Analytics API (Tenant Scoped) ---
export const analyticsApi = {
  getDashboard: async (timeRangeDays: number = 30): Promise<DashboardAnalytics> => {
    const res = await apiClient.get<DashboardAnalytics>('/analytics/dashboard', {
      params: { timeRangeDays },
    });
    return res.data;
  },
};


