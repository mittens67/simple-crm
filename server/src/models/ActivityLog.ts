import mongoose, { Schema, Document, Types } from 'mongoose';

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
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
