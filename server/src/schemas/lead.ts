import { z } from 'zod';

const sanitize_text = (text: string): string => {
  return text.replace(/<[^>]*>/g, '').trim();
};

const name_regex = /^[a-zA-Z0-9\s\-']+$/;
const email_regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const create_lead_schema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(40, 'Name must be 40 characters or less')
    .regex(name_regex, 'Name can only contain letters, numbers, spaces, hyphens, and apostrophes'),
  email: z.string()
    .min(1, 'Email is required')
    .regex(email_regex, 'Email must be a valid email address'),
  phone: z.string().min(1, 'Phone is required').max(20, 'Phone must be 20 characters or less'),
  status: z.literal('Open').default('Open'),
  assigned_rep_id: z.string().optional(),
  sales_notes: z.string()
    .max(2000, 'Sales notes must be 2000 characters or less')
    .transform(sanitize_text)
    .optional(),
  archive_notes: z.string()
    .max(2000, 'Archive notes must be 2000 characters or less')
    .transform(sanitize_text)
    .optional(),
});

export const update_lead_schema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(40, 'Name must be 40 characters or less')
    .regex(name_regex, 'Name can only contain letters, numbers, spaces, hyphens, and apostrophes')
    .optional(),
  email: z.string()
    .regex(email_regex, 'Email must be a valid email address')
    .optional(),
  phone: z.string().min(1, 'Phone is required').max(20, 'Phone must be 20 characters or less').optional(),
  status: z.enum(['Open', 'Pending', 'Archived', 'Converted']).optional(),
  assigned_rep_id: z.string().nullable().optional(),
  sales_notes: z.string()
    .max(2000, 'Sales notes must be 2000 characters or less')
    .transform(sanitize_text)
    .optional(),
  archive_notes: z.string()
    .max(2000, 'Archive notes must be 2000 characters or less')
    .transform(sanitize_text)
    .optional(),
  customer_id: z.any().optional(),
});

export type CreateLeadInput = z.infer<typeof create_lead_schema>;
export type UpdateLeadInput = z.infer<typeof update_lead_schema>;
