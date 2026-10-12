import mongoose, { Schema, Document, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS, add_indexes } from '../core/schema-defaults';

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone: string;
  assigned_rep_id?: Types.ObjectId; // References a User (sales rep)
  created_at: Date;
  updated_at: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    assigned_rep_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  BASE_SCHEMA_OPTIONS
);

add_indexes(CustomerSchema, {
  owner_fields: ['assigned_rep_id'],
  searchable: ['email', 'name'],
});

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
