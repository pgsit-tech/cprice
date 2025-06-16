// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  module: string;
  action: 'view' | 'create' | 'update' | 'delete' | 'export';
}

// 业务类型
export interface BusinessType {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 价格相关类型
export interface Price {
  id: string;
  businessTypeId: string;
  businessType?: BusinessType;
  origin: string;
  destination: string;
  priceType: 'cost' | 'public';
  price: number;
  currency: string;
  unit: string;
  validFrom: string;
  validTo?: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// 客户咨询表单
export interface CustomerInquiry {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerRegion: string;
  businessType: string;
  origin: string;
  destination: string;
  cargoDescription?: string;
  estimatedWeight?: number;
  estimatedVolume?: number;
  expectedShipDate?: string;
  additionalRequirements?: string;
  status: 'pending' | 'assigned' | 'quoted' | 'completed';
  assignedTo?: string;
  assignedAt?: string;
  autoReleaseAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 公告
export interface Announcement {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 分页类型
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 查询参数
export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// 价格查询参数
export interface PriceQueryParams extends QueryParams {
  businessType?: string;
  origin?: string;
  destination?: string;
  priceType?: 'cost' | 'public';
}

// 表单数据类型
export interface CustomerInquiryForm {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerRegion: string;
  businessType: string;
  origin: string;
  destination: string;
  cargoDescription?: string;
  estimatedWeight?: number;
  estimatedVolume?: number;
  expectedShipDate?: string;
  additionalRequirements?: string;
}

export interface PriceForm {
  businessTypeId: string;
  origin: string;
  destination: string;
  priceType: 'cost' | 'public';
  price: number;
  currency: string;
  unit: string;
  validFrom: string;
  validTo?: string;
  description?: string;
}

export interface AnnouncementForm {
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
}

// 导入/导出相关
export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface ExportOptions {
  format: 'excel' | 'csv';
  filters?: Record<string, any>;
  columns?: string[];
}
