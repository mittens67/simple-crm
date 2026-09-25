import { z } from 'zod';
import { FilterQuery } from 'mongoose';

/**
 * The contract for natural-language search.
 *
 * The model NEVER emits a database query. It emits a small, closed filter
 * object described below, which is validated here and only then compiled into
 * Mongo by `compile_filter`. That boundary is the whole security story:
 *
 *   - `.strict()` rejects any key not named here, so `$where`, `$expr`,
 *     `$function` and friends cannot appear at all.
 *   - Field names are enums, not strings, so a model cannot ask for a field
 *     the caller has no business reading (password hashes, other tenants' ids).
 *   - Values are typed and bounded, so no regex object can be smuggled in to
 *     cause catastrophic backtracking.
 *   - Ownership scoping is applied *after* compilation, in the service, from
 *     the request context — never from anything the model produced.
 *
 * If the model hallucinates, the worst case is a validation error, not a
 * database compromise.
 */

const ENTITIES = ['leads', 'customers', 'deals', 'support_tickets'] as const;
export type SearchEntity = (typeof ENTITIES)[number];

/** Free-text is matched against the repository's own searchable fields. */
const search_text = z.string().min(1).max(100).optional();

/** Relative date windows only — no arbitrary date arithmetic from the model. */
const DATE_WINDOWS = [
  'today',
  'last_7_days',
  'last_30_days',
  'last_90_days',
  'this_month',
  'this_quarter',
  'this_year',
] as const;
export type DateWindow = (typeof DATE_WINDOWS)[number];

const date_window = z.enum(DATE_WINDOWS).optional();

const money = z.number().nonnegative().max(1_000_000_000).optional();

const lead_filters = z
  .object({
    search: search_text,
    status: z.enum(['Open', 'Pending', 'Archived', 'Converted']).optional(),
    assigned: z.enum(['me', 'anyone', 'unassigned']).optional(),
    created_within: date_window,
  })
  .strict();

const customer_filters = z
  .object({
    search: search_text,
    assigned: z.enum(['me', 'anyone', 'unassigned']).optional(),
    created_within: date_window,
  })
  .strict();

const deal_filters = z
  .object({
    search: search_text,
    status: z.enum(['Open', 'Won', 'Lost', 'Pending']).optional(),
    assigned: z.enum(['me', 'anyone']).optional(),
    value_min: money,
    value_max: money,
    stage_name: z.string().min(1).max(40).optional(),
    created_within: date_window,
    closing_within: date_window,
  })
  .strict();

const ticket_filters = z
  .object({
    search: search_text,
    status: z.enum(['Open', 'InProgress', 'Resolved', 'Closed']).optional(),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
    assigned: z.enum(['me', 'anyone']).optional(),
    sla_breached: z.boolean().optional(),
    created_within: date_window,
  })
  .strict();

/**
 * A discriminated union so each entity only accepts its own fields — asking
 * for `priority` on a lead is a validation error, not a silently ignored key.
 */
export const search_plan_schema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('leads'),
    filters: lead_filters.default({}),
    explanation: z.string().max(300).optional(),
  }),
  z.object({
    entity: z.literal('customers'),
    filters: customer_filters.default({}),
    explanation: z.string().max(300).optional(),
  }),
  z.object({
    entity: z.literal('deals'),
    filters: deal_filters.default({}),
    explanation: z.string().max(300).optional(),
  }),
  z.object({
    entity: z.literal('support_tickets'),
    filters: ticket_filters.default({}),
    explanation: z.string().max(300).optional(),
  }),
]);

export type SearchPlan = z.infer<typeof search_plan_schema>;

/** Start of the requested window, or null for "no date constraint". */
export const window_start = (window: DateWindow, now = new Date()): Date => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (window) {
    case 'today':
      return start;
    case 'last_7_days':
      start.setDate(start.getDate() - 7);
      return start;
    case 'last_30_days':
      start.setDate(start.getDate() - 30);
      return start;
    case 'last_90_days':
      start.setDate(start.getDate() - 90);
      return start;
    case 'this_month':
      start.setDate(1);
      return start;
    case 'this_quarter':
      start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
      return start;
    case 'this_year':
      start.setMonth(0, 1);
      return start;
  }
};

