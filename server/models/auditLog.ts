import mongoose, { Schema } from 'mongoose';
import { AuditLog } from '@shared/schema';

const auditLogSchema = new Schema<AuditLog>({
  id: { type: String, required: true, unique: true },
  userId: { type: String },
  action: { type: String, required: true },
  entityType: { type: String },
  entityId: { type: String },
  details: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
});

export const AuditLogModel = mongoose.model<AuditLog>('AuditLog', auditLogSchema);