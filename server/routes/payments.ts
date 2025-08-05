import type { Express } from "express";
import { storage } from "../storage/mongoStorage";
import { authenticate } from "../utils/auth";
import { log } from "../utils/vite";
import { insertPaymentSchema } from "@shared/schema";
import { v4 as uuidv4 } from 'uuid';

export function registerPaymentRoutes(app: Express) {
  
  //Annie
  app.get("/api/payments", authenticate, async (req: any, res) => {
  try {
    console.log("==> Fetching all payments. invoiceId =", req.query.invoiceId);
    let payments;
    if (req.query.invoiceId) {
      payments = await storage.getPaymentsByInvoice(req.query.invoiceId);
    } else {
      payments = await storage.getAllPayments(); // Add this function in your storage layer
      
    }
    console.log("Calling getAllPayments()");

    console.log("==> Returning payments:", payments);
    res.json(payments);
  } catch (error) {
    log(`[payments] Get error: ${(error as Error).message}`);
    res.status(500).json({ message: "Failed to get payments", error: (error as Error).message });
  }
});


  // Get single payment by ID
  app.get("/api/payments/:id", authenticate, async (req: any, res) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      log(`[payments] Get single payment error: ${(error as Error).message}`);
      res.status(500).json({ message: "Failed to get payment", error: (error as Error).message });
    }
  });

  // Create payment
  app.post("/api/payments", authenticate, async (req: any, res) => {
    try {
      const invoice = await storage.getInvoice(req.body.invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      if (invoice.status !== "approved") {
        return res.status(400).json({ message: "Invoice must be approved before payment" });
      }

      const paymentData = insertPaymentSchema.parse({
        id: uuidv4(),
        invoiceId: req.body.invoiceId,
        vendorName: invoice.vendorId.name,
        paymentDate: req.body.paymentDate || new Date(),
        amount: req.body.amount || invoice.totalAmount,
        razorpayPaymentId: req.body.razorpayPaymentId, 
      });

      const payment = await storage.createPayment(paymentData);

      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id.toString(),
        action: "payment_created",
        entityType: "payment",
        entityId: payment.id,
        details: { invoiceId: payment.invoiceId, amount: payment.amount },
      });

      res.status(201).json(payment);
    } catch (error) {
      log(`[payments] Create error: ${(error as Error).message}`);
      res.status(500).json({ message: "Failed to create payment", error: (error as Error).message });
    }
  });
}