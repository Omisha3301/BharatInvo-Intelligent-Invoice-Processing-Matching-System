import { storage } from "./storage/mongoStorage";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from 'uuid';
import { User, PurchaseOrder, Delivery, Invoice, InsertUser, InsertPurchaseOrder, InsertDelivery, InsertInvoice } from "@shared/schema";
import { log } from "./utils/vite";

const seededData = {
  userIds: [] as string[],
  poIds: [] as string[],
  deliveryIds: [] as string[],
  invoiceIds: [] as string[],
};

async function seedTestData() {
  log("Seeding test data for matching algorithm...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const hodPassword = await bcrypt.hash("hod123", 10);
  const bookkeeperPassword = await bcrypt.hash("book123", 10);
  const users: InsertUser[] = [
    {
      id: uuidv4(),
      email: "admin@bharatinvo.com",
      password: adminPassword,
      role: "admin",
      name: "Admin User",
      isActive: true,
    },
    {
      id: uuidv4(),
      email: "hod@bharatinvo.com",
      password: hodPassword,
      role: "hod",
      name: "HOD User",
      isActive: true,
    },
    {
      id: uuidv4(),
      email: "bookkeeper@bharatinvo.com",
      password: bookkeeperPassword,
      role: "bookkeeper",
      name: "Bookkeeper User",
      isActive: true,
    },
  ];

  for (const user of users) {
    const existingUser = await storage.getUserByEmail(user.email);
    if (!existingUser) {
      const createdUser = await storage.createUser(user);
      seededData.userIds.push(createdUser.id);
    }
  }

  const purchaseOrders: InsertPurchaseOrder[] = [
    {
      id: uuidv4(),
      poNumber: "TEST-PO-001",
      vendorName: "Acme Corporation",
      amount: "25000",
      poDate: new Date("2024-01-10"),
      status: "active",
      items: [{ description: "Widget A", quantity: 100, unitPrice: 250 }],
    },
    {
      id: uuidv4(),
      poNumber: "TEST-PO-002",
      vendorName: "Tech Solutions Ltd",
      amount: "150000",
      poDate: new Date("2024-01-12"),
      status: "active",
      items: [{ description: "Service Contract", quantity: 5, unitPrice: 30000 }],
    },
    {
      id: uuidv4(),
      poNumber: "TEST-PO-003",
      vendorName: "Acme Corporation",
      amount: "26000",
      poDate: new Date("2024-01-14"),
      status: "active",
      items: [{ description: "Widget B", quantity: 100, unitPrice: 260 }],
    },
    {
      id: uuidv4(),
      poNumber: "PO-3337",  // matching invoiceNumber
      vendorName: "DEMO - Sliced Invoices Suite",
      amount: "93.5",
      poDate: new Date("2025-01-20"),
      status: "active",
      items: [{ description: "Web Design", quantity: 1, unitPrice: 85 }]
    },
    {
      id: uuidv4(),
      poNumber: "012345",  // Match invoiceNumber
      vendorName: "Travel Agency",
      amount: "11575",
      poDate: new Date("2021-12-08"),
      status: "active",
      items: [
        { description: "Full Board and Lodging", quantity: 1, unitPrice: 3000 },
        { description: "Rental Car 1 Week (SUV with $75 per week charges)", quantity: 1, unitPrice: 525 },
        { description: "Tour, Concert Tickets and Other Rentals (A package for 6 individuals $350 each)", quantity: 6, unitPrice: 350 },
        { description: "Air Transport (5 return tickets)", quantity: 5, unitPrice: 790 },
        { description: "Other Fees (Food, refreshments and other arrangements)", quantity: 1, unitPrice: 2000 }
      ]
    },
    {
      id: uuidv4(),
      poNumber: "CCU1-4632921",
      vendorName: "Appario Retail Private Ltd",
      amount: "74900",
      poDate: new Date("2022-02-04"),
      status: "active",
      items: [
        {
          description: "Apple iPhone 13 (128GB) - (Product) RED",
          quantity: 1,
          unitPrice: 74900
        }
      ]
    },
    {
      id: uuidv4() ,  // you can use uuidv4() here too if needed
      poNumber: "Number",
      vendorName: "Global Horizons Travel Solutions",
      amount: "620",
      poDate: new Date("2024-06-15"),
      status: "active",
      items: [
        {
          description: "Custom Travel",
          quantity: 10,
          unitPrice: 50
        },
        {
          description: "Itinerary Plan",
          quantity: 0,
          unitPrice: 0
        },
        {
          description: "Accommodation Booking Services",
          quantity: 2,
          unitPrice: 60
        }
      ]
    },
    {
      id: uuidv4() , 
      poNumber: "INT-001",
      vendorName: "John Smith",
      amount: "204.75",
      poDate: new Date("2019-11-02"),
      status:"active",
      items: [
        { description: "Front and rear brake cables", quantity: 1, unitPrice: 100.0 },
        { description: "New set of pedal arms", quantity: 2, unitPrice: 25.0 },
        { description: "Labor 3hrs", quantity: 1, unitPrice: 15.0 }
      ]
    },
    {
      id: uuidv4() , 
      poNumber:"INV-000003",
      vendorName: "Zylker Electronics Hub",
      amount: "2128.35",
      poDate: new Date("2024-08-08"),
      status:"active",
      items: [
        { description: "Camera", quantity: 1, unitPrice: 899.0 },
        { description: "Fitness Tracker", quantity: 1, unitPrice: 129.0 },
        { description: "Laptop", quantity: 1, unitPrice: 999.0 }
      ]
    },
    {
      id: uuidv4() , 
      poNumber: "1",
      vendorName: "Balaji Shop",
      poDate:  new Date("2022-01-01"),
      amount: "15453.6",
      status:"active",
      items: [
        { description: "Item 1", quantity: 1, unitPrice: 100 },
        { description: "Item 2", quantity: 2, unitPrice: 10 },
        { description: "Item 3", quantity: 3, unitPrice: 300 },
        { description: "Item 4", quantity: 4, unitPrice: 20 },
        { description: "Item 5", quantity: 5, unitPrice: 300 },
        { description: "Item 6", quantity: 6, unitPrice: 150 },
        { description: "Item 7", quantity: 7, unitPrice: 100 },
        { description: "Item 8", quantity: 8, unitPrice: 10 },
        { description: "Item 9", quantity: 9, unitPrice: 300 },
        { description: "Item 10", quantity: 10, unitPrice: 20 },
        { description: "Item 11", quantity: 11, unitPrice: 300 },
        { description: "Item 12", quantity: 12, unitPrice: 150 },
        { description: "Item 13", quantity: 13, unitPrice: 20 },
        { description: "Item 14", quantity: 14, unitPrice: 70 }
      ]
    },
    {
      id: uuidv4() ,
      poNumber: "PO24-AE",
      vendorName: "Your Company Name",
      poDate: new Date("2021-06-01"),
      amount: "7350.0",
      status:"active",
      items: [
        { description: "products", quantity: 5, unitPrice: 1000.0 },
        { description: "services", quantity: 1, unitPrice: 2000.0 }
      ]
    },
  ];

  for (const po of purchaseOrders) {
    const existingPO = await storage.getPurchaseOrderByNumber(po.poNumber);
    if (!existingPO) {
      const createdPO = await storage.createPurchaseOrder(po);
      seededData.poIds.push(createdPO.id);
    }
  }

  const deliveries: InsertDelivery[] = [
    {
      id: uuidv4(),
      deliveryNumber: "TEST-DEL-001",
      poId: purchaseOrders[0].id,
      vendorName: "Acme Corporation",
      deliveryDate: new Date("2024-01-13"),
      items: [{ description: "Widget A", quantityOrdered: 100, quantityDelivered: 100 }],
      status: "received",
    },
    {
      id: uuidv4(),
      deliveryNumber: "TEST-DEL-002",
      poId: purchaseOrders[1].id,
      vendorName: "Tech Solutions",
      deliveryDate: new Date("2024-01-15"),
      items: [{ description: "Service Contract", quantityOrdered: 5, quantityDelivered: 4 }],
      status: "partial",
    },
    {
      id: uuidv4(),
      deliveryNumber: "DEL-INV-3337",
      poId: "PO-3337",  // use the PO id above
      vendorName: "DEMO - Sliced Invoices Suite",
      deliveryDate: new Date("2025-01-25"),
      items: [{ description: "Web Design", quantityOrdered: 1, quantityDelivered: 1 }],
      status: "received"
    },
    {
      id: uuidv4(),
      deliveryNumber: "DEL-012345",  // Derived from invoice/PO
      poId:"012345" ,  // Link to PO
      vendorName: "Travel Agency",
      deliveryDate: new Date("2021-12-15"),
      status: "received",
      items: [
        { description: "Full Board and Lodging", quantityOrdered: 1, quantityDelivered: 1 },
        { description: "Rental Car 1 Week (SUV with $75 per week charges)", quantityOrdered: 1, quantityDelivered: 1 },
        { description: "Tour, Concert Tickets and Other Rentals (A package for 6 individuals $350 each)", quantityOrdered: 6, quantityDelivered: 6 },
        { description: "Air Transport (5 return tickets)", quantityOrdered: 5, quantityDelivered: 5 },
        { description: "Other Fees (Food, refreshments and other arrangements)", quantityOrdered: 1, quantityDelivered: 1 }
      ]
    },
    {
      id: uuidv4(),
      deliveryNumber: "DEL-CCU1-4632921",
      poId: "CCU1-4632921",
      vendorName: "Appario Retail Private Ltd",
      deliveryDate: new Date("2022-02-06"),
      status: "received",
      items: [
        {
          description: "Apple iPhone 13 (128GB) - (Product) RED",
          quantityOrdered: 1,
          quantityDelivered: 1
        }
      ]
    },
    {
      id: uuidv4(),  // Replace with a fixed id if needed like "del-Number"
      deliveryNumber: "DEL-Number",
      poId: "Number",
      vendorName: "Global Horizons Travel Solutions",
      deliveryDate: new Date("2024-06-20"),
      status: "received",
      items: [
        {
          description: "Custom Travel",
          quantityOrdered: 10,
          quantityDelivered: 10
        },
        {
          description: "Itinerary Plan",
          quantityOrdered: 0,
          quantityDelivered: 0
        },
        {
          description: "Accommodation Booking Services",
          quantityOrdered: 2,
          quantityDelivered: 2
        }
      ]
    },
    {
      id: uuidv4(), 
      deliveryNumber: "DEL-INT-001",
      poId: "INT-001",
      vendorName: "John Smith",
      deliveryDate: new Date("2019-11-05"),
      status:"received",
      items: [
        { description: "Front and rear brake cables", quantityOrdered: 1, quantityDelivered: 1 },
        { description: "New set of pedal arms", quantityOrdered: 2,  quantityDelivered: 2 },
        { description: "Labor 3hrs", quantityOrdered: 1,  quantityDelivered: 1}
      ]
    },
    {
      id: uuidv4(), 
      deliveryNumber: "DEL-INV-000003",
      poId: "INV-000003",
      vendorName: "Zylker Electronics Hub",
      deliveryDate: new Date("2024-08-10"),
      status:"received",
      items: [
        { description: "Camera", quantityOrdered: 1, quantityDelivered: 1 },
        { description: "Fitness Tracker",quantityOrdered: 1,  quantityDelivered: 1 },
        { description: "Laptop", quantityOrdered: 1, quantityDelivered: 1 }
      ]
    },
    {
      id: uuidv4(), 
      deliveryNumber: "DEL-1",
      poId: "1",
      vendorName: "Balaji Shop",
      deliveryDate: new Date("2022-01-05"),
      status: "received",
      items: [
        { description: "Item 1", quantityOrdered: 1 , quantityDelivered: 1 },
        { description: "Item 2", quantityOrdered: 2 , quantityDelivered: 2 },
        { description: "Item 3", quantityOrdered: 3 , quantityDelivered: 3 },
        { description: "Item 4", quantityOrdered: 4 , quantityDelivered: 4 },
        { description: "Item 5", quantityOrdered: 5 , quantityDelivered: 5 },
        { description: "Item 6", quantityOrdered: 6 , quantityDelivered: 6 },
        { description: "Item 7", quantityOrdered: 7 , quantityDelivered: 7 },
        { description: "Item 8", quantityOrdered: 8 , quantityDelivered: 8 },
        { description: "Item 9", quantityOrdered: 9 , quantityDelivered: 9 },
        { description: "Item 10", quantityOrdered: 10 , quantityDelivered: 10 },
        { description: "Item 11", quantityOrdered: 11 , quantityDelivered: 11 },
        { description: "Item 12", quantityOrdered: 12 , quantityDelivered: 12 },
        { description: "Item 13", quantityOrdered: 13 , quantityDelivered: 13 },
        { description: "Item 14", quantityOrdered: 14 , quantityDelivered: 14 }
      ]
    },
    {
      id: uuidv4(), 
      deliveryNumber: "DEL24-AE",
      poId: "PO24-AE",
      vendorName: "Your Company Name",
      deliveryDate: new Date("2021-06-10"),
      status: "received",
      items: [
        { description: "products", quantityOrdered: 5 , quantityDelivered: 5 },
        { description: "services", quantityOrdered: 1 , quantityDelivered: 1 }
      ]
    },
  ];

  for (const delivery of deliveries) {
    const existingDelivery = await storage.getDeliveryByNumber(delivery.deliveryNumber);
    if (!existingDelivery && delivery.poId) {
      const createdDelivery = await storage.createDelivery(delivery);
      seededData.deliveryIds.push(createdDelivery.id);
    }
  }

  const invoices: InsertInvoice[] = [
    //{
    //   id: uuidv4(),
    //   invoiceNumber: "TEST-INV-001",
    //   vendorId: { name: "Acme Corporation", email: "contact@acme.com", phone: "123-456-7890", address: "123 Acme St", taxId: "TAX123" },
    //   totalAmount: 25000,
    //   amount: "25000",
    //   invoiceDate: new Date("2024-01-15"),
    //   dueDate: new Date("2024-02-14"),
    //   status: "pending",
    //   source: "manual",
    //   uploadedBy: users[2].id,
    //   items: [{ iname: "Widget A", amt: 250, units: 100, t_amt: 25000 }],
    //   ocrData: {
    //     invoiceNumber: "TEST-INV-001",
    //     vendorId: { name: "Acme Corporation", email: "contact@acme.com", phone: "123-456-7890", address: "123 Acme St", taxId: "TAX123" },
    //     totalAmount: 25000,
    //     date: "2024-01-15",
    //     dueDate: "2024-02-14",
    //     confidence: 0.95,
    //     items: [{ iname: "Widget A", amt: 250, units: 100, t_amt: 25000 }],
    //   },
    //   fileName: "test-TEST-INV-001.pdf",
    //   filePath: "uploads/test-TEST-INV-001.pdf",
    //   flags: [],
    // },
    // {
    //   id: uuidv4(),
    //   invoiceNumber: "TEST-INV-002",
    //   vendorId: { name: "Tech Solutions", email: "info@techsolutions.com", phone: "987-654-3210", address: "456 Tech Rd", taxId: "TAX456" },
    //   totalAmount: 152000,
    //   amount: "152000",
    //   invoiceDate: new Date("2024-01-16"),
    //   dueDate: new Date("2024-02-15"),
    //   status: "pending",
    //   source: "manual",
    //   uploadedBy: users[2].id,
    //   items: [{ iname: "Service Contract", amt: 30400, units: 5, t_amt: 152000 }],
    //   ocrData: {
    //     invoiceNumber: "TEST-INV-002",
    //     vendorId: { name: "Tech Solutions", email: "info@techsolutions.com", phone: "987-654-3210", address: "456 Tech Rd", taxId: "TAX456" },
    //     totalAmount: 152000,
    //     date: "2024-01-16",
    //     dueDate: "2024-02-15",
    //     confidence: 0.92,
    //     items: [{ iname: "Service Contract", amt: 30400, units: 5, t_amt: 152000 }],
    //   },
    //   fileName: "test-TEST-INV-002.pdf",
    //   filePath: "uploads/test-TEST-INV-002.pdf",
    //   flags: ["Amount exceeds PO by ₹2000"],
    // },
    // {
    //   id: uuidv4(),
    //   invoiceNumber: "TEST-INV-001",
    //   vendorId: { name: "Acme Corporation", email: "contact@acme.com", phone: "123-456-7890", address: "123 Acme St", taxId: "TAX123" },
    //   totalAmount: 25000,
    //   amount: "25000",
    //   invoiceDate: new Date("2024-01-16"),
    //   dueDate: new Date("2024-02-15"),
    //   status: "pending",
    //   source: "manual",
    //   uploadedBy: users[2].id,
    //   items: [{ iname: "Widget A", amt: 250, units: 100, t_amt: 25000 }],
    //   ocrData: {
    //     invoiceNumber: "TEST-INV-001",
    //     vendorId: { name: "Acme Corporation", email: "contact@acme.com", phone: "123-456-7890", address: "123 Acme St", taxId: "TAX123" },
    //     totalAmount: 25000,
    //     date: "2024-01-16",
    //     dueDate: "2024-02-15",
    //     confidence: 0.95,
    //     items: [{ iname: "Widget A", amt: 250, units: 100, t_amt: 25000 }],
    //   },
    //   fileName: "test-TEST-INV-001-duplicate.pdf",
    //   filePath: "uploads/test-TEST-INV-001-duplicate.pdf",
    //   flags: ["Potential duplicate invoice detected"],
    // },
    // {
    //   id: uuidv4(),
    //   invoiceNumber: "TEST-INV-004",
    //   vendorId: { name: "Unknown Vendor", email: "", phone: "", address: "", taxId: "" },
    //   totalAmount: 100000,
    //   amount: "100000",
    //   invoiceDate: new Date("2024-01-17"),
    //   dueDate: new Date("2024-02-16"),
    //   status: "pending",
    //   source: "manual",
    //   uploadedBy: users[2].id,
    //   items: [{ iname: "Unknown Item", amt: 100000, units: 1, t_amt: 100000 }],
    //   ocrData: {
    //     invoiceNumber: "TEST-INV-004",
    //     vendorId: { name: "Unknown Vendor", email: "", phone: "", address: "", taxId: "" },
    //     totalAmount: 100000,
    //     date: "2024-01-17",
    //     dueDate: "2024-02-16",
    //     confidence: 0.8,
    //     items: [{ iname: "Unknown Item", amt: 100000, units: 1, t_amt: 100000 }],
    //   },
    //   fileName: "test-TEST-INV-004.pdf",
    //   filePath: "uploads/test-TEST-INV-004.pdf",
    //   flags: ["No matching Purchase Order found"],
    // },
  ];

  for (const invoice of invoices) {
    const existingInvoice = await storage.getInvoiceByNumber(invoice.invoiceNumber);
    if (!existingInvoice || invoice.invoiceNumber === "TEST-INV-001") {
      const createdInvoice = await storage.createInvoice(invoice);
      seededData.invoiceIds.push(createdInvoice.id);
    }
  }

  log("Test data seeded successfully:", JSON.stringify(seededData));
}

async function cleanTestData() {
  log("Cleaning seeded test data...");

  for (const invoiceId of seededData.invoiceIds) {
    await storage.deleteInvoice(invoiceId);
  }
  seededData.invoiceIds = [];

  for (const deliveryId of seededData.deliveryIds) {
    await storage.deleteDelivery(deliveryId);
  }
  seededData.deliveryIds = [];

  for (const poId of seededData.poIds) {
    await storage.deletePurchaseOrder(poId);
  }
  seededData.poIds = [];

  for (const userId of seededData.userIds) {
    await storage.deleteUser(userId);
  }
  seededData.userIds = [];

  log("Seeded test data cleaned successfully.");
}

export { seedTestData, cleanTestData };