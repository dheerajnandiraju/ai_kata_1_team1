import mongoose, { Document, Schema } from 'mongoose';
import { env } from '../../config/env';

export interface IInventoryItem extends Document {
  name: string;
  quantity: number;
  lowStock: boolean;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      set: (v: string) => v.toLowerCase().trim(),
    },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    lowStock: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

// Auto-update lowStock flag before every save
InventoryItemSchema.pre<IInventoryItem>('save', function (next) {
  this.lowStock = this.quantity <= env.LOW_STOCK_THRESHOLD;
  next();
});

const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
export default InventoryItem;
