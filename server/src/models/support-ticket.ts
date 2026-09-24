import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISupportTicket extends Document {
  customer_id: Types.ObjectId; // Ref to Customer
  assigned_agent: Types.ObjectId; // Ref to User
  // Stored values match the SupportStatus GraphQL enum names exactly so that
  // nothing has to translate between the database and the API. "In Progress"
  // is a display label only — see TICKET_STATUS_LABELS on the client.
  status: 'Open' | 'InProgress' | 'Resolved' | 'Closed';
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
      enum: ['Open', 'InProgress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    issue_summary: { type: String, required: true },
    internal_notes: { type: String }, // Optional field
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
