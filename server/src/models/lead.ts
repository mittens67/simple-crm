import mongoose, { Schema, Document, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS, add_indexes } from '../core/schema-defaults';

export interface ILead extends Document {
  name: string;
  email: string;
  phone: string;
  status: 'Open' | 'Pending' | 'Archived' | 'Converted';
  assigned_rep_id?: Types.ObjectId; // Ref to User
  customer_id?: Types.ObjectId; // Ref to Customer when converted
  sales_notes?: string;
  archive_notes?: string;
  /**
   * Cached AI assessment. Scoring is an explicit action or a reaction to a
   * change — never something a read triggers, which would burn the model
   * quota on every list query.
   */
  ai_score?: number;
  ai_rationale?: string;
  ai_next_action?: string;
  ai_confidence?: number;
  ai_scored_at?: Date;
  /** Which backend produced the score, so mock and live data are tellable apart. */
  ai_provider?: string;
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
    ai_score: { type: Number, min: 0, max: 100 },
    ai_rationale: { type: String },
    ai_next_action: { type: String },
    ai_confidence: { type: Number, min: 0, max: 1 },
    ai_scored_at: { type: Date },
    ai_provider: { type: String },
  },
  BASE_SCHEMA_OPTIONS
);

add_indexes(LeadSchema, {
  owner_fields: ['assigned_rep_id'],
  // Leads are searched by name/email/phone and filtered by status.
  searchable: ['email', 'name', 'status'],
});

// "Show me my hottest leads" sorts by score within an owner's book.
LeadSchema.index({ assigned_rep_id: 1, ai_score: -1 });

export default mongoose.model<ILead>('Lead', LeadSchema);
