import { z } from 'zod';

const object_id = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a valid id');

export const TICKET_STATUSES = ['Open', 'InProgress', 'Resolved', 'Closed'] as const;

const strip_html = (text: string) => text.replace(/<[^>]*>/g, '').trim();

export const create_ticket_schema = z.object({
  customer_id: object_id,
  assigned_agent: object_id,
  issue_summary: z
    .string()
    .min(1, 'Issue summary is required')
    .max(500, 'Issue summary must be 500 characters or less')
    .transform(strip_html),
  status: z.enum(TICKET_STATUSES).default('Open'),
  internal_notes: z.string().max(2000).transform(strip_html).optional(),
});

export const update_ticket_schema = z.object({
  customer_id: object_id.optional(),
  assigned_agent: object_id.optional(),
  issue_summary: z.string().min(1).max(500).transform(strip_html).optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  internal_notes: z.string().max(2000).transform(strip_html).optional(),
});

export const create_note_schema = z.object({
  customer_id: object_id,
  content: z
    .string()
    .min(1, 'Note content is required')
    .max(4000, 'Note must be 4000 characters or less')
    .transform(strip_html),
});

export const update_note_schema = z.object({
  content: z.string().min(1).max(4000).transform(strip_html),
});
