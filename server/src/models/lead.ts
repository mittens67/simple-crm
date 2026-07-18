import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILead extends Document {
  name: string;
  email: string;
  phone: string;
  status: 'Open' | 'Pending' | 'Archived' | 'Converted';
  assigned_rep_id?: Types.ObjectId; // Ref to User
  customer_id?: Types.ObjectId; // Ref to Customer when converted
  sales_notes?: string;
  archive_notes?: string;
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
      enum: ['Open', 'Pending', 'Archived', 'Converted'],
      default: 'Open',
    },
    assigned_rep_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    sales_notes: String,
    archive_notes: String,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model<ILead>('Lead', LeadSchema);
