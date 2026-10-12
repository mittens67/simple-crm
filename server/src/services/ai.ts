import { Types } from 'mongoose';
import { z } from 'zod';
import Lead, { ILead } from '../models/lead';
import Customer from '../models/customer';
import Deal from '../models/deal';
import SupportTicket from '../models/support-ticket';
import Activity from '../models/activity';
import Pipeline from '../models/pipeline';
import { env } from '../config/env';
import { ApolloContext } from '../graphql/context';
import { require_permission } from '../auth/authorize';
import { scope_filter_for } from '../core/scoping';
import { assert_found, audit } from '../core/service-helpers';
import { Page, clamp_limit } from '../core/base-repository';
import { lead_repository } from '../repositories/lead';
import { customer_repository } from '../repositories/customer';
import { deal_repository } from '../repositories/deal';
import { support_ticket_repository } from '../repositories/support';
import { generate_json, generate_text, ai_status, get_provider } from '../ai/client';
import {
  search_plan_schema,
  compile_filter,
  SearchPlan,
  SearchEntity,
} from '../ai/search-schema';
import {
  LEAD_SCORE_SYSTEM,
  lead_score_prompt,
  NL_SEARCH_SYSTEM,
  nl_search_prompt,
  SUMMARY_SYSTEM,
  summary_prompt,
  DRAFT_EMAIL_SYSTEM,
  draft_email_prompt,
} from '../ai/prompts';
import { ValidationError } from '../utils/errors';

