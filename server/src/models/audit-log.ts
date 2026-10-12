import mongoose, { Schema, Document, Types } from 'mongoose';
import { APPEND_ONLY_SCHEMA_OPTIONS, add_indexes } from '../core/schema-defaults';

export interface IAuditLog extends Document {
  user_id: Types.ObjectId;       // Ref to User
  action: string;                // Description of the action
  metadata?: Record<string, any>; // Optional metadata
  created_at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
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

add_indexes(AuditLogSchema, {
  owner_fields: ['user_id'],
});

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
