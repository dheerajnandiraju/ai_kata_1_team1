import mongoose, { Schema, Document } from 'mongoose';

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

const supplyRequestSchema = new Schema<ISupplyRequest>(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    remarks: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String },
    actionedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    actionedAt: { type: Date },
  },
  { timestamps: true }
);

export const SupplyRequest = mongoose.model<ISupplyRequest>('SupplyRequest', supplyRequestSchema);
