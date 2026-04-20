import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryItem extends Document {
  name: string;
  quantity: number;
  lowStock: boolean;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    lowStock: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
