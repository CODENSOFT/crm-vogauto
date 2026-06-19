import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface IPermissions {
  canViewPrices: boolean;
  canEditCars: boolean;
  canAddCars: boolean;
  canDownload: boolean;
  canViewStatistics: boolean;
}

export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  email?: string;
  password: string;
  fullName: string;
  role: "admin" | "worker";
  permissions: IPermissions;
  commissionPercent: number;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

const PermissionsSchema = new Schema<IPermissions>(
  {
    canViewPrices: { type: Boolean, default: false },
    canEditCars: { type: Boolean, default: false },
    canAddCars: { type: Boolean, default: true },
    canDownload: { type: Boolean, default: false },
    canViewStatistics: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>({
  // Login pe nume de utilizator (nu pe email).
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  role: { type: String, enum: ["admin", "worker"], default: "worker" },
  permissions: { type: PermissionsSchema, default: () => ({}) },
  // Procentul de comision al managerului (setat de admin).
  commissionPercent: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
});

export const User: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", UserSchema);

export default User;
