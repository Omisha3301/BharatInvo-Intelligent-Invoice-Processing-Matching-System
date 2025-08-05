export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "hod" | "bookkeeper";
  department?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  vendorId: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    taxId?: string | null;
  };
  totalAmount: number;
  amount?: string;
  vendorName?: string;
  invoiceDate: string;
  dueDate?: string;
  status: "pending" | "approved" | "rejected" | "paid";
  source: "manual" | "rpa";
  fileName?: string;
  filePath?: string;
  ocrData?: any;
  matchingResults?: any;
  flags?: string[];
  comments?: string;
  uploadedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  items?: {
    iname: string;
    amt: number;
    units: number;
    t_amt: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorName: string;
  amount: string;
  poDate: string;
  status: "active" | "completed" | "cancelled";
  items?: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  createdAt: string;
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  poId?: string;
  vendorName: string;
  deliveryDate: string;
  items?: {
    description: string;
    quantityDelivered: number;
    quantityOrdered: number;
  }[];
  status: "received" | "partial" | "pending";
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: any;
  timestamp: string;
}

//Annie
export interface Payment {
  id: string;
  invoiceId: string;
  vendorName: string;
  amount: number;
  paymentDate: string;
  razorpayPaymentId: string;
  createdAt?: string;
}
export interface DashboardStats {
  totalInvoices: number;
  pendingReview: number;
  approvedToday: number;
  accuracy: number;
}

export interface Activity {
  id: string;
  action: string;
  description?: string; // For backward compatibility
  timestamp: string | Date;
  status: string;
  details?: {
    userName: string;
    invoiceNumber?: string;
    message: string;
  };
}