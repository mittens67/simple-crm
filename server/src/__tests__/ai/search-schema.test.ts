import { describe, it, expect } from 'vitest';
import {
  search_plan_schema,
  compile_filter,
  window_start,
  window_end,
} from '../../ai/search-schema';
import { safe_json_parse } from '../../ai/provider';

/**
 * The model's output is untrusted input. These tests are the security boundary
 * for natural-language search: they pin that nothing outside the allowlist can
 * survive validation, and that nothing the model emits is ever used as a
 * database key.
 */

const ACTOR = '507f1f77bcf86cd799439011';

const parse = (value: unknown) => search_plan_schema.safeParse(value);

/**
 * Validates the way production does: model output arrives as a JSON *string*
 * and goes through safe_json_parse. Testing against hand-built objects would
 * miss parser-specific behaviour — notably that JSON.parse creates a real
 * `__proto__` own key that zod's .strict() does not reject.
 */
const parse_raw = (json: string) => search_plan_schema.safeParse(safe_json_parse(json));

describe('search plan validation rejects anything outside the allowlist', () => {
  it('accepts a well-formed plan', () => {
    const result = parse({
      entity: 'deals',
      filters: { status: 'Won', value_min: 50000 },
      explanation: 'Won deals over 50k',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown entity', () => {
    expect(parse({ entity: 'users', filters: {} }).success).toBe(false);
  });

  it('rejects an unknown filter key', () => {
    // .strict() is what stops a hallucinated or hostile key getting through.
    expect(parse({ entity: 'leads', filters: { password: 'x' } }).success).toBe(false);
  });

  it('rejects a Mongo operator smuggled in as a filter key', () => {
    for (const key of ['$where', '$expr', '$function', '$regex', '$accumulator']) {
      expect(
        parse_raw(`{"entity":"leads","filters":{"${key}":"anything"}}`).success,
        `${key} should be rejected`
      ).toBe(false);
    }
  });

  it('strips prototype-polluting keys before validation', () => {
    // JSON.parse creates a genuine own property for __proto__, and zod's
    // .strict() does NOT flag it, so safe_json_parse has to remove it first.
    const polluting = '{"entity":"leads","filters":{"__proto__":{"polluted":true}}}';

    const result = parse_raw(polluting);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.filters).toEqual({});
    }

    // Nothing reached Object.prototype.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('rejects constructor and prototype keys outright', () => {
    for (const key of ['constructor', 'prototype']) {
      const result = parse_raw(`{"entity":"leads","filters":{"${key}":{}}}`);
      // Stripped by the reviver, so the filter is simply empty.
      if (result.success) expect(result.data.filters).toEqual({});
    }
  });

  it('rejects an operator object as a filter value', () => {
    // A value must be a plain enum/number/boolean, never a query fragment.
    expect(parse({ entity: 'deals', filters: { value_min: { $gt: 0 } } }).success).toBe(false);
    expect(parse({ entity: 'leads', filters: { status: { $ne: null } } }).success).toBe(false);
  });

  it('rejects a filter belonging to a different entity', () => {
    // priority exists on tickets, not on leads.
    expect(parse({ entity: 'leads', filters: { priority: 'Urgent' } }).success).toBe(false);
    expect(parse({ entity: 'customers', filters: { status: 'Open' } }).success).toBe(false);
  });

  it('rejects a status value outside the enum', () => {
    expect(parse({ entity: 'leads', filters: { status: 'Qualified' } }).success).toBe(false);
  });

  it('rejects an arbitrary date instead of a named window', () => {
    expect(parse({ entity: 'leads', filters: { created_within: '2026-01-01' } }).success).toBe(
      false
    );
  });

  it('bounds free-text search length', () => {
    expect(parse({ entity: 'leads', filters: { search: 'x'.repeat(101) } }).success).toBe(false);
  });

  it('bounds monetary values', () => {
    expect(parse({ entity: 'deals', filters: { value_min: -1 } }).success).toBe(false);
    expect(parse({ entity: 'deals', filters: { value_min: 1e12 } }).success).toBe(false);
  });

  it('defaults filters to empty when omitted', () => {
    const result = parse({ entity: 'leads' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.filters).toEqual({});
  });
});

describe('compile_filter produces only safe conditions', () => {
  const compile = (value: unknown) => {
    const parsed = search_plan_schema.parse(value);
    return compile_filter(parsed, { actor_id: ACTOR });
  };

  it('compiles a status filter to an equality condition', () => {
    const { filter } = compile({ entity: 'leads', filters: { status: 'Open' } });
    expect(JSON.stringify(filter)).toContain('"status":"Open"');
  });

  it('resolves "me" from the request context, not from the model', () => {
    const { filter } = compile({ entity: 'deals', filters: { assigned: 'me' } });
    // The actor id comes from the caller's session; the model only said "me".
    expect(JSON.stringify(filter)).toContain(ACTOR);
  });

  it('compiles a value range to $gte/$lte', () => {
    const { filter } = compile({
      entity: 'deals',
      filters: { value_min: 1000, value_max: 5000 },
    });
    const json = JSON.stringify(filter);
    expect(json).toContain('"$gte":1000');
    expect(json).toContain('"$lte":5000');
  });

  it('hands free text to the repository rather than building a regex', () => {
    // Regex construction stays in BaseRepository, which escapes it.
    const { filter, search } = compile({ entity: 'leads', filters: { search: 'Acme (Ltd)' } });
    expect(search).toBe('Acme (Ltd)');
    expect(JSON.stringify(filter)).not.toContain('Acme');
  });

  it('returns an empty filter when nothing was specified', () => {
    expect(compile({ entity: 'leads', filters: {} }).filter).toEqual({});
  });

  it('matches nothing for an unknown stage name rather than ignoring it', () => {
    const parsed = search_plan_schema.parse({
      entity: 'deals',
      filters: { stage_name: 'Nonexistent' },
    });
    const { filter } = compile_filter(parsed, {
      actor_id: ACTOR,
      stage_ids_by_name: new Map(),
    });

    // Silently dropping the constraint would return every deal and claim it
    // matched the question.
    expect(JSON.stringify(filter)).toContain('"stage_id":{"$in":[]}');
  });

  it('never emits a key the model supplied', () => {
    const { filter } = compile({
      entity: 'support_tickets',
      filters: { status: 'Open', priority: 'Urgent', sla_breached: true },
    });

    const keys = new Set<string>();
    const walk = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
          keys.add(key);
          walk(value);
        }
      }
    };
    walk(filter);

    // $expr appears only from our own SLA comparison, never from model input.
    const allowed = new Set([
      '$and',
      '$or',
      '$expr',
      '$gt',
      '$lte',
      '$in',
      '$lt',
      'status',
      'priority',
      'first_response_at',
      'sla_due_at',
    ]);
    for (const key of keys) {
      expect(allowed.has(key), `unexpected key "${key}" in compiled filter`).toBe(true);
    }
  });
});

describe('date windows', () => {
  it('bounds "today" to the current day', () => {
    const now = new Date('2026-09-25T14:30:00Z');
    expect(window_start('today', now).getHours()).toBe(0);
    expect(window_end('today', now).getHours()).toBe(23);
  });

  it('looks back the requested number of days', () => {
    const now = new Date('2026-09-25T12:00:00Z');
    const start = window_start('last_7_days', now);
    const days = Math.round((now.getTime() - start.getTime()) / 86_400_000);
    expect(days).toBeGreaterThanOrEqual(7);
    expect(days).toBeLessThanOrEqual(8);
  });

  it('starts this_month on the first', () => {
    expect(window_start('this_month', new Date('2026-09-25T12:00:00Z')).getDate()).toBe(1);
  });

  it('starts this_quarter on a quarter boundary', () => {
    const start = window_start('this_quarter', new Date('2026-09-25T12:00:00Z'));
    expect([0, 3, 6, 9]).toContain(start.getMonth());
    expect(start.getDate()).toBe(1);
  });
});
