import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role_ids: mongoose.Types.ObjectId[];
  is_active: boolean;
  theme_preference: 'light' | 'dark';
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role_ids: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    is_active: { type: Boolean, default: true },
    theme_preference: { type: String, enum: ['light', 'dark'], default: 'light' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model<IUser>('User', UserSchema);
