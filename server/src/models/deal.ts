import mongoose, { Schema, Document, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS, add_indexes } from '../core/schema-defaults';

export interface IDeal extends Document {
  title: string;
  customer_id: Types.ObjectId; // Ref to Customer
  owner_id: Types.ObjectId; // Ref to User
  value: number;
  status: 'Open' | 'Won' | 'Lost' | 'Pending';
  pipeline_id: Types.ObjectId;
  /** Points at a stage subdocument inside the pipeline. */
  stage_id: Types.ObjectId;
  /**
   * When the deal entered its current stage. This is what makes time-in-stage,
   * stage-conversion and stalled-deal reporting possible at all — without it
   * a pipeline board is just a set of columns.
   */
  stage_entered_at: Date;
  expected_close_date?: Date;
  closed_at?: Date;
  /** Required when a deal is lost, so win/loss analysis has something to group by. */
  lost_reason?: string;
  created_at: Date;
  updated_at: Date;
}

// Values match the LostReason GraphQL enum names exactly.
export const LOST_REASONS = [
  'Price',
  'Lost_to_competitor',
  'No_budget',
  'No_decision',
  'Bad_timing',
  'Missing_features',
  'Other',
] as const;

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
    value: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['Open', 'Won', 'Lost', 'Pending'],
      default: 'Open',
    },
    pipeline_id: {
      type: Schema.Types.ObjectId,
      ref: 'Pipeline',
      required: true,
    },
    stage_id: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    stage_entered_at: { type: Date, default: Date.now },
    expected_close_date: { type: Date },
    closed_at: { type: Date },
    lost_reason: { type: String, enum: LOST_REASONS },
  },
  BASE_SCHEMA_OPTIONS
);

add_indexes(DealSchema, {
  owner_fields: ['owner_id'],
  searchable: ['customer_id', 'status', 'stage_id', 'pipeline_id', 'expected_close_date'],
});

export default mongoose.model<IDeal>('Deal', DealSchema);