export const window_end = (window: DateWindow, now = new Date()): Date => {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (window) {
    case 'today':
      return end;
    case 'last_7_days':
    case 'last_30_days':
    case 'last_90_days':
      return end;
    case 'this_month':
      end.setMonth(end.getMonth() + 1, 0);
      return end;
    case 'this_quarter':
      end.setMonth(Math.floor(end.getMonth() / 3) * 3 + 3, 0);
      return end;
    case 'this_year':
      end.setMonth(11, 31);
      return end;
  }
};

export interface CompileContext {
  /** Resolves "me" — taken from the request, never from the model. */
  actor_id: string;
  /** Resolves a stage name to its id, since stages live inside pipelines. */
  stage_ids_by_name?: Map<string, unknown[]>;
}

export interface CompiledSearch {
  /** Conditions for the repository query. Ownership scoping is added later. */
  filter: FilterQuery<unknown>;
  /** Free text, handed to the repository's own searchable-field matching. */
  search?: string;
}

const OWNER_FIELD: Record<SearchEntity, string> = {
  leads: 'assigned_rep_id',
  customers: 'assigned_rep_id',
  deals: 'owner_id',
  support_tickets: 'assigned_agent',
};

/**
 * Turns a validated plan into Mongo conditions.
 *
 * Every branch writes a literal field name from this file. Nothing from the
 * model is ever used as a key, only as a value that has already passed an enum
 * or a bounded number check.
 */
export const compile_filter = (plan: SearchPlan, context: CompileContext): CompiledSearch => {
  const conditions: FilterQuery<unknown>[] = [];
  const owner_field = OWNER_FIELD[plan.entity];
  const filters = plan.filters as Record<string, unknown>;

  if (typeof filters.status === 'string') {
    conditions.push({ status: filters.status });
  }

  if (filters.assigned === 'me') {
    conditions.push({ [owner_field]: context.actor_id });
  } else if (filters.assigned === 'unassigned') {
    conditions.push({ [owner_field]: { $in: [null, undefined] } });
  }

  if (filters.created_within) {
    const window = filters.created_within as DateWindow;
    conditions.push({
      created_at: { $gte: window_start(window), $lte: window_end(window) },
    });
  }

  if (plan.entity === 'deals') {
    const min = filters.value_min as number | undefined;
    const max = filters.value_max as number | undefined;
    if (min !== undefined || max !== undefined) {
      conditions.push({
        value: {
          ...(min !== undefined && { $gte: min }),
          ...(max !== undefined && { $lte: max }),
        },
      });
    }

    if (filters.closing_within) {
      const window = filters.closing_within as DateWindow;
      conditions.push({
        expected_close_date: { $gte: window_start(window), $lte: window_end(window) },
      });
    }

    if (typeof filters.stage_name === 'string') {
      // Stage names resolve to ids up front; an unknown name matches nothing
      // rather than being ignored, so the result honestly reflects the query.
      const ids = context.stage_ids_by_name?.get(filters.stage_name.toLowerCase()) ?? [];
      conditions.push({ stage_id: { $in: ids } });
    }
  }

  if (plan.entity === 'support_tickets') {
    if (typeof filters.priority === 'string') {
      conditions.push({ priority: filters.priority });
    }
    if (filters.sla_breached === true) {
      // Unanswered past the deadline, or answered after it.
      conditions.push({
        $or: [
          { first_response_at: null, sla_due_at: { $lt: new Date() } },
          { $expr: { $gt: ['$first_response_at', '$sla_due_at'] } },
        ],
      });
    } else if (filters.sla_breached === false) {
      conditions.push({
        $or: [
          { first_response_at: null, sla_due_at: { $gte: new Date() } },
          { $expr: { $lte: ['$first_response_at', '$sla_due_at'] } },
        ],
      });
    }
  }

  return {
    filter: conditions.length === 0 ? {} : { $and: conditions },
    search: typeof filters.search === 'string' ? filters.search : undefined,
  };
};

export const SEARCHABLE_ENTITIES = ENTITIES;
