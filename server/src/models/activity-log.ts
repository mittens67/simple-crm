import mongoose, { Schema, Document, Types } from 'mongoose';
import { APPEND_ONLY_SCHEMA_OPTIONS, add_indexes } from '../core/schema-defaults';

export interface IActivityLog extends Document {
  user_id: Types.ObjectId;       // Ref to User
  action: string;                // Description of the action
  metadata?: Record<string, any>; // Optional metadata
  created_at: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed, // Allows flexible JSON
      default: {},
    },
  },
  APPEND_ONLY_SCHEMA_OPTIONS
);

add_indexes(ActivityLogSchema, {
  owner_fields: ['user_id'],
});

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