/** The structured shape a lead score must arrive in. */
const lead_score_schema = z.object({
  score: z.number().int().min(0).max(100),
  rationale: z.string().min(1).max(600),
  next_action: z.string().min(1).max(300),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type LeadScore = z.infer<typeof lead_score_schema>;

/**
 * Builds the record the model sees.
 *
 * Only the fields relevant to scoring are included — no ids of other users, no
 * internal notes from unrelated records, nothing that would leak across the
 * ownership boundary. Smaller payloads are also cheaper and sharper.
 */
const lead_snapshot = (lead: ILead, activities: Array<Record<string, unknown>>) => ({
  status: lead.status,
  has_assigned_rep: Boolean(lead.assigned_rep_id),
  days_since_created: Math.floor((Date.now() - lead.created_at.getTime()) / 86_400_000),
  days_since_updated: Math.floor((Date.now() - lead.updated_at.getTime()) / 86_400_000),
  has_phone: Boolean(lead.phone),
  notes_length: lead.sales_notes?.length ?? 0,
  sales_notes: lead.sales_notes?.slice(0, 1000),
  activity_count: activities.length,
  recent_activity: activities,
});

const activity_snapshot = async (target_type: string, target_id: Types.ObjectId, limit = 15) => {
  const activities = await Activity.find({ target_type, target_id })
    .sort({ created_at: -1 })
    .limit(limit);

  return activities.map((activity) => ({
    type: activity.type,
    subject: activity.subject,
    body: activity.body?.slice(0, 500),
    days_ago: Math.floor((Date.now() - activity.created_at.getTime()) / 86_400_000),
    completed: Boolean(activity.completed_at),
  }));
};

export class AiService {
  status() {
    return ai_status();
  }

  /**
   * Scores a lead and caches the result on the document.
   *
   * Callers get the cached score unless it is stale or a refresh is asked for,
   * so opening a list of scored leads costs nothing. Free tiers have low
   * request ceilings and this is the difference between the feature being
   * usable and exhausting quota on the first page load.
   */
  async score_lead(context: ApolloContext, id: string, refresh = false): Promise<ILead> {
    const actor = require_permission(context, 'leads.update');

    const lead = assert_found(
      await lead_repository.find_by_id(id, scope_filter_for(context, 'leads', 'assigned_rep_id', 'update')),
      'Lead'
    );

    const is_fresh =
      lead.ai_scored_at &&
      Date.now() - lead.ai_scored_at.getTime() < env.AI_SCORE_TTL_MS &&
      lead.ai_provider === get_provider().name;

    if (is_fresh && !refresh) return lead;

    const activities = await activity_snapshot('Lead', lead._id as Types.ObjectId);

    const result = await generate_json(lead_score_schema, {
      actor_id: String(actor._id),
      system: LEAD_SCORE_SYSTEM,
      prompt: lead_score_prompt(lead_snapshot(lead, activities)),
      temperature: 0,
      max_tokens: 400,
      bypass_cache: refresh,
    });

    const updated = assert_found(
      await lead_repository.update(id, {
        ai_score: result.score,
        ai_rationale: result.rationale,
        ai_next_action: result.next_action,
        ai_confidence: result.confidence,
        ai_scored_at: new Date(),
        ai_provider: get_provider().name,
      }),
      'Lead'
    );

    await audit(actor, 'Lead scored', {
      lead_id: String(updated._id),
      score: result.score,
      provider: get_provider().name,
    });

    return updated;
  }

  /**
   * Scores several leads in one action, for "score my unscored leads".
   * Sequential on purpose: free tiers rate-limit per minute, and a burst of
   * parallel requests is the fastest way to get throttled.
   */
  async score_leads_bulk(context: ApolloContext, limit = 5): Promise<ILead[]> {
    require_permission(context, 'leads.update');

    const scope = scope_filter_for(context, 'leads', 'assigned_rep_id', 'update');
    const candidates = await Lead.find({
      $and: [scope, { status: { $in: ['Open', 'Pending'] }, ai_scored_at: null }],
    })
      .sort({ created_at: -1 })
      .limit(Math.min(Math.max(1, limit), 10));

    const scored: ILead[] = [];
    for (const lead of candidates) {
      scored.push(await this.score_lead(context, String(lead._id)));
    }
    return scored;
  }

  /**
   * Compiles a natural-language question into a validated search plan and runs
   * it.
   *
   * The model never sees the database and never produces a query. It produces
   * a closed filter object (ai/search-schema.ts), which is validated, compiled
   * to Mongo here, and then intersected with the caller's ownership scope —
   * so a question can never widen what someone is allowed to see.
   */
  async search(
    context: ApolloContext,
    question: string,
    limit?: number
  ): Promise<{ plan: SearchPlan; entity: SearchEntity; results: Page<unknown> }> {
    const actor = require_permission(context, 'leads.read');

    const trimmed = question.trim();
    if (!trimmed) throw new ValidationError('A search question is required');
    if (trimmed.length > 300) {
      throw new ValidationError('Search question must be 300 characters or less');
    }

    const plan = await generate_json(search_plan_schema, {
      actor_id: String(actor._id),
      system: NL_SEARCH_SYSTEM,
      prompt: nl_search_prompt(trimmed),
      temperature: 0,
      max_tokens: 400,
    });

    // Reading a different entity needs that entity's own permission; the
    // question cannot grant it.
    const permission_by_entity: Record<SearchEntity, Parameters<typeof require_permission>[1]> = {
      leads: 'leads.read',
      customers: 'customers.read',
      deals: 'deals.read',
      support_tickets: 'support_tickets.read',
    };
    require_permission(context, permission_by_entity[plan.entity]);

    const stage_ids_by_name =
      plan.entity === 'deals' ? await this.stage_index() : undefined;

    const compiled = compile_filter(plan, {
      actor_id: String(actor._id),
      stage_ids_by_name,
    });

    const owner_field: Record<SearchEntity, string> = {
      leads: 'assigned_rep_id',
      customers: 'assigned_rep_id',
      deals: 'owner_id',
      support_tickets: 'assigned_agent',
    };
    const resource: Record<SearchEntity, 'leads' | 'customers' | 'deals' | 'support_tickets'> = {
      leads: 'leads',
      customers: 'customers',
      deals: 'deals',
      support_tickets: 'support_tickets',
    };

    // Ownership scoping comes from the request context and is ANDed on top,
    // never supplied by the model.
    const scope = scope_filter_for(context, resource[plan.entity], owner_field[plan.entity]);
    const filter =
      Object.keys(scope).length > 0 ? { $and: [compiled.filter, scope] } : compiled.filter;

    const repositories = {
      leads: lead_repository,
      customers: customer_repository,
      deals: deal_repository,
      support_tickets: support_ticket_repository,
    };

    const results = await repositories[plan.entity].find_page({
      filter,
      search: compiled.search,
      limit: clamp_limit(limit),
    });

    return { plan, entity: plan.entity, results: results as Page<unknown> };
  }

  /** Maps lower-cased stage names to every id carrying that name. */
  private async stage_index(): Promise<Map<string, unknown[]>> {
    const pipelines = await Pipeline.find();
    const index = new Map<string, unknown[]>();
    for (const pipeline of pipelines) {
      for (const stage of pipeline.stages) {
        const key = stage.name.toLowerCase();
        index.set(key, [...(index.get(key) ?? []), stage._id]);
      }
    }
    return index;
  }

  /** Summarises a record's activity timeline. */
  async summarise(
    context: ApolloContext,
    target_type: 'Lead' | 'Customer' | 'Deal' | 'SupportTicket',
    target_id: string
  ): Promise<string> {
    const { actor, label } = await this.resolve_target(context, target_type, target_id);
    const activities = await activity_snapshot(target_type, new Types.ObjectId(target_id), 25);

    if (activities.length === 0) {
      // Cheaper and more honest than asking a model to summarise nothing.
      return 'There is no recorded activity for this record yet.';
    }

    return generate_text({
      actor_id: String(actor._id),
      system: SUMMARY_SYSTEM,
      prompt: summary_prompt(label, activities),
      temperature: 0.2,
      max_tokens: 400,
    });
  }

  /** Drafts a follow-up email from the record's history. */
  async draft_email(
    context: ApolloContext,
    target_type: 'Lead' | 'Customer' | 'Deal' | 'SupportTicket',
    target_id: string,
    instruction?: string
  ): Promise<string> {
    const { actor, label } = await this.resolve_target(context, target_type, target_id);
    const activities = await activity_snapshot(target_type, new Types.ObjectId(target_id), 15);

    if (instruction && instruction.length > 300) {
      throw new ValidationError('Instruction must be 300 characters or less');
    }

    return generate_text({
      actor_id: String(actor._id),
      system: DRAFT_EMAIL_SYSTEM,
      prompt: draft_email_prompt(label, activities, instruction),
      // Slightly loose: this is prose, and identical emails to every contact
      // would be worse than mild variation.
      temperature: 0.4,
      max_tokens: 600,
      bypass_cache: true,
    });
  }

  /**
   * Checks the caller may actually read the record before any of its content
   * reaches a third-party API, and returns a human label for the prompt.
   */
  private async resolve_target(
    context: ApolloContext,
    target_type: 'Lead' | 'Customer' | 'Deal' | 'SupportTicket',
    target_id: string
  ) {
    if (!Types.ObjectId.isValid(target_id)) {
      throw new ValidationError('target_id must be a valid id');
    }

    switch (target_type) {
      case 'Lead': {
        const actor = require_permission(context, 'leads.read');
        const lead = assert_found(
          await lead_repository.find_by_id(
            target_id,
            scope_filter_for(context, 'leads', 'assigned_rep_id')
          ),
          'Lead'
        );
        return { actor, label: lead.name };
      }
      case 'Customer': {
        const actor = require_permission(context, 'customers.read');
        const customer = assert_found(
          await customer_repository.find_by_id(
            target_id,
            scope_filter_for(context, 'customers', 'assigned_rep_id')
          ),
          'Customer'
        );
        return { actor, label: customer.name };
      }
      case 'Deal': {
        const actor = require_permission(context, 'deals.read');
        const deal = assert_found(
          await deal_repository.find_by_id(
            target_id,
            scope_filter_for(context, 'deals', 'owner_id')
          ),
          'Deal'
        );
        return { actor, label: deal.title };
      }
      case 'SupportTicket': {
        const actor = require_permission(context, 'support_tickets.read');
        const ticket = assert_found(
          await support_ticket_repository.find_by_id(
            target_id,
            scope_filter_for(context, 'support_tickets', 'assigned_agent')
          ),
          'Support ticket'
        );
        return { actor, label: ticket.issue_summary };
      }
    }
  }
}

export const ai_service = new AiService();
export { Customer, Deal, SupportTicket };
