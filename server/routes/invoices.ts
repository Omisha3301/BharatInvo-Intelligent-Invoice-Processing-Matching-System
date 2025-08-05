import type { Express } from "express";
import { storage } from "../storage/mongoStorage";
import { insertInvoiceSchema, Invoice } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate } from "../utils/auth";
import { performInvoiceMatching } from "../utils/matching";
import { processFile } from "../utils/ocr";
import { log } from "../utils/vite";
import { v4 as uuidv4 } from 'uuid';
import { insertPaymentSchema } from "@shared/schema";

const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    log(`File: ${file.originalname}, Extension: ${ext}, MIME: ${mime}`);
    if (allowedMimes.includes(mime)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type or MIME. Allowed: ${allowedMimes.join(", ")}. Got: ${ext}, ${mime}`), false);
    }
  },
});

export function registerInvoiceRoutes(app: Express) {
  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
    log("Created uploads directory");
  }

  app.get("/api/invoices", authenticate, async (req: any, res) => {
    try {
      const { status, source } = req.query;
      let invoices = await storage.getAllInvoices();

      if (status) {
        invoices = invoices.filter((inv) => inv.status === status);
      }

      if (source) {
        invoices = invoices.filter((inv) => inv.source === source);
      }

      if (req.user.role === "bookkeeper") {
        invoices = invoices.filter((inv) => inv.uploadedBy === req.user.id.toString());
      }

      const transformedInvoices = invoices.map((invoice) => {
        let normalizedAmount = String(invoice.totalAmount || 0);
        if (typeof invoice.amount === 'string' && !isNaN(Number(invoice.amount))) {
          normalizedAmount = invoice.amount;
        } else if (typeof invoice.totalAmount === 'number' && !isNaN(invoice.totalAmount)) {
          normalizedAmount = invoice.totalAmount.toString();
        }

        const vendorName = invoice.vendorId?.name
          ? String(invoice.vendorId.name)
          : "Unknown Vendor";

        return {
          ...invoice,
          amount: normalizedAmount,
          vendorName,
        };
      });

      res.json(transformedInvoices);
    } catch (error) {
      log(`[invoices] Get error: ${(error as Error).message}`);
      res.status(500).json({ message: "Failed to get invoices", error: (error as Error).message });
    }
  });

  app.get("/api/invoices/:id", authenticate, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      let normalizedAmount = String(invoice.totalAmount || 0);
      if (invoice.amount && !isNaN(Number(invoice.amount))) {
        normalizedAmount = invoice.amount;
      }
      const transformedInvoice = {
        ...invoice,
        amount: normalizedAmount,
        vendorName: invoice.vendorId?.name || "Unknown Vendor",
      };
      res.json(transformedInvoice);
    } catch (error) {
      log(`[invoices] Get single invoice error: ${(error as Error).message}`);
      res.status(500).json({ message: "Failed to get invoice", error: (error as Error).message });
    }
  });

  app.post("/api/invoices/upload", authenticate, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileName = req.file.originalname;
      const filePath = req.file.path;

      log(`[invoices] Processing file: ${fileName}, path: ${filePath}`);
      const ocrData = await processFile(filePath);
      log(`[invoices] OCR data: ${JSON.stringify(ocrData, null, 2)}`);

      if (!ocrData.invoiceNumber) {
        return res.status(400).json({
          message: "OCR data missing required invoiceNumber",
          ocrData,
        });
      }

      const invoiceNumber = String(ocrData.invoiceNumber);
      const vendorId = {
        name: String(ocrData.vendorId?.name || 'Unknown Vendor').trim() || 'Unknown Vendor',
        email: String(ocrData.vendorId?.email || '') || null,
        phone: String(ocrData.vendorId?.phone || '') || null,
        address: String(ocrData.vendorId?.address || '') || null,
        taxId: String(ocrData.vendorId?.taxId || '') || null,
      };
      const totalAmount = Number(ocrData.totalAmount) || 0;
      const amount = String(ocrData.totalAmount || totalAmount || '0');
      const invoiceDate = ocrData.date ? new Date(ocrData.date) : new Date();
      const dueDate = ocrData.dueDate
        ? new Date(ocrData.dueDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const items = ocrData.items || [];
      const confidence = Number(ocrData.confidence) || 0.5;

      log(`[invoices] Preparing invoice ${invoiceNumber}: vendorName=${vendorId.name}, amount=${amount}, totalAmount=${totalAmount}, status=pending, uploadedBy=${req.user.id}, role=${req.user.role}`);

      const matchingResults = await performInvoiceMatching({
        invoiceNumber,
        vendorId,
        totalAmount,
        date: ocrData.date,
        dueDate: ocrData.dueDate || dueDate.toISOString().split("T")[0],
        items,
      });

      const autoApprove = await storage.getAutoApproveSetting();
      const status = autoApprove && matchingResults.overallScore === 1 ? "approved" : "pending";

      const invoiceData = {
        id: uuidv4(),
        invoiceNumber,
        vendorId,
        totalAmount,
        amount,
        invoiceDate,
        dueDate,
        status,
        source: "manual",
        fileName,
        filePath,
        ocrData: { ...ocrData, confidence, vendorId: { ...vendorId } },
        matchingResults,
        flags: matchingResults.flags || [],
        uploadedBy: req.user.id.toString(),
        items,
        approvedBy: status === "approved" ? req.user.id.toString() : undefined,
      };

      const validatedInvoice = insertInvoiceSchema.parse(invoiceData);

      const invoice = await storage.createInvoice(validatedInvoice);
      log(`[invoices] Saved invoice ${invoice.invoiceNumber}: id=${invoice.id}, status=${invoice.status}, vendorName=${invoice.vendorId.name}, uploadedBy=${invoice.uploadedBy}`);

      await storage.createAuditLog({
        userId: req.user.id.toString(),
        action: status === "approved" ? "auto_approve" : "upload",
        entityType: "invoice",
        entityId: invoice.id,
        details: { fileName, ocrData, matchingResults, autoApproved: status === "approved" },
      });

      const responseInvoice = {
        ...invoice,
        amount: invoice.amount || String(invoice.totalAmount || '0'),
        vendorName: invoice.vendorId?.name || "Unknown Vendor",
      };
      log(`[invoices] Upload response: ${JSON.stringify(responseInvoice, null, 2)}`);

      res.status(201).json(responseInvoice);
    } catch (error) {
      log(`[invoices] Upload error: ${(error as Error).stack || (error as Error).message}`);
      res.status(500).json({ message: "Upload failed", error: (error as Error).message });
    }
  });

  app.patch("/api/invoices/:id", authenticate, async (req: any, res) => {
    try {
      const invoiceId = req.params.id;
      const { status, comments } = req.body;

      if (!["approved", "rejected", "paid"].includes(status)) {
        return res.status(400).json({ message: 'Invalid status. Must be "approved", "rejected", or "paid"' });
      }

      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (req.user.role === "bookkeeper" && invoice.uploadedBy !== req.user.id.toString()) {
        return res.status(403).json({ message: "Not authorized to update this invoice" });
      }

      if (status === "paid" && invoice.status !== "approved") {
        return res.status(400).json({ message: "Invoice must be approved before it can be marked as paid" });
      }

      if (status === "paid" && invoice.status === "paid") {
        return res.status(400).json({ message: "Invoice is already paid" });
      }

      const updates: Partial<Invoice> = {
        status,
        comments: comments || invoice.comments,
        updatedAt: new Date(),
      };

      if (status === "approved") {
        updates.approvedBy = req.user.id.toString();
      } else if (status === "rejected") {
        updates.reviewedBy = req.user.id.toString();
      } else if (status === "paid") {
        updates.reviewedBy = req.user.id.toString();
        // Create a payment record
        const paymentData = insertPaymentSchema.parse({
          id: uuidv4(),
          invoiceId: invoiceId,
          vendorName: invoice.vendorId.name,
          paymentDate: new Date(),
          amount: invoice.totalAmount,
        });

        await storage.createPayment(paymentData);
      }

      const validatedUpdates = insertInvoiceSchema.partial().parse(updates);

      const updatedInvoice = await storage.updateInvoice(invoiceId, validatedUpdates);
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Failed to update invoice" });
      }

      await storage.createAuditLog({
        userId: req.user.id.toString(),
        action: status === "paid" ? "payment" : "status_change",
        entityType: "invoice",
        entityId: invoiceId,
        details: { status, comments },
      });

      let normalizedAmount = String(updatedInvoice.totalAmount || 0);
      if (updatedInvoice.amount && !isNaN(Number(updatedInvoice.amount))) {
        normalizedAmount = updatedInvoice.amount;
      }
      res.json({
        ...updatedInvoice,
        amount: normalizedAmount,
        vendorName: updatedInvoice.vendorId?.name || "Unknown Vendor",
      });
    } catch (error) {
      log(`[invoices] Update error: ${(error as Error).message}`);
      res.status(500).json({ message: "Failed to update invoice status", error: (error as Error).message });
    }
  });
}