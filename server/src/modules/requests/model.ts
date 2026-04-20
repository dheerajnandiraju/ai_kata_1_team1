import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplyRequest extends Document {
  requestedBy: mongoose.Types.ObjectId;
  itemName: string;
  quantity: number;
  remarks?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  actionedBy?: mongoose.Types.ObjectId;
  actionedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupplyRequestSchema = new Schema<ISupplyRequest>(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    itemName: {
      type: String,
      required: true,
      trim: true,
      set: (v: string) => v.toLowerCase().trim(),
    },
    quantity: { type: Number, required: true, min: 1 },
    remarks: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, trim: true },
    actionedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    actionedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for common queries
SupplyRequestSchema.index({ requestedBy: 1, createdAt: -1 });
SupplyRequestSchema.index({ status: 1, createdAt: -1 });

const SupplyRequest = mongoose.model<ISupplyRequest>('SupplyRequest', SupplyRequestSchema);
export default SupplyRequest;
