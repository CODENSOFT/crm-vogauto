import mongoose, { Schema, model, models, type Model } from "mongoose";

export interface ICar {
  _id: mongoose.Types.ObjectId;
  clientName: string;
  clientPhone: string;
  brand: string;
  model: string;
  year: number;
  vin: string;
  color?: string;
  priceBuy: number;
  priceSell: number;
  paymentMethod: "cash" | "transfer" | "rate";
  status: "available" | "sold" | "reserved";
  saleDate: Date;
  soldBy: mongoose.Types.ObjectId;
  soldByName?: string;
  notes?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const CarSchema = new Schema<ICar>({
  clientName: { type: String, required: true },
  clientPhone: { type: String, required: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  vin: { type: String, required: true, unique: true, trim: true },
  color: { type: String },
  priceBuy: { type: Number, default: 0 },
  priceSell: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["cash", "transfer", "rate"], default: "cash" },
  status: { type: String, enum: ["available", "sold", "reserved"], default: "sold" },
  saleDate: { type: Date, required: true },
  soldBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  soldByName: { type: String },
  notes: { type: String },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

CarSchema.index({ isDeleted: 1, saleDate: -1 });
CarSchema.index({ soldBy: 1 });

export const Car: Model<ICar> =
  (models.Car as Model<ICar>) || model<ICar>("Car", CarSchema);

export default Car;
