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

export interface ProductWarehouseStock {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  city?: string;
  state?: string;
  isActive: boolean;
  isDefault: boolean;
  quantity: number;
  updatedAt: string;
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
  barcode?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  warehouseStocks?: ProductWarehouseStock[];
}

export interface CreateInventoryItemDto {
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: number;
  lowStockThreshold: number;
  barcode?: string;
  imageUrl?: string;
  warehouseId?: string;
}

export interface UpdateInventoryItemDto {
  name?: string;
  sku?: string;
  category?: string;
  quantity?: number;
  price?: number;
  lowStockThreshold?: number;
  barcode?: string;
  imageUrl?: string;
}

export interface UpdateStockDto {
  quantityChange: number; // e.g., +10 or -5
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  note?: string;
  warehouseId?: string;
}

export interface Warehouse {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  isActive: boolean;
  isDefault: boolean;
  totalProducts: number;
  totalStockUnits: number;
  totalValuation: number;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseStockItem {
  id: string;
  warehouseId: string;
  productId: string;
  productName: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  imageUrl?: string;
  updatedAt: string;
}

export interface WarehouseDetail extends Warehouse {
  stocks: WarehouseStockItem[];
}

export interface CreateWarehouseRequest {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  isDefault?: boolean;
}

export interface UpdateWarehouseRequest {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface StockTransferRequest {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  productId: string;
  quantity: number;
  note?: string;
}

export interface StockTransferResult {
  success: boolean;
  transactionId: string;
  message: string;
  sourceRemainingQuantity: number;
  destinationNewQuantity: number;
  aggregateProductQuantity: number;
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

// Platform Tenant & Onboarding Types
export interface InvitationSummary {
  id: string;
  email: string;
  adminName: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}

export interface PlatformTenant {
  id: string;
  name: string;
  code: string;
  slug: string;
  description?: string;
  industry?: string;
  contactNumber?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt?: string;
  userCount: number;
  productCount: number;
  initialAdminName?: string;
  initialAdminEmail?: string;
  pendingInvitation?: InvitationSummary;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  code: string;
  adminName: string;
  adminEmail: string;
  industry?: string;
  contactNumber?: string;
  description?: string;
}

export interface TenantProvisioningResponse {
  tenant: PlatformTenant;
  invitation: InvitationSummary;
  rawInvitationToken: string;
  invitationUrl: string;
  message: string;
}

export interface InvitationDetails {
  invitationId: string;
  tenantId: string;
  tenantName: string;
  tenantCode: string;
  industry?: string;
  adminName: string;
  email: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  isExpired: boolean;
}

export interface AcceptInvitationRequest {
  password: string;
  confirmPassword: string;
}

export interface TenantMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

// Real-Time SignalR Event Types
export interface InventoryUpdateEvent {
  type: 'CREATED' | 'UPDATED' | 'DELETED' | 'STOCK_ADJUSTED';
  item?: InventoryItem;
  itemId?: string;
  itemName?: string;
  transaction?: InventoryTransaction;
  initiatorUserId: string;
  initiatorName: string;
  timestamp: string;
}

export interface UserPresence {
  userId: string;
  userName: string;
  email: string;
  role: string;
  connectedAt: string;
}

export interface PresenceUpdateEvent {
  tenantId: string;
  activeUsersCount: number;
  activeUsers: UserPresence[];
}

export interface FileUpdateEvent {
  action: 'UPLOADED' | 'DELETED';
  fileId: string;
  fileName: string;
  file?: TenantFile;
  initiatorUserId: string;
  initiatorName: string;
  timestamp: string;
}

// Executive Visual Analytics Types
export interface InventorySummary {
  totalProducts: number;
  totalStockUnits: number;
  inStockItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalInventoryValue: number;
  categoriesCount: number;
  averageItemPrice: number;
  averageStockPerProduct: number;
}

export interface StockHealth {
  inStockCount: number;
  inStockPercentage: number;
  lowStockCount: number;
  lowStockPercentage: number;
  outOfStockCount: number;
  outOfStockPercentage: number;
  totalItems: number;
}

export interface CategoryValue {
  category: string;
  productCount: number;
  totalQuantity: number;
  totalValue: number;
  valuePercentage: number;
}

export interface TopItemValue {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  price: number;
  totalValue: number;
  lowStockThreshold: number;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  imageUrl?: string;
}

export interface StockMovementPoint {
  date: string;
  formattedDate: string;
  stockAdded: number;
  stockRemoved: number;
  netChange: number;
  transactionCount: number;
}

export interface ValueConcentration {
  topCategoryName: string;
  topCategoryPercentage: number;
  top3CategoriesPercentage: number;
  topValuedItemName: string;
  topValuedItemPercentage: number;
}

export interface DashboardAnalytics {
  tenantId: string;
  timeRangeDays: number;
  generatedAt: string;
  summary: InventorySummary;
  stockHealth: StockHealth;
  categoryValue: CategoryValue[];
  topItems: TopItemValue[];
  stockMovement: StockMovementPoint[];
  concentration: ValueConcentration;
}


