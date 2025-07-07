import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDeal extends Document {
  title: string;
  customer_id: Types.ObjectId; // Ref to Customer
  owner_id: Types.ObjectId; // Ref to User
  value: number;
  status: 'Open' | 'Won' | 'Lost' | 'Pending';
  stage: string;
  created_at: Date;
  updated_at: Date;
}

const DealSchema = new Schema<IDeal>(
  {
    title: { type: String, required: true },
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    owner_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    value: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Open', 'Won', 'Lost', 'Pending'],
      default: 'Open',
    },
    stage: { type: String, required: true }, // You can also convert this to enum if stages are standardized
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model<IDeal>('Deal', DealSchema);
