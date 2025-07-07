import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  name: string;
  permissions: Record<string, boolean>; 
}

const RoleSchema = new Schema<IRole>({
  name: { type: String, required: true, unique: true },
  permissions: {
    type: Map,
    of: Boolean,
    default: {},
  },
});

export default mongoose.model<IRole>('Role', RoleSchema);
