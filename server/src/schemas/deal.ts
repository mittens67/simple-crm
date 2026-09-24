import { z } from 'zod';

const object_id = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a valid id');

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
  stage: z.string().min(1, 'Stage is required').max(60),
});

export const update_deal_schema = z.object({
  title: z.string().min(1).max(120).optional(),
  customer_id: object_id.optional(),
  owner_id: object_id.optional(),
  value: z.number().nonnegative('Value cannot be negative').max(1_000_000_000).optional(),
  status: z.enum(DEAL_STATUSES).optional(),
  stage: z.string().min(1).max(60).optional(),
});

export type CreateDealInput = z.infer<typeof create_deal_schema>;
export type UpdateDealInput = z.infer<typeof update_deal_schema>;
