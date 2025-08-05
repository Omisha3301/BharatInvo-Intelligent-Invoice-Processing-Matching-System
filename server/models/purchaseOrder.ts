import mongoose, { Schema } from 'mongoose';
import { PurchaseOrder } from '@shared/schema';

const purchaseOrderSchema = new Schema<PurchaseOrder>({
  id: { type: String, required: true, unique: true },
  poNumber: { type: String, required: true, unique: true },
  vendorName: { type: String, required: true },
  amount: { type: String, required: true },
  poDate: { type: Date, required: true },
  status: { type: String, required: true },
  items: [{ type: Schema.Types.Mixed }],
  createdAt: { type: Date, default: Date.now },
});

export const PurchaseOrderModel = mongoose.model<PurchaseOrder>('PurchaseOrder', purchaseOrderSchema);
