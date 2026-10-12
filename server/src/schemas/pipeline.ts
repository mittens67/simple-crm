import { z } from 'zod';
import { ACTIVITY_TYPES, ACTIVITY_TARGETS } from '../models/activity';

const object_id = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a valid id');

const stage_schema = z.object({
  name: z.string().min(1, 'Stage name is required').max(40),
  display_order: z.number().int().min(0),
  probability: z.number().int().min(0, 'Probability cannot be negative').max(100, 'Probability cannot exceed 100'),
  outcome: z.enum(['open', 'won', 'lost']).default('open'),
});

/**
 * A pipeline needs at least one stage, and exactly one won and one lost
 * terminal stage — otherwise "is this deal closed?" has no answer and win-rate
 * reporting is undefined.
 */
const stages_are_coherent = (stages: z.infer<typeof stage_schema>[]) => {
  const won = stages.filter((s) => s.outcome === 'won').length;
  const lost = stages.filter((s) => s.outcome === 'lost').length;
  return won === 1 && lost === 1;
};

const stages_field = z
  .array(stage_schema)
  .min(1, 'A pipeline needs at least one stage')
  .max(20, 'A pipeline cannot have more than 20 stages')
  .refine(stages_are_coherent, {
    message: 'A pipeline needs exactly one won stage and one lost stage',
  });

export const create_pipeline_schema = z.object({
  name: z.string().min(1, 'Pipeline name is required').max(60),
  is_default: z.boolean().default(false),
  stages: stages_field,
});

export const update_pipeline_schema = z.object({
  name: z.string().min(1).max(60).optional(),
  is_default: z.boolean().optional(),
  stages: stages_field.optional(),
});

// --- Activities ------------------------------------------------------------

const iso_date = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'must be a valid date');

export const create_activity_schema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().max(5000).optional(),
  target_type: z.enum(ACTIVITY_TARGETS),
  target_id: object_id,
  due_at: iso_date.optional(),
});

export const update_activity_schema = z.object({
  type: z.enum(ACTIVITY_TYPES).optional(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().max(5000).optional(),
  due_at: iso_date.nullable().optional(),
});

export type CreateActivityInput = z.infer<typeof create_activity_schema>;
export type UpdatePipelineInput = z.infer<typeof update_pipeline_schema>;
