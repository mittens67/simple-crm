import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone: string;
  assigned_rep_id: Types.ObjectId; // References a User (sales rep)
  created_at: Date;
  updated_at: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    assigned_rep_id: {
      type: Schema.Types.ObjectId,
      ref: 'User', 
      required: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
