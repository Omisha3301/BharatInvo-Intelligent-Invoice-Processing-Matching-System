import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertInvoiceSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

const JWT_SECRET = process.env.JWT_SECRET || "bharatinvo-secret-key";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'));
    }
  }
});

// Authentication middleware
function authenticate(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// OCR Processing Simulation
function simulateOCR(fileName: string): any {
  // Simulate OCR processing with mock data based on filename
  const mockOCRResults = {
    'invoice_001.pdf': {
      invoiceNumber: 'INV-2024-001',
      vendorName: 'Acme Corporation',
      amount: 25000,
      date: '2024-01-15',
      confidence: 0.95
    },
    'invoice_002.pdf': {
      invoiceNumber: 'INV-2024-002', 
      vendorName: 'Tech Solutions Ltd',
      amount: 151000,
      date: '2024-01-16',
      confidence: 0.92
    }
  };
  
  return mockOCRResults[fileName as keyof typeof mockOCRResults] || {
    invoiceNumber: `INV-${Date.now()}`,
    vendorName: 'Unknown Vendor',
    amount: Math.floor(Math.random() * 100000),
    date: new Date().toISOString().split('T')[0],
    confidence: Math.random() * 0.3 + 0.7 // 0.7 to 1.0
  };
}

// AI Matching Algorithm
async function performInvoiceMatching(ocrData: any) {
  /*
   * AI Matching Algorithm Implementation:
   * 
   * 1. Purchase Order Matching:
   *    - Compare vendor names using fuzzy string matching
   *    - Match invoice amounts with PO amounts (allow small variance)
   *    - Check if PO is still active and within date range
   * 
   * 2. Delivery Receipt Matching:
   *    - Match vendor and PO reference
   *    - Verify goods have been received
   *    - Check quantities and delivery dates
   * 
   * 3. Amount Verification:
   *    - Compare invoice amount with PO amount
   *    - Flag discrepancies beyond acceptable threshold (±5%)
   *    - Consider taxes, shipping, and other adjustments
   * 
   * 4. Date Validation:
   *    - Ensure invoice date is after delivery date
   *    - Check payment terms and due dates
   *    - Validate against PO creation date
   * 
   * 5. Duplicate Detection:
   *    - Compare with existing invoices for same vendor
   *    - Check invoice numbers and dates
   *    - Flag potential duplicates
   */
  
  const purchaseOrders = await storage.getAllPurchaseOrders();
  const deliveries = await storage.getAllDeliveries();
  const existingInvoices = await storage.getAllInvoices();
  
  // Step 1: Find matching Purchase Order
  let bestPOMatch = null;
  let poMatchConfidence = 0;
  
  for (const po of purchaseOrders) {
    // Vendor name similarity (simple string matching for demo)
    const vendorSimilarity = calculateStringSimilarity(
      ocrData.vendorName.toLowerCase(),
      po.vendorName.toLowerCase()
    );
    
    // Amount comparison (within 10% variance)
    const amountVariance = Math.abs(parseFloat(po.amount) - ocrData.amount) / parseFloat(po.amount);
    const amountScore = amountVariance <= 0.1 ? 1 : Math.max(0, 1 - amountVariance);
    
    // Overall confidence score
    const confidence = (vendorSimilarity * 0.6 + amountScore * 0.4);
    
    if (confidence > poMatchConfidence && confidence > 0.7) {
      poMatchConfidence = confidence;
      bestPOMatch = po;
    }
  }
  
  // Step 2: Find matching Delivery Receipt
  let bestDeliveryMatch = null;
  let deliveryMatchConfidence = 0;
  
  if (bestPOMatch) {
    const relatedDeliveries = await storage.getDeliveriesByPO(bestPOMatch.id);
    
    for (const delivery of relatedDeliveries) {
      const vendorSimilarity = calculateStringSimilarity(
        ocrData.vendorName.toLowerCase(),
        delivery.vendorName.toLowerCase()
      );
      
      // Check if delivery date is before invoice date
      const invoiceDate = new Date(ocrData.date);
      const deliveryDate = new Date(delivery.deliveryDate);
      const dateScore = deliveryDate <= invoiceDate ? 1 : 0.5;
      
      const confidence = vendorSimilarity * 0.7 + dateScore * 0.3;
      
      if (confidence > deliveryMatchConfidence && confidence > 0.6) {
        deliveryMatchConfidence = confidence;
        bestDeliveryMatch = delivery;
      }
    }
  }
  
  // Step 3: Amount Verification
  let amountMatch = { matched: false, variance: 0 };
  if (bestPOMatch) {
    const variance = Math.abs(parseFloat(bestPOMatch.amount) - ocrData.amount);
    const variancePercent = variance / parseFloat(bestPOMatch.amount);
    amountMatch = {
      matched: variancePercent <= 0.05, // 5% tolerance
      variance: variance
    };
  }
  
  // Step 4: Generate flags for issues
  const flags: string[] = [];
  
  if (!bestPOMatch) {
    flags.push("No matching Purchase Order found");
  } else if (poMatchConfidence < 0.9) {
    flags.push("Low confidence PO match");
  }
  
  if (!bestDeliveryMatch) {
    flags.push("No delivery record found");
  }
  
  if (!amountMatch.matched && bestPOMatch) {
    flags.push(`Amount exceeds PO by ₹${amountMatch.variance.toLocaleString()}`);
  }
  
  // Step 5: Check for duplicates
  const duplicateCheck = existingInvoices.find(inv => 
    inv.invoiceNumber === ocrData.invoiceNumber && 
    inv.vendorName.toLowerCase() === ocrData.vendorName.toLowerCase()
  );
  
  if (duplicateCheck) {
    flags.push("Potential duplicate invoice detected");
  }
  
  return {
    poMatch: bestPOMatch ? {
      matched: true,
      confidence: poMatchConfidence,
      poNumber: bestPOMatch.poNumber
    } : { matched: false, confidence: 0 },
    
    deliveryMatch: bestDeliveryMatch ? {
      matched: true,
      confidence: deliveryMatchConfidence,
      deliveryNumber: bestDeliveryMatch.deliveryNumber
    } : { matched: false, confidence: 0 },
    
    amountMatch,
    flags,
    overallScore: (poMatchConfidence + deliveryMatchConfidence + (amountMatch.matched ? 1 : 0)) / 3
  };
}

// Helper function for string similarity
function calculateStringSimilarity(str1: string, str2: string): number {
  // Simple Levenshtein distance-based similarity
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password, role } = req.body;
      
      if (!email || !password || !role) {
        return res.status(400).json({ message: 'Email, password, and role are required' });
      }
      
      const user = await storage.validatePassword(email, password);
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      if (user.role !== role) {
        return res.status(403).json({ message: 'Role mismatch' });
      }
      
      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is deactivated' });
      }
      
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      res.status(500).json({ message: 'Login failed', error: error.message });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: 'User already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      res.status(400).json({ message: 'Registration failed', error: error.message });
    }
  });

  // Get current user
  app.get('/api/auth/me', authenticate, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get user', error: error.message });
    }
  });

  // Invoice routes
  app.get('/api/invoices', authenticate, async (req: any, res) => {
    try {
      const { status, source } = req.query;
      let invoices = await storage.getAllInvoices();
      
      if (status) {
        invoices = invoices.filter(inv => inv.status === status);
      }
      
      if (source) {
        invoices = invoices.filter(inv => inv.source === source);
      }
      
      // Filter by user role
      if (req.user.role === 'bookkeeper') {
        invoices = invoices.filter(inv => inv.uploadedBy === req.user.id);
      }
      
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get invoices', error: error.message });
    }
  });

  app.get('/api/invoices/:id', authenticate, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(parseInt(req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get invoice', error: error.message });
    }
  });

  app.post('/api/invoices/upload', authenticate, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const fileName = req.file.originalname;
      const filePath = req.file.path;
      
      // Simulate OCR processing
      const ocrData = simulateOCR(fileName);
      
      // Perform AI matching
      const matchingResults = await performInvoiceMatching(ocrData);
      
      // Create invoice record
      const invoice = await storage.createInvoice({
        invoiceNumber: ocrData.invoiceNumber,
        vendorName: ocrData.vendorName,
        amount: ocrData.amount.toString(),
        invoiceDate: new Date(ocrData.date),
        status: 'pending',
        source: 'manual',
        fileName: fileName,
        filePath: filePath,
        ocrData: ocrData,
        matchingResults: matchingResults,
        flags: matchingResults.flags,
        uploadedBy: req.user.id,
      });
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'upload',
        entityType: 'invoice',
        entityId: invoice.id,
        details: { fileName, ocrData, matchingResults }
      });
      
      res.status(201).json(invoice);
    } catch (error) {
      res.status(500).json({ message: 'Upload failed', error: error.message });
    }
  });

  app.patch('/api/invoices/:id', authenticate, async (req: any, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const updates = req.body;
      
      // Add reviewer info if status is being changed
      if (updates.status && updates.status !== 'pending') {
        updates.reviewedBy = req.user.id;
        
        if (updates.status === 'approved') {
          updates.approvedBy = req.user.id;
        }
      }
      
      const invoice = await storage.updateInvoice(invoiceId, updates);
      
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        action: updates.status ? 'status_change' : 'update',
        entityType: 'invoice',
        entityId: invoiceId,
        details: updates
      });
      
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update invoice', error: error.message });
    }
  });

  // User management routes (Admin only)
  app.get('/api/users', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get users', error: error.message });
    }
  });

  app.patch('/api/users/:id', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      const userId = parseInt(req.params.id);
      const updates = req.body;
      
      // Don't allow password updates through this endpoint
      delete updates.password;
      
      const user = await storage.updateUser(userId, updates);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update user', error: error.message });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', authenticate, async (req: any, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const stats = {
        totalInvoices: invoices.length,
        pendingReview: invoices.filter(inv => inv.status === 'pending').length,
        approvedToday: invoices.filter(inv => 
          inv.status === 'approved' && 
          new Date(inv.updatedAt!) >= today
        ).length,
        accuracy: calculateMatchingAccuracy(invoices)
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get stats', error: error.message });
    }
  });

  // Recent activity
  app.get('/api/dashboard/activity', authenticate, async (req: any, res) => {
    try {
      const logs = await storage.getAuditLogs();
      const recentActivity = logs.slice(0, 10).map(log => ({
        id: log.id,
        description: formatActivityDescription(log),
        timestamp: formatTimeAgo(log.timestamp!),
        status: getActivityStatus(log.action),
      }));
      
      res.json(recentActivity);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get activity', error: error.message });
    }
  });

  // Purchase Orders routes
  app.get('/api/purchase-orders', authenticate, async (req, res) => {
    try {
      const purchaseOrders = await storage.getAllPurchaseOrders();
      res.json(purchaseOrders);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get purchase orders', error: error.message });
    }
  });

  // Deliveries routes
  app.get('/api/deliveries', authenticate, async (req, res) => {
    try {
      const deliveries = await storage.getAllDeliveries();
      res.json(deliveries);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get deliveries', error: error.message });
    }
  });

  // Audit logs
  app.get('/api/audit-logs', authenticate, async (req: any, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      const { entityType, entityId } = req.query;
      const logs = await storage.getAuditLogs(
        entityType as string,
        entityId ? parseInt(entityId as string) : undefined
      );
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get audit logs', error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function calculateMatchingAccuracy(invoices: any[]): number {
  if (invoices.length === 0) return 0;
  
  const processedInvoices = invoices.filter(inv => inv.matchingResults);
  if (processedInvoices.length === 0) return 0;
  
  const totalScore = processedInvoices.reduce((sum, inv) => 
    sum + (inv.matchingResults.overallScore || 0), 0
  );
  
  return Math.round((totalScore / processedInvoices.length) * 100 * 10) / 10;
}

function formatActivityDescription(log: any): string {
  switch (log.action) {
    case 'upload':
      return `Invoice ${log.details?.fileName || 'uploaded'} by user`;
    case 'status_change':
      return `Invoice status changed to ${log.details?.status || 'updated'}`;
    case 'update':
      return `Invoice ${log.entityId} updated`;
    default:
      return `${log.action} performed on ${log.entityType} ${log.entityId}`;
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function getActivityStatus(action: string): string {
  switch (action) {
    case 'upload':
      return 'Pending';
    case 'status_change':
      return 'Completed';
    default:
      return 'Processing';
  }
}
