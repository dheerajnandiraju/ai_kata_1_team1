import mongoose, { Schema, Document } from 'mongoose';
import { env } from '../../config/env';

export interface IInventoryItem extends Document {
  name: string;
  quantity: number;
  lowStock: boolean;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventoryItem>(
  {
    name: { type: String, required: true, unique: true, trim: true, lowercase: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    lowStock: { type: Boolean, default: false },
  },
  { timestamps: true }
);

inventorySchema.pre('save', function (next) {
  this.lowStock = this.quantity <= env.LOW_STOCK_THRESHOLD;
  next();
});

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', inventorySchema);
