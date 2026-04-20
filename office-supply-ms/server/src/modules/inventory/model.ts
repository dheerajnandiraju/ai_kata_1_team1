import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryItem extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  lowStock: boolean;
  updatedAt: Date;
  createdAt: Date;
}

const inventorySchema = new Schema<IInventoryItem>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lowStock: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

inventorySchema.pre('save', function (next) {
  const threshold = parseInt(process.env.LOW_STOCK_THRESHOLD || '5', 10);
  this.lowStock = this.quantity < threshold;
  next();
});

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', inventorySchema);
