import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISupportTicket extends Document {
  customer_id: Types.ObjectId; // Ref to Customer
  assigned_agent: Types.ObjectId; // Ref to User
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  issue_summary: string;
  internal_notes?: string;
  created_at: Date;
  updated_at: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    assigned_agent: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    issue_summary: { type: String, required: true },
    internal_notes: { type: String }, // Optional field
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
