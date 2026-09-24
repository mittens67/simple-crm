import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { Types } from 'mongoose';
import Role from '../../models/role';
import User from '../../models/user';
import Lead from '../../models/lead';
import Customer from '../../models/customer';
import Deal from '../../models/deal';
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
    expect(counts.leads).toBeGreaterThan(50);
  });

  it('produces records that satisfy the model enums and required refs', async () => {
    await create_demo_data({ sales_rep_ids, support_agent_ids });

    // Mongoose validates on create, so reaching here already proves validity;
    // these assertions pin the shape the UI depends on.
    const deals = await Deal.find();
    for (const deal of deals) {
      expect(deal.customer_id).toBeDefined();
      expect(deal.owner_id).toBeDefined();
      expect(deal.value).toBeGreaterThan(0);
      expect(deal.stage).toBeTruthy();
    }

    const tickets = await SupportTicket.find();
    for (const ticket of tickets) {
      expect(ticket.assigned_agent).toBeDefined();
      expect(['Open', 'InProgress', 'Resolved', 'Closed']).toContain(ticket.status);
    }
  });

  it('spreads created_at across time so time-series charts have a range', async () => {
    await create_demo_data({ sales_rep_ids, support_agent_ids });

    const deals = await Deal.find().sort({ created_at: 1 });
    const oldest = deals[0].created_at.getTime();
    const newest = deals[deals.length - 1].created_at.getTime();
    const span_days = (newest - oldest) / (1000 * 60 * 60 * 24);

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
      expect(lead.customer_id).toBeDefined();
      expect(await Customer.exists({ _id: lead.customer_id })).toBeTruthy();
    }
  });
});
