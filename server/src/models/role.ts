import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  name: string;
  permissions: Record<string, boolean>;
}

const RoleSchema = new Schema<IRole>({
  name: { type: String, required: true, unique: true },
  // Plain object, not a Mongoose Map: permission keys contain dots
  // ("leads.read"), which Map keys don't allow.
  permissions: {
    type: Schema.Types.Mixed,
    default: {},
  },
});

export default mongoose.model<IRole>('Role', RoleSchema);
