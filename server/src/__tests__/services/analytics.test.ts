import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { analytics_service } from '../../services/analytics';
import Deal from '../../models/deal';
import Lead from '../../models/lead';
import Customer from '../../models/customer';
import SupportTicket, { sla_due_from } from '../../models/support-ticket';
import Activity from '../../models/activity';
import Pipeline, { IPipeline } from '../../models/pipeline';
import User from '../../models/user';
import Role from '../../models/role';
import type { IUser } from '../../models/user';
import type { IRole } from '../../models/role';
import type { ICustomer } from '../../models/customer';
import { mock_context } from '../helpers/context';
import { create_test_pipeline, stage_named, won_stage, lost_stage } from '../helpers/pipeline';

let rep: IUser;
let other_rep: IUser;
let manager: IUser;
let rep_role: IRole;
let manager_role: IRole;
let customer: ICustomer;
let pipeline: IPipeline;

const days_ago = (days: number) => new Date(Date.now() - days * 86400000);

beforeAll(async () => {
  rep_role = await Role.create({
    name: 'AnalyticsRep',
    permissions: {
      'leads.read': true,
      'deals.read': true,
      'customers.read': true,
      'support_tickets.read': true,
    },
  });
  manager_role = await Role.create({
    name: 'AnalyticsManager',
    permissions: { '*': true },
  });

  rep = await User.create({
    name: 'Analytics Rep',
    email: 'analyticsrep@example.com',
    password: 'password123',
    role_ids: [rep_role._id],
  });
  other_rep = await User.create({
    name: 'Other Analytics Rep',
    email: 'otheranalyticsrep@example.com',
    password: 'password123',
    role_ids: [rep_role._id],
  });
  manager = await User.create({
    name: 'Analytics Manager',
    email: 'analyticsmanager@example.com',
    password: 'password123',
    role_ids: [manager_role._id],
  });

  customer = await Customer.create({
    name: 'Analytics Customer',
    email: 'analyticscustomer@example.com',
    phone: '555-4444',
    assigned_rep_id: rep._id,
  });
});

beforeEach(async () => {
  await Promise.all([
    Deal.deleteMany({}),
    Lead.deleteMany({}),
    SupportTicket.deleteMany({}),
    Activity.deleteMany({}),
    Pipeline.deleteMany({}),
  ]);
  pipeline = await create_test_pipeline('Analytics Pipeline');
});

const as_rep = () => mock_context(rep, rep_role);
const as_manager = () => mock_context(manager, manager_role);

const make_deal = (overrides: Record<string, unknown> = {}) =>
  Deal.create({
    title: 'Deal',
    customer_id: customer._id,
    owner_id: rep._id,
    value: 1000,
    pipeline_id: pipeline._id,
    stage_id: stage_named(pipeline, 'Proposal')._id,
    stage_entered_at: new Date(),
    ...overrides,
  });

