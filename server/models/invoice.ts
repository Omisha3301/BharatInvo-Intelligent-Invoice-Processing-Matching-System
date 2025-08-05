import mongoose, { Schema } from 'mongoose';
import { Invoice } from '@shared/schema';

const invoiceSchema = new Schema<Invoice>({
  id: { type: String, required: true, unique: true },
  invoiceNumber: { type: String, required: true },
  vendorId: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    taxId: { type: String },
  },
  amount: { type: String, default: '0' }, // Default to '0' string
  totalAmount: { type: Number, default: 0 }, // Default to 0 number
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending' },
  source: { type: String, enum: ['manual', 'rpa'], required: true },
  fileName: { type: String },
  filePath: { type: String },
  ocrData: { type: Schema.Types.Mixed },
  matchingResults: { type: Schema.Types.Mixed },
  flags: [{ type: String }],
  comments: { type: String },
  uploadedBy: { type: String },
  reviewedBy: { type: String },
  approvedBy: { type: String },
  items: [{
    iname: { type: String },
    amt: { type: Number },
    units: { type: Number },
    t_amt: { type: Number },
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const InvoiceModel = mongoose.model<Invoice>('Invoice', invoiceSchema);