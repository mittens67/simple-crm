import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { Types } from 'mongoose';
import Role from '../../models/role';
import User from '../../models/user';
import Lead from '../../models/lead';
import Customer from '../../models/customer';
import Deal from '../../models/deal';
import Pipeline from '../../models/pipeline';
import Activity from '../../models/activity';
import SupportTicket from '../../models/support-ticket';
import { create_demo_data, clear_demo_data, has_demo_data } from '../../scripts/demo-data';

// The demo dataset is what makes broken pages visible — an empty CRM hid a
// crash on the Deals page for the entire life of the project. It therefore
// needs to be exercised like any other code.
describe('demo data generation', () => {
  let sales_rep_ids: Types.ObjectId[];
  let support_agent_ids: Types.ObjectId[];

  beforeAll(async () => {
    const sales_role = await Role.create({ name: 'SalesSeed', permissions: { 'leads.*': true } });
    const support_role = await Role.create({
      name: 'SupportSeed',
      permissions: { 'support_tickets.*': true },
    });

    const reps = await User.create([
      { name: 'Rep One', email: 'rep1@seed.test', password: 'x', role_ids: [sales_role._id] },
      { name: 'Rep Two', email: 'rep2@seed.test', password: 'x', role_ids: [sales_role._id] },
    ]);
    const agents = await User.create([
      { name: 'Agent One', email: 'agent1@seed.test', password: 'x', role_ids: [support_role._id] },
    ]);

    sales_rep_ids = reps.map((r) => r._id as Types.ObjectId);
    support_agent_ids = agents.map((a) => a._id as Types.ObjectId);
  });

  afterEach(async () => {
    await clear_demo_data();
  });

  it('creates records across every CRM collection', async () => {
    const counts = await create_demo_data({ sales_rep_ids, support_agent_ids });

    expect(await Customer.countDocuments()).toBe(counts.customers);
    expect(await Lead.countDocuments()).toBe(counts.leads);
    expect(await Deal.countDocuments()).toBe(counts.deals);
    expect(await SupportTicket.countDocuments()).toBe(counts.tickets);
    expect(await Activity.countDocuments()).toBe(counts.activities);
    expect(counts.leads).toBeGreaterThan(50);
  });

  it('creates a default pipeline with exactly one won and one lost stage', async () => {
    await create_demo_data({ sales_rep_ids, support_agent_ids });

    const pipeline = await Pipeline.findOne({ is_default: true });
    expect(pipeline).toBeTruthy();
    expect(pipeline!.stages.filter((s) => s.outcome === 'won')).toHaveLength(1);
    expect(pipeline!.stages.filter((s) => s.outcome === 'lost')).toHaveLength(1);
  });

  it('places every deal on a real stage of its pipeline', async () => {
    await create_demo_data({ sales_rep_ids, support_agent_ids });

    const pipeline = await Pipeline.findOne({ is_default: true });
    const stage_ids = new Set(pipeline!.stages.map((s) => String(s._id)));

    for (const deal of await Deal.find()) {
      expect(String(deal.pipeline_id)).toBe(String(pipeline!._id));
      expect(stage_ids.has(String(deal.stage_id))).toBe(true);
    }
  });

  it('puts closed deals on the matching terminal stage', async () => {
    await create_demo_data({ sales_rep_ids, support_agent_ids });

    const pipeline = await Pipeline.findOne({ is_default: true });
    const won = pipeline!.stages.find((s) => s.outcome === 'won')!;
    const lost = pipeline!.stages.find((s) => s.outcome === 'lost')!;

    for (const deal of await Deal.find({ status: 'Won' })) {
      expect(String(deal.stage_id)).toBe(String(won._id));
      expect(deal.closed_at).toBeDefined();
    }
    for (const deal of await Deal.find({ status: 'Lost' })) {
      expect(String(deal.stage_id)).toBe(String(lost._id));
      // Win/loss analysis needs a reason to group by.
      expect(deal.lost_reason).toBeTruthy();
    }
  });

  it('produces tickets with an SLA deadline and a believable breach mix', async () => {
    await create_demo_data({ sales_rep_ids, support_agent_ids });

    const tickets = await SupportTicket.find();
    for (const ticket of tickets) {
      expect(ticket.sla_due_at).toBeDefined();
      expect(ticket.priority).toBeTruthy();
    }

    const answered = tickets.filter((t) => t.first_response_at);
    const breached = answered.filter((t) => t.first_response_at! > t.sla_due_at);
    // Neither perfect nor entirely broken, so the SLA chart says something.
    expect(breached.length).toBeGreaterThan(0);
    expect(breached.length).toBeLessThan(answered.length);
  });

  it('attaches activities to all four target types', async () => {
    await create_demo_data({ sales_rep_ids, support_agent_ids });

    for (const target_type of ['Lead', 'Customer', 'Deal', 'SupportTicket']) {
      expect(await Activity.countDocuments({ target_type })).toBeGreaterThan(0);
    }
  });

  it('leaves some tasks open and overdue so the task list is not empty', async () => {
    await create_demo_data({ sales_rep_ids, support_agent_ids });

    const overdue = await Activity.countDocuments({
      type: 'Task',
      completed_at: null,
      due_at: { $lt: new Date() },
    });
    expect(overdue).toBeGreaterThan(0);
  });

  it('spreads created_at across time so time-series charts have a range', async () => {
    await create_demo_data({ sales_rep_ids, support_agent_ids });

    const deals = await Deal.find().sort({ created_at: 1 });
    const span_days =
      (deals[deals.length - 1].created_at.getTime() - deals[0].created_at.getTime()) /
      (1000 * 60 * 60 * 24);

    expect(span_days).toBeGreaterThan(30);
  });

  it('reports whether demo data is already present', async () => {
    expect(await has_demo_data()).toBe(false);
    await create_demo_data({ sales_rep_ids, support_agent_ids });
    expect(await has_demo_data()).toBe(true);
  });

  it('every converted lead points at a real customer', async () => {
    await create_demo_data({ sales_rep_ids, support_agent_ids });

    const converted = await Lead.find({ status: 'Converted' });
    expect(converted.length).toBeGreaterThan(0);
    for (const lead of converted) {
      expect(await Customer.exists({ _id: lead.customer_id })).toBeTruthy();
    }
  });
});
