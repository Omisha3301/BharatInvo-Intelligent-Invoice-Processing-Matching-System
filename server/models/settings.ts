import mongoose, { Schema } from 'mongoose';

interface Settings {
  autoApprove: boolean;
}

const settingsSchema = new Schema<Settings>({
  autoApprove: { type: Boolean, default: false },
});

export const SettingsModel = mongoose.model<Settings>('Settings', settingsSchema);