import { FilterQuery, Types } from 'mongoose';
import Lead from '../models/lead';
import Customer from '../models/customer';
import Deal from '../models/deal';
import Activity from '../models/activity';
import SupportTicket from '../models/support-ticket';
import Pipeline from '../models/pipeline';
import { ApolloContext } from '../graphql/context';
import { can, require_auth, require_permission } from '../auth/authorize';
import { ForbiddenError } from '../utils/errors';
import { scope_filter_for } from '../core/scoping';
import { pipeline_service } from './pipeline';

/**
 * Reporting runs as MongoDB aggregations rather than in the browser.
 *
 * The dashboard previously fetched four full lists and reduced them client
 * side, which meant every headline number described whatever page happened to
 * load — "Total Leads" was capped at the page size. It also downloaded every
 * record to compute eight integers.
 *
 * Every pipeline below is scoped the same way the corresponding list query is,
 * so a rep's dashboard reports on their own book of business and a manager's
 * reports on the team's.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Every figure is nullable, and null means "you are not allowed to see this"
 * rather than "zero".
 *
 * The summary spans four resources, so gating the whole thing on one
 * permission was wrong in both directions: a support agent has no `leads.read`
 * and so got no dashboard at all — not even their own ticket count — while a
 * sales rep was handed a ticket figure they have no permission to read. The UI
 * renders a tile only when its value came back.
 */
export interface DashboardSummary {
  total_leads: number | null;
  total_customers: number | null;
  open_deals: number | null;
  open_deal_value: number | null;
  weighted_pipeline_value: number | null;
  won_value_this_month: number | null;
  open_tickets: number | null;
  overdue_tasks: number;
}

export class AnalyticsService {
  private deal_scope(context: ApolloContext) {
    return scope_filter_for(context, 'deals', 'owner_id');
  }

