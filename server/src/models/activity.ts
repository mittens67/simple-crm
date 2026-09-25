import mongoose, { Schema, Document, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS, add_indexes } from '../core/schema-defaults';

/**
 * A single interaction or piece of planned work, attached to any CRM record.
 *
 * This replaces the single overwritable `sales_notes` string on a lead, which
 * lost its previous contents on every edit and carried no author or timestamp.
 * One entity powers three things that were all missing: the activity timeline
 * on a record, the task list (`due_at` set, `completed_at` null) and call/email
 * logging.
 *
 * `related_to` is polymorphic via Mongoose `refPath`, so an activity can hang
 * off a Lead, Customer, Deal or SupportTicket without four near-identical
 * collections.
 */
export const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Note', 'Task'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Must match the Mongoose model names exactly — refPath resolves against them. */
export const ACTIVITY_TARGETS = ['Lead', 'Customer', 'Deal', 'SupportTicket'] as const;
export type ActivityTarget = (typeof ACTIVITY_TARGETS)[number];

export interface IActivity extends Document {
  type: ActivityType;
  subject: string;
  body?: string;
  target_type: ActivityTarget;
  target_id: Types.ObjectId;
  owner_id: Types.ObjectId;
  /** Set for tasks; null for things that already happened. */
  due_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String },
    target_type: { type: String, enum: ACTIVITY_TARGETS, required: true },
    target_id: {
      type: Schema.Types.ObjectId,
      required: true,
      // Resolves the collection from target_type at populate time.
      refPath: 'target_type',
    },
    owner_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    due_at: { type: Date },
    completed_at: { type: Date },
  },
  BASE_SCHEMA_OPTIONS
);

add_indexes(ActivitySchema, {
  owner_fields: ['owner_id'],
  searchable: ['type', 'due_at', 'completed_at'],
});

// The timeline query is always "everything attached to this record, newest
// first", so it gets a dedicated compound index.
ActivitySchema.index({ target_type: 1, target_id: 1, created_at: -1 });

// The task list is "my open tasks by due date".
ActivitySchema.index({ owner_id: 1, completed_at: 1, due_at: 1 });

export default mongoose.model<IActivity>('Activity', ActivitySchema);
