import mongoose, { Schema } from 'mongoose';
import { Payment } from '@shared/schema';

const paymentSchema = new Schema<Payment>({
  id: { type: String, required: true, unique: true },
  invoiceId: { type: String, required: true, index: true },
  vendorName: { type: String, required: true },
  paymentDate: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const PaymentModel = mongoose.model<Payment>('Payment', paymentSchema);