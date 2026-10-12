import mongoose, { Schema, Document, Types } from 'mongoose';
import { BASE_SCHEMA_OPTIONS, add_indexes } from '../core/schema-defaults';

/**
 * A pipeline is an ordered list of stages a deal moves through.
 *
 * `Deal.stage` used to be an unconstrained string with no ordering, no list to
 * choose from and no UI input, which meant there was no pipeline at all — just
 * a free-text field nobody could set. Stages are now first-class, ordered, and
 * carry a win probability so weighted forecasting is possible.
 */
export interface IStage {
  _id: Types.ObjectId;
  name: string;
  /** Position in the pipeline, ascending. */
  display_order: number;
  /** 0–100. Used for weighted pipeline value and forecasting. */
  probability: number;
  /** Terminal stages end the deal; only one won and one lost per pipeline. */
  outcome: 'open' | 'won' | 'lost';
}

export interface IPipeline extends Document {
  name: string;
  is_default: boolean;
  stages: Types.DocumentArray<IStage & Document>;
  created_at: Date;
  updated_at: Date;
}

const StageSchema = new Schema<IStage>(
  {
    name: { type: String, required: true, trim: true },
    display_order: { type: Number, required: true, min: 0 },
    probability: { type: Number, required: true, min: 0, max: 100, default: 0 },
    outcome: { type: String, enum: ['open', 'won', 'lost'], default: 'open' },
  },
  { _id: true }
);

const PipelineSchema = new Schema<IPipeline>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    // Exactly one pipeline is the default; new deals land in it.
    is_default: { type: Boolean, default: false },
    stages: { type: [StageSchema], default: [] },
  },
  BASE_SCHEMA_OPTIONS
);

add_indexes(PipelineSchema, { searchable: ['is_default'] });

export default mongoose.model<IPipeline>('Pipeline', PipelineSchema);