describe('dashboardSummary', () => {
  it('counts the whole dataset, not one page', async () => {
    // The old dashboard reduced a single fetched page, so "Total Leads" was
    // capped at the page size.
    for (let i = 0; i < 25; i += 1) {
      await Lead.create({
        name: `Lead ${i}`,
        email: `lead${i}@analytics.test`,
        phone: '1',
        assigned_rep_id: rep._id,
      });
    }

    const summary = await analytics_service.dashboard_summary(as_rep());
    expect(summary.total_leads).toBe(25);
  });

  it('excludes archived leads from the headline count', async () => {
    await Lead.create({
      name: 'Live',
      email: 'live@analytics.test',
      phone: '1',
      assigned_rep_id: rep._id,
    });
    await Lead.create({
      name: 'Archived',
      email: 'archived@analytics.test',
      phone: '1',
      status: 'Archived',
      assigned_rep_id: rep._id,
    });

    expect((await analytics_service.dashboard_summary(as_rep())).total_leads).toBe(1);
  });

  it('sums open deal value and excludes closed deals', async () => {
    await make_deal({ value: 1000, status: 'Open' });
    await make_deal({ value: 500, status: 'Pending' });
    await make_deal({ value: 9999, status: 'Won', stage_id: won_stage(pipeline)._id });

    const summary = await analytics_service.dashboard_summary(as_rep());

    expect(summary.open_deals).toBe(2);
    expect(summary.open_deal_value).toBe(1500);
  });

  it('weights pipeline value by stage probability', async () => {
    // Proposal is 50%, Negotiation is 75%.
    await make_deal({ value: 1000, stage_id: stage_named(pipeline, 'Proposal')._id });
    await make_deal({ value: 1000, stage_id: stage_named(pipeline, 'Negotiation')._id });

    const summary = await analytics_service.dashboard_summary(as_rep());

    expect(summary.weighted_pipeline_value).toBe(1250);
  });

  it('scopes every figure to the caller', async () => {
    await make_deal({ value: 1000, owner_id: rep._id });
    await make_deal({ value: 7000, owner_id: other_rep._id });

    const mine = await analytics_service.dashboard_summary(as_rep());
    const all = await analytics_service.dashboard_summary(as_manager());

    expect(mine.open_deal_value).toBe(1000);
    expect(all.open_deal_value).toBe(8000);
  });

  it('counts only the caller overdue tasks', async () => {
    const lead = await Lead.create({
      name: 'Task Lead',
      email: 'tasklead@analytics.test',
      phone: '1',
      assigned_rep_id: rep._id,
    });
    await Activity.create({
      type: 'Task',
      subject: 'Overdue',
      target_type: 'Lead',
      target_id: lead._id,
      owner_id: rep._id,
      due_at: days_ago(2),
    });
    await Activity.create({
      type: 'Task',
      subject: 'Future',
      target_type: 'Lead',
      target_id: lead._id,
      owner_id: rep._id,
      due_at: new Date(Date.now() + 86400000),
    });

    expect((await analytics_service.dashboard_summary(as_rep())).overdue_tasks).toBe(1);
  });
});

