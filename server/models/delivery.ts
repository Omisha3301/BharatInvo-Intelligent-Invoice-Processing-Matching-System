import mongoose, { Schema } from 'mongoose';
import { Delivery } from '@shared/schema';

const deliverySchema = new Schema<Delivery>({
  id: { type: String, required: true, unique: true },
  deliveryNumber: { type: String, required: true, unique: true },
  poId: { type: String },
  vendorName: { type: String, required: true },
  deliveryDate: { type: Date, required: true },
  items: [{ type: Schema.Types.Mixed }],
  status: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const DeliveryModel = mongoose.model<Delivery>('Delivery', deliverySchema);