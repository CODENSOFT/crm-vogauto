import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IAuditLog {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  userName: string;
  action: string;
  details: Record<string, unknown>;
  ipAddress: string;
  locationCity: string;
  locationCountry: string;
  locationRegion?: string;
  locationZip?: string;
  locationLat?: number;
  locationLon?: number;
  locationIsp?: string;
  device: string;
  browser: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  userName: { type: String },
  action: { type: String, required: true },
  details: { type: Schema.Types.Mixed, default: {} },
  ipAddress: { type: String },
  locationCity: { type: String },
  locationCountry: { type: String },
  locationRegion: { type: String },
  locationZip: { type: String },
  locationLat: { type: Number },
  locationLon: { type: Number },
  locationIsp: { type: String },
  device: { type: String },
  browser: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });

export const AuditLog: Model<IAuditLog> =
  (models.AuditLog as Model<IAuditLog>) ||
  model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
