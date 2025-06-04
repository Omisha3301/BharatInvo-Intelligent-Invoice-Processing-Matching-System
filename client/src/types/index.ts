export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'hod' | 'bookkeeper';
  department?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  vendorName: string;
  amount: string;
  invoiceDate: Date;
  dueDate?: Date;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  source: 'manual' | 'rpa';
  fileName?: string;
  filePath?: string;
  ocrData?: any;
  matchingResults?: any;
  flags?: string[];
  comments?: string;
  uploadedBy?: number;
  reviewedBy?: number;
  approvedBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalInvoices: number;
  pendingReview: number;
  approvedToday: number;
  accuracy: number;
}

export interface Activity {
  id: number;
  description: string;
  timestamp: string;
  status: string;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  vendorName: string;
  amount: string;
  poDate: Date;
  status: string;
  items?: any[];
  createdAt: Date;
}

export interface Delivery {
  id: number;
  deliveryNumber: string;
  poId?: number;
  vendorName: string;
  deliveryDate: Date;
  items?: any[];
  status: string;
  createdAt: Date;
}