describe('pipelineFunnel', () => {
  it('returns every stage, including empty ones', async () => {
    await make_deal({ stage_id: stage_named(pipeline, 'Proposal')._id });

    const funnel = await analytics_service.pipeline_funnel(as_rep(), String(pipeline._id));

    // An empty stage is the interesting part of a funnel; omitting it hides
    // where deals are not arriving.
    expect(funnel).toHaveLength(pipeline.stages.length);
    expect(funnel.map((f) => f.stage_name)).toContain('Prospecting');
    expect(funnel.find((f) => f.stage_name === 'Prospecting')!.deal_count).toBe(0);
  });

  it('returns stages in pipeline order', async () => {
    const funnel = await analytics_service.pipeline_funnel(as_rep(), String(pipeline._id));

    const orders = funnel.map((f) => f.display_order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('aggregates count, value and weighted value per stage', async () => {
    await make_deal({ value: 1000, stage_id: stage_named(pipeline, 'Proposal')._id });
    await make_deal({ value: 3000, stage_id: stage_named(pipeline, 'Proposal')._id });

    const funnel = await analytics_service.pipeline_funnel(as_rep(), String(pipeline._id));
    const proposal = funnel.find((f) => f.stage_name === 'Proposal')!;

    expect(proposal.deal_count).toBe(2);
    expect(proposal.total_value).toBe(4000);
    expect(proposal.weighted_value).toBe(2000); // 50% probability
  });

  it('reports average days in stage', async () => {
    await make_deal({ stage_entered_at: days_ago(10) });
    await make_deal({ stage_entered_at: days_ago(20) });

    const funnel = await analytics_service.pipeline_funnel(as_rep(), String(pipeline._id));
    const proposal = funnel.find((f) => f.stage_name === 'Proposal')!;

    expect(proposal.avg_days_in_stage).toBeGreaterThan(14);
    expect(proposal.avg_days_in_stage).toBeLessThan(16);
  });
});

describe('revenueOverTime', () => {
  it('groups won deal value by month', async () => {
    await make_deal({ status: 'Won', value: 1000, closed_at: days_ago(5) });
    await make_deal({ status: 'Won', value: 2000, closed_at: days_ago(6) });
    // Open deals are not revenue.
    await make_deal({ status: 'Open', value: 9999 });

    const series = await analytics_service.revenue_over_time(as_rep(), 12);
    const total = series.reduce((sum, point) => sum + point.value, 0);

    expect(total).toBe(3000);
  });

  it('returns periods in chronological order', async () => {
    await make_deal({ status: 'Won', value: 100, closed_at: days_ago(70) });
    await make_deal({ status: 'Won', value: 200, closed_at: days_ago(5) });

    const series = await analytics_service.revenue_over_time(as_rep(), 12);
    const periods = series.map((p) => p.period);

    expect(periods).toEqual([...periods].sort());
  });
});

describe('repPerformance', () => {
  it('computes win rate per owner', async () => {
    await make_deal({ owner_id: rep._id, status: 'Won', value: 1000, stage_id: won_stage(pipeline)._id });
    await make_deal({ owner_id: rep._id, status: 'Won', value: 500, stage_id: won_stage(pipeline)._id });
    await make_deal({
      owner_id: rep._id,
      status: 'Lost',
      lost_reason: 'Price',
      stage_id: lost_stage(pipeline)._id,
    });

    const rows = await analytics_service.rep_performance(as_manager());
    const row = rows.find((r) => r.user_id === String(rep._id))!;

    expect(row.won_deals).toBe(2);
    expect(row.lost_deals).toBe(1);
    expect(row.won_value).toBe(1500);
    expect(row.win_rate).toBeCloseTo(66.67, 1);
  });

  it('reports a null win rate when nothing has closed', async () => {
    await make_deal({ owner_id: rep._id, status: 'Open' });

    const rows = await analytics_service.rep_performance(as_manager());
    const row = rows.find((r) => r.user_id === String(rep._id))!;

    // A rep with no closed deals has no win rate, which is not 0%.
    expect(row.win_rate).toBeNull();
  });
});

describe('leadFunnel', () => {
  it('counts leads by status', async () => {
    await Lead.create({
      name: 'A',
      email: 'a@funnel.test',
      phone: '1',
      status: 'Open',
      assigned_rep_id: rep._id,
    });
    await Lead.create({
      name: 'B',
      email: 'b@funnel.test',
      phone: '1',
      status: 'Converted',
      assigned_rep_id: rep._id,
    });

    const funnel = await analytics_service.lead_funnel(as_rep());
    const by_status = Object.fromEntries(funnel.map((f) => [f.status, f.count]));

    expect(by_status.Open).toBe(1);
    expect(by_status.Converted).toBe(1);
  });
});

describe('slaSummary', () => {
  const make_ticket = (overrides: Record<string, unknown> = {}) => {
    const created = days_ago(3);
    return SupportTicket.create({
      customer_id: customer._id,
      assigned_agent: rep._id,
      issue_summary: 'Issue',
      priority: 'Medium',
      sla_due_at: sla_due_from('Medium', created),
      ...overrides,
    });
  };

  it('reports 100% compliance when there are no tickets', async () => {
    const summary = await analytics_service.sla_summary(as_manager());

    expect(summary.total).toBe(0);
    expect(summary.compliance_rate).toBe(100);
  });

  it('counts a late first response as a breach', async () => {
    const created = days_ago(3);
    await make_ticket({
      // Answered two days after a 24-hour deadline.
      sla_due_at: new Date(created.getTime() + 24 * 3600000),
      first_response_at: new Date(created.getTime() + 72 * 3600000),
    });
    await make_ticket({
      sla_due_at: new Date(created.getTime() + 24 * 3600000),
      first_response_at: new Date(created.getTime() + 2 * 3600000),
    });

    const summary = await analytics_service.sla_summary(as_manager());

    expect(summary.total).toBe(2);
    expect(summary.breached).toBe(1);
    expect(summary.compliance_rate).toBe(50);
  });

  it('counts an unanswered ticket past its deadline as a breach', async () => {
    await make_ticket({ sla_due_at: days_ago(1), first_response_at: undefined });

    const summary = await analytics_service.sla_summary(as_manager());
    expect(summary.breached).toBe(1);
  });
});