  async dashboard_summary(context: ApolloContext): Promise<DashboardSummary> {
    const actor = require_auth(context);

    const can_leads = can(context, 'leads.read');
    const can_customers = can(context, 'customers.read');
    const can_deals = can(context, 'deals.read');
    const can_tickets = can(context, 'support_tickets.read');

    // Someone with none of the reporting resources has no business on this
    // screen at all — that is a real authorization failure, not an empty one.
    if (!can_leads && !can_customers && !can_deals && !can_tickets) {
      throw new ForbiddenError('Missing permission: leads.read');
    }

    const start_of_month = new Date();
    start_of_month.setDate(1);
    start_of_month.setHours(0, 0, 0, 0);

    const deal_scope = this.deal_scope(context);

    const [total_leads, total_customers, open_agg, won_agg, open_tickets, overdue_tasks, weighted] =
      await Promise.all([
        can_leads
          ? Lead.countDocuments({
              ...scope_filter_for(context, 'leads', 'assigned_rep_id'),
              status: { $ne: 'Archived' },
            } as FilterQuery<unknown>)
          : null,
        can_customers
          ? Customer.countDocuments(
              scope_filter_for(context, 'customers', 'assigned_rep_id') as FilterQuery<unknown>
            )
          : null,
        can_deals
          ? Deal.aggregate([
              { $match: { ...deal_scope, status: { $in: ['Open', 'Pending'] } } },
              { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$value' } } },
            ])
          : null,
        can_deals
          ? Deal.aggregate([
              { $match: { ...deal_scope, status: 'Won', closed_at: { $gte: start_of_month } } },
              { $group: { _id: null, value: { $sum: '$value' } } },
            ])
          : null,
        can_tickets
          ? SupportTicket.countDocuments({
              ...scope_filter_for(context, 'support_tickets', 'assigned_agent'),
              status: { $in: ['Open', 'InProgress'] },
            } as FilterQuery<unknown>)
          : null,
        // Tasks are the caller's own, so this needs no resource permission.
        Activity.countDocuments({
          type: 'Task',
          owner_id: actor._id,
          completed_at: null,
          due_at: { $lt: new Date() },
        } as FilterQuery<unknown>),
        can_deals ? this.weighted_pipeline_value(context) : null,
      ]);

    return {
      total_leads,
      total_customers,
      open_deals: can_deals ? (open_agg?.[0]?.count ?? 0) : null,
      open_deal_value: can_deals ? (open_agg?.[0]?.value ?? 0) : null,
      weighted_pipeline_value: weighted,
      won_value_this_month: can_deals ? (won_agg?.[0]?.value ?? 0) : null,
      open_tickets,
      overdue_tasks,
    };
  }

  /**
   * Stage probabilities live in the pipeline document rather than on the deal,
   * so the weighting is applied by joining the two with $lookup and $unwind
   * onto the matching stage subdocument.
   */
  private async weighted_pipeline_value(context: ApolloContext): Promise<number> {
    const result = await Deal.aggregate([
      { $match: { ...this.deal_scope(context), status: { $in: ['Open', 'Pending'] } } },
      {
        $lookup: {
          from: Pipeline.collection.name,
          localField: 'pipeline_id',
          foreignField: '_id',
          as: 'pipeline',
        },
      },
      { $unwind: '$pipeline' },
      {
        $addFields: {
          stage: {
            $first: {
              $filter: {
                input: '$pipeline.stages',
                cond: { $eq: ['$$this._id', '$stage_id'] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          weighted: {
            $sum: { $multiply: ['$value', { $divide: [{ $ifNull: ['$stage.probability', 0] }, 100] }] },
          },
        },
      },
    ]);

    return result[0]?.weighted ?? 0;
  }

  async pipeline_funnel(context: ApolloContext, pipeline_id?: string | null) {
    require_permission(context, 'deals.read');

    const pipeline = pipeline_id
      ? await pipeline_service.get(context, pipeline_id)
      : await pipeline_service.require_default();

    const grouped = await Deal.aggregate([
      {
        $match: {
          ...this.deal_scope(context),
          pipeline_id: pipeline._id,
          status: { $in: ['Open', 'Pending'] },
        },
      },
      {
        $group: {
          _id: '$stage_id',
          deal_count: { $sum: 1 },
          total_value: { $sum: '$value' },
          avg_ms_in_stage: { $avg: { $subtract: [new Date(), '$stage_entered_at'] } },
        },
      },
    ]);

    const by_stage = new Map(grouped.map((row) => [String(row._id), row]));

    // Stages with no deals must still appear, or the funnel silently omits
    // the empty part of the pipeline — which is the interesting part.
    return [...pipeline.stages]
      .sort((a, b) => a.display_order - b.display_order)
      .map((stage) => {
        const row = by_stage.get(String(stage._id));
        const total_value = row?.total_value ?? 0;
        return {
          stage_id: String(stage._id),
          stage_name: stage.name,
          display_order: stage.display_order,
          probability: stage.probability,
          deal_count: row?.deal_count ?? 0,
          total_value,
          weighted_value: (total_value * stage.probability) / 100,
          avg_days_in_stage: row?.avg_ms_in_stage ? row.avg_ms_in_stage / MS_PER_DAY : 0,
        };
      });
  }

  async revenue_over_time(context: ApolloContext, months = 12) {
    require_permission(context, 'deals.read');

    const since = new Date();
    since.setMonth(since.getMonth() - Math.max(1, Math.min(months, 36)));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await Deal.aggregate([
      { $match: { ...this.deal_scope(context), status: 'Won', closed_at: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-01', date: '$closed_at' } },
          count: { $sum: 1 },
          value: { $sum: '$value' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return rows.map((row) => ({ period: row._id, count: row.count, value: row.value }));
  }

  async lead_funnel(context: ApolloContext) {
    require_permission(context, 'leads.read');

    const rows = await Lead.aggregate([
      { $match: scope_filter_for(context, 'leads', 'assigned_rep_id') },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return rows.map((row) => ({ status: row._id, count: row.count }));
  }

  async rep_performance(context: ApolloContext) {
    require_permission(context, 'deals.read');

    const rows = await Deal.aggregate([
      { $match: this.deal_scope(context) },
      {
        $group: {
          _id: '$owner_id',
          open_deals: {
            $sum: { $cond: [{ $in: ['$status', ['Open', 'Pending']] }, 1, 0] },
          },
          won_deals: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
          lost_deals: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
          won_value: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, '$value', 0] } },
        },
      },
      {
        $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'owner' },
      },
      { $unwind: '$owner' },
      { $sort: { won_value: -1 } },
    ]);

    return rows.map((row) => {
      const closed = row.won_deals + row.lost_deals;
      return {
        user_id: String(row._id),
        name: row.owner.name,
        open_deals: row.open_deals,
        won_deals: row.won_deals,
        lost_deals: row.lost_deals,
        won_value: row.won_value,
        // Undefined rather than 0 when nothing has closed — a rep with no
        // closed deals has no win rate, which is not the same as a 0% one.
        win_rate: closed > 0 ? (row.won_deals / closed) * 100 : null,
      };
    });
  }

  async sla_summary(context: ApolloContext) {
    require_permission(context, 'support_tickets.read');

    const scope = scope_filter_for(context, 'support_tickets', 'assigned_agent');
    const now = new Date();

    const rows = await SupportTicket.aggregate([
      { $match: scope },
      {
        $addFields: {
          responded_late: {
            $cond: [
              { $ifNull: ['$first_response_at', false] },
              { $gt: ['$first_response_at', '$sla_due_at'] },
              { $gt: [now, '$sla_due_at'] },
            ],
          },
          response_ms: {
            $cond: [
              { $ifNull: ['$first_response_at', false] },
              { $subtract: ['$first_response_at', '$created_at'] },
              null,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          breached: { $sum: { $cond: ['$responded_late', 1, 0] } },
          avg_response_ms: { $avg: '$response_ms' },
        },
      },
    ]);

    const row = rows[0];
    const total = row?.total ?? 0;
    const breached = row?.breached ?? 0;

    return {
      total,
      breached,
      compliance_rate: total > 0 ? ((total - breached) / total) * 100 : 100,
      avg_first_response_hours: row?.avg_response_ms ? row.avg_response_ms / (1000 * 60 * 60) : null,
    };
  }
}

export const analytics_service = new AnalyticsService();
export { Types };
