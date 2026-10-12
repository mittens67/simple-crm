// models/support-note.ts
import mongoose, { Schema, Document, Types } from 'mongoose';
import { APPEND_ONLY_SCHEMA_OPTIONS, add_indexes } from '../core/schema-defaults';

export interface ISupportNote extends Document {
  customer_id: Types.ObjectId; // Ref to Customer
  author_id: Types.ObjectId;   // Ref to User (Agent)
  content: string;
  created_at: Date;
}

const SupportNoteSchema = new Schema<ISupportNote>(
  {
    customer_id: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    author_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  APPEND_ONLY_SCHEMA_OPTIONS
);

add_indexes(SupportNoteSchema, {
  owner_fields: ['customer_id', 'author_id'],
});

export default mongoose.model<ISupportNote>('SupportNote', SupportNoteSchema);
