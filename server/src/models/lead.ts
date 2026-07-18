import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILead extends Document {
  name: string;
  email: string;
  phone: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Unqualified' | 'Converted' | 'Deleted';
  assigned_rep_id: Types.ObjectId; // Ref to User
  created_at: Date;
  updated_at: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Deleted'],
      default: 'New',
    },
    assigned_rep_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model<ILead>('Lead', LeadSchema);
