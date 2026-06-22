import mongoose, { Schema, model, models, type Model } from "mongoose";

// Mașină în stoc / la realizare: adusă de un proprietar, vândută de parcare.
export interface IInventory {
  _id: mongoose.Types.ObjectId;
  brand: string;
  model: string;
  year: number;
  vin?: string;
  color?: string;
  ownerName: string; // proprietarul care a adus mașina
  ownerPhone: string;
  clientWantPrice: number; // prețul cerut de proprietar
  sellPrice: number; // prețul de vânzare al parcării
  status: "available" | "sold";
  notes?: string;
  addedBy?: mongoose.Types.ObjectId;
  addedByName?: string;
  soldBy?: mongoose.Types.ObjectId;
  soldByName?: string;
  saleId?: mongoose.Types.ObjectId;
  saleDate?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InventorySchema = new Schema<IInventory>({
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  vin: { type: String, trim: true },
  color: { type: String },
  ownerName: { type: String, required: true },
  ownerPhone: { type: String, required: true },
  clientWantPrice: { type: Number, default: 0 },
  sellPrice: { type: Number, required: true },
  status: { type: String, enum: ["available", "sold"], default: "available" },
  notes: { type: String },
  addedBy: { type: Schema.Types.ObjectId, ref: "User" },
  addedByName: { type: String },
  soldBy: { type: Schema.Types.ObjectId, ref: "User" },
  soldByName: { type: String },
  saleId: { type: Schema.Types.ObjectId, ref: "Car" },
  saleDate: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

InventorySchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

export const Inventory: Model<IInventory> =
  (models.Inventory as Model<IInventory>) || model<IInventory>("Inventory", InventorySchema);

export default Inventory;
