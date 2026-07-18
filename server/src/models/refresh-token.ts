import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  user_id: Types.ObjectId;
  token_hash: string;
  expires_at: Date;
  revoked_at?: Date;
  created_at: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    revoked_at: { type: Date },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

// Let MongoDB purge expired tokens automatically
RefreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
