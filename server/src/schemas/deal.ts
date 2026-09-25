import { z } from 'zod';
import { LOST_REASONS } from '../models/deal';

const object_id = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a valid id');

const iso_date = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'must be a valid date');

export const DEAL_STATUSES = ['Open', 'Won', 'Lost', 'Pending'] as const;

export const create_deal_schema = z.object({
  title: z.string().min(1, 'Title is required').max(120, 'Title must be 120 characters or less'),
  customer_id: object_id,
  owner_id: object_id,
  // Guards against negative and absurd values, which the schema previously
  // accepted because Float! only constrains the type.
  value: z
    .number()
    .nonnegative('Value cannot be negative')
    .max(1_000_000_000, 'Value is unrealistically large'),
  status: z.enum(DEAL_STATUSES).default('Open'),
  pipeline_id: object_id.optional(),
  stage_id: object_id.optional(),
  expected_close_date: iso_date.optional(),
});

export const update_deal_schema = z.object({
  title: z.string().min(1).max(120).optional(),
  customer_id: object_id.optional(),
  owner_id: object_id.optional(),
  value: z.number().nonnegative('Value cannot be negative').max(1_000_000_000).optional(),
  status: z.enum(DEAL_STATUSES).optional(),
  expected_close_date: iso_date.optional(),
  lost_reason: z.enum(LOST_REASONS).optional(),
});

export type CreateDealInput = z.infer<typeof create_deal_schema>;
export type UpdateDealInput = z.infer<typeof update_deal_schema>;
