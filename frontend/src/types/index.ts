export interface Tenant {
  id: string;
  name: string;
  code: string;
  description?: string;
  logoUrl?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  totalProducts?: number;
  totalStock?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
  authorizedTenants: string[];
}

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
  tenantNames: string[];
  tenantIds: string[];
  description: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  authorizedTenants: Tenant[];
}

export interface InventoryItem {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: number;
  lowStockThreshold: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface CreateInventoryItemDto {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: number;
  lowStockThreshold: number;
  imageUrl?: string;
}

export interface UpdateInventoryItemDto {
  name?: string;
  sku?: string;
  category?: string;
  quantity?: number;
  price?: number;
  lowStockThreshold?: number;
  imageUrl?: string;
}

export interface UpdateStockDto {
  quantityChange: number; // e.g., +10 or -5
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  note?: string;
}

export interface InventoryTransaction {
  id: string;
  tenantId: string;
  inventoryItemId: string;
  productName?: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  createdAt: string;
  note?: string;
}

export interface TenantFile {
  id: string;
  tenantId: string;
  fileName: string;
  s3Key: string;
  fileSizeBytes: number;
  contentType: string;
  uploadedAt: string;
  downloadUrl?: string;
  associatedItemId?: string;
  associatedItemName?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  createdAt: string;
  details?: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
  categoriesCount: number;
}

export interface SecurityTestResult {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  requestedTenantId: string;
  authenticatedUserId: string;
  authenticatedUserTenants: string[];
  attemptedEntityId?: string;
  expectedStatus: number;
  actualStatus?: number;
  passed: boolean;
  message: string;
  responsePayload?: any;
  timestamp: string;
  description: string;
}
