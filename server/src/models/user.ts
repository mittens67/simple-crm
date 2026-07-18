import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role_id: mongoose.Types.ObjectId; 
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // You’ll hash this
    name: { type: String, required: true },
    role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export default mongoose.model<IUser>('User', UserSchema);
