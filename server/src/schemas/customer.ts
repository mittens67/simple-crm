import { z } from 'zod';

const object_id = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a valid id');

// Kept in step with schemas/lead.ts — a converted lead becomes a customer, so
// the two must accept the same values or conversion could produce a record
// that fails its own validation.
const name_regex = /^[a-zA-Z0-9\s\-']+$/;
const email_regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const create_customer_schema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(40, 'Name must be 40 characters or less')
    .regex(name_regex, 'Name can only contain letters, numbers, spaces, hyphens, and apostrophes'),
  email: z.string().min(1, 'Email is required').regex(email_regex, 'Email must be a valid email address'),
  phone: z.string().min(1, 'Phone is required').max(20, 'Phone must be 20 characters or less'),
  assigned_rep_id: object_id.optional(),
});

export const update_customer_schema = z.object({
  name: z.string().min(1).max(40).regex(name_regex, 'Name contains invalid characters').optional(),
  email: z.string().regex(email_regex, 'Email must be a valid email address').optional(),
  phone: z.string().min(1).max(20).optional(),
  assigned_rep_id: object_id.nullable().optional(),
});

export type CreateCustomerInput = z.infer<typeof create_customer_schema>;
export type UpdateCustomerInput = z.infer<typeof update_customer_schema>;
