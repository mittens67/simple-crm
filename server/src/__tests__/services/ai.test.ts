import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { ai_service } from '../../services/ai';
import { reset_provider } from '../../ai/client';
import Lead from '../../models/lead';
import Customer from '../../models/customer';
import Deal from '../../models/deal';
import SupportTicket, { sla_due_from } from '../../models/support-ticket';
import Activity from '../../models/activity';
import Pipeline, { IPipeline } from '../../models/pipeline';
import AuditLog from '../../models/audit-log';
import User from '../../models/user';
import Role from '../../models/role';
import type { IUser } from '../../models/user';
import type { IRole } from '../../models/role';
import type { ICustomer } from '../../models/customer';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { mock_context, mock_context_with } from '../helpers/context';
import { create_test_pipeline, stage_named } from '../helpers/pipeline';

/**
 * Exercised against the deterministic mock provider, which is the default.
 * That is what makes these assertions exact rather than "the model said
 * something", and it is why the suite needs no API key and no network.
 */

let rep: IUser;
let other_rep: IUser;
let manager: IUser;
let rep_role: IRole;
let manager_role: IRole;
let customer: ICustomer;
let pipeline: IPipeline;

beforeAll(async () => {
  rep_role = await Role.create({
    name: 'AiRep',
    permissions: {
      'leads.read': true,
      'leads.update': true,
      'customers.read': true,
      'deals.read': true,
      'support_tickets.read': true,
    },
  });
  manager_role = await Role.create({ name: 'AiManager', permissions: { '*': true } });

  rep = await User.create({
    name: 'AI Rep',
    email: 'airep@example.com',
    password: 'password123',
    role_ids: [rep_role._id],
  });
  other_rep = await User.create({
    name: 'Other AI Rep',
    email: 'otherairep@example.com',
    password: 'password123',
    role_ids: [rep_role._id],
  });
  manager = await User.create({
    name: 'AI Manager',
    email: 'aimanager@example.com',
    password: 'password123',
    role_ids: [manager_role._id],
  });

  customer = await Customer.create({
    name: 'AI Customer',
    email: 'aicustomer@example.com',
    phone: '555-9999',
    assigned_rep_id: rep._id,
  });
});

beforeEach(async () => {
  await Promise.all([
    Lead.deleteMany({}),
    Deal.deleteMany({}),
    SupportTicket.deleteMany({}),
    Activity.deleteMany({}),
    Pipeline.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
  pipeline = await create_test_pipeline('AI Pipeline');
  // Clears the response cache and per-user rate counters between cases.
  reset_provider();
});

const as_rep = () => mock_context(rep, rep_role);
const as_manager = () => mock_context(manager, manager_role);

const make_lead = (overrides: Record<string, unknown> = {}) =>
  Lead.create({
    name: 'Scored Lead',
    email: 'scored@example.com',
    phone: '555-0001',
    assigned_rep_id: rep._id,
    ...overrides,
  });

describe('aiStatus', () => {
  it('reports the mock provider as not live', () => {
    const status = ai_service.status();

    // The UI uses this to say results are synthetic rather than implying a
    // real model produced them.
    expect(status.provider).toBe('mock');
    expect(status.is_live).toBe(false);
  });
});

describe('score_lead', () => {
  it('scores a lead and caches the result on the document', async () => {
    const lead = await make_lead();

    const scored = await ai_service.score_lead(as_rep(), String(lead._id));

    expect(scored.ai_score).toBeGreaterThanOrEqual(0);
    expect(scored.ai_score).toBeLessThanOrEqual(100);
    expect(scored.ai_rationale).toBeTruthy();
    expect(scored.ai_next_action).toBeTruthy();
    expect(scored.ai_scored_at).toBeInstanceOf(Date);
    expect(scored.ai_provider).toBe('mock');
  });

  it('is deterministic for the same lead', async () => {
    const lead = await make_lead();

    const first = await ai_service.score_lead(as_rep(), String(lead._id));
    const score = first.ai_score;

    await Lead.updateOne({ _id: lead._id }, { $set: { ai_scored_at: null } });
    reset_provider();

    const second = await ai_service.score_lead(as_rep(), String(lead._id));
    expect(second.ai_score).toBe(score);
  });

  it('reuses a fresh score instead of calling the model again', async () => {
    const lead = await make_lead();

    const first = await ai_service.score_lead(as_rep(), String(lead._id));
    const second = await ai_service.score_lead(as_rep(), String(lead._id));

    // Same timestamp proves no re-scoring happened.
    expect(second.ai_scored_at?.getTime()).toBe(first.ai_scored_at?.getTime());
  });

  it('re-scores when refresh is requested', async () => {
    const lead = await make_lead();
    const first = await ai_service.score_lead(as_rep(), String(lead._id));

    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await ai_service.score_lead(as_rep(), String(lead._id), true);

    expect(second.ai_scored_at!.getTime()).toBeGreaterThan(first.ai_scored_at!.getTime());
  });

  it('treats a score as stale once its TTL passes', async () => {
    const lead = await make_lead();
    await ai_service.score_lead(as_rep(), String(lead._id));

    // Backdate well past AI_SCORE_TTL_MS.
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { ai_scored_at: new Date(Date.now() - 10 * 24 * 3600_000) } }
    );

    const rescored = await ai_service.score_lead(as_rep(), String(lead._id));
    expect(Date.now() - rescored.ai_scored_at!.getTime()).toBeLessThan(60_000);
  });

  it('requires leads.update, since scoring writes to the record', async () => {
    const lead = await make_lead();
    const read_only = mock_context_with(rep, { 'leads.read': true });

    await expect(ai_service.score_lead(read_only, String(lead._id))).rejects.toThrow(
      ForbiddenError
    );
  });

  it("refuses to score another rep's lead", async () => {
    const lead = await make_lead({ assigned_rep_id: other_rep._id });

    await expect(ai_service.score_lead(as_rep(), String(lead._id))).rejects.toThrow(NotFoundError);
  });

  it('records the scoring in the audit log', async () => {
    const lead = await make_lead();
    await ai_service.score_lead(as_rep(), String(lead._id));

    const log = await AuditLog.findOne({ action: 'Lead scored' });
    expect(log?.metadata).toMatchObject({ provider: 'mock' });
  });

  it('never scores during a plain list read', async () => {
    // Scoring on read would burn the quota on every page load.
    await make_lead();
    await make_lead({ email: 'second@example.com' });

    const page = await (await import('../../services/lead')).lead_service.list(as_rep(), {});

    expect(page.items.every((lead) => lead.ai_scored_at == null)).toBe(true);
  });
});

describe('score_leads_bulk', () => {
  it('scores only unscored open leads, up to the limit', async () => {
    for (let i = 0; i < 5; i += 1) {
      await make_lead({ email: `bulk${i}@example.com` });
    }
    await make_lead({ email: 'archived@example.com', status: 'Archived' });

    const scored = await ai_service.score_leads_bulk(as_rep(), 3);

    expect(scored).toHaveLength(3);
    expect(await Lead.countDocuments({ ai_scored_at: { $ne: null } })).toBe(3);
    // Archived leads are not worth spending quota on.
    expect(await Lead.countDocuments({ status: 'Archived', ai_scored_at: { $ne: null } })).toBe(0);
  });

  it('caps the batch so one action cannot drain the quota', async () => {
    for (let i = 0; i < 15; i += 1) {
      await make_lead({ email: `many${i}@example.com` });
    }

    const scored = await ai_service.score_leads_bulk(as_rep(), 100);
    expect(scored.length).toBeLessThanOrEqual(10);
  });
});

describe('aiSearch', () => {
  it('compiles a question into a plan and runs it', async () => {
    await make_lead({ email: 'open1@example.com', status: 'Open' });
    await make_lead({ email: 'converted@example.com', status: 'Converted' });

    const { plan, entity, results } = await ai_service.search(as_rep(), 'show me converted leads');

    expect(entity).toBe('leads');
    expect(plan.filters).toMatchObject({ status: 'Converted' });
    expect(results.total).toBe(1);
  });

  it('routes a deal question to deals', async () => {
    await Deal.create({
      title: 'Big one',
      customer_id: customer._id,
      owner_id: rep._id,
      value: 90000,
      pipeline_id: pipeline._id,
      stage_id: stage_named(pipeline, 'Proposal')._id,
    });

    const { entity, results } = await ai_service.search(as_rep(), 'open deals over 50k');

    expect(entity).toBe('deals');
    expect(results.total).toBe(1);
  });

  it('applies ownership scoping on top of the model plan', async () => {
    await make_lead({ email: 'mine@example.com', status: 'Open' });
    await make_lead({
      email: 'theirs@example.com',
      status: 'Open',
      assigned_rep_id: other_rep._id,
    });

    // A question can never widen what the caller is allowed to see.
    const mine = await ai_service.search(as_rep(), 'show me open leads');
    const all = await ai_service.search(as_manager(), 'show me open leads');

    expect(mine.results.total).toBe(1);
    expect(all.results.total).toBe(2);
  });

  it('requires the permission for the entity the model chose', async () => {
    // Leads-only permissions must not become a way to read deals.
    const leads_only = mock_context_with(rep, { 'leads.read': true, 'leads.update': true });

    await expect(ai_service.search(leads_only, 'show me open deals')).rejects.toThrow(
      ForbiddenError
    );
  });

  it('rejects an empty question', async () => {
    await expect(ai_service.search(as_rep(), '   ')).rejects.toThrow(ValidationError);
  });

  it('rejects an over-long question', async () => {
    await expect(ai_service.search(as_rep(), 'x'.repeat(301))).rejects.toThrow(ValidationError);
  });

  it('returns the plan so the user can see how the question was read', async () => {
    const { plan } = await ai_service.search(as_rep(), 'show me converted leads');

    // Showing the interpretation is what makes the feature trustworthy.
    expect(plan.explanation).toBeTruthy();
  });
});

describe('aiSummary', () => {
  it('summarises a timeline', async () => {
    const lead = await make_lead();
    for (let i = 0; i < 3; i += 1) {
      await Activity.create({
        type: 'Call',
        subject: `Call ${i}`,
        target_type: 'Lead',
        target_id: lead._id,
        owner_id: rep._id,
      });
    }

    const summary = await ai_service.summarise(as_rep(), 'Lead', String(lead._id));
    expect(summary.length).toBeGreaterThan(20);
  });

  it('says so plainly when there is no activity, without calling the model', async () => {
    const lead = await make_lead();

    const summary = await ai_service.summarise(as_rep(), 'Lead', String(lead._id));
    expect(summary).toMatch(/no recorded activity/i);
  });

  it("refuses to summarise another rep's record", async () => {
    const lead = await make_lead({ assigned_rep_id: other_rep._id });

    // Record content must not reach a third-party API for someone who cannot
    // read the record.
    await expect(ai_service.summarise(as_rep(), 'Lead', String(lead._id))).rejects.toThrow(
      NotFoundError
    );
  });

  it('rejects a malformed id before touching the database', async () => {
    await expect(ai_service.summarise(as_rep(), 'Lead', 'not-an-id')).rejects.toThrow(
      ValidationError
    );
  });

  it('works across every target type', async () => {
    const ticket = await SupportTicket.create({
      customer_id: customer._id,
      assigned_agent: rep._id,
      issue_summary: 'Cannot log in',
      priority: 'High',
      sla_due_at: sla_due_from('High'),
    });
    await Activity.create({
      type: 'Note',
      subject: 'Investigated',
      target_type: 'SupportTicket',
      target_id: ticket._id,
      owner_id: rep._id,
    });

    const summary = await ai_service.summarise(as_manager(), 'SupportTicket', String(ticket._id));
    expect(summary.length).toBeGreaterThan(20);
  });
});

describe('draftEmail', () => {
  it('drafts an email with a subject line', async () => {
    const lead = await make_lead();
    await Activity.create({
      type: 'Call',
      subject: 'Discovery call',
      target_type: 'Lead',
      target_id: lead._id,
      owner_id: rep._id,
    });

    const draft = await ai_service.draft_email(as_rep(), 'Lead', String(lead._id));
    expect(draft).toMatch(/^Subject:/m);
  });

  it('rejects an over-long instruction', async () => {
    const lead = await make_lead();

    await expect(
      ai_service.draft_email(as_rep(), 'Lead', String(lead._id), 'x'.repeat(301))
    ).rejects.toThrow(ValidationError);
  });

  it("refuses to draft against a record the caller cannot read", async () => {
    const lead = await make_lead({ assigned_rep_id: other_rep._id });

    await expect(
      ai_service.draft_email(as_rep(), 'Lead', String(lead._id))
    ).rejects.toThrow(NotFoundError);
  });

  it('rejects an unknown target id', async () => {
    await expect(
      ai_service.draft_email(as_rep(), 'Lead', new Types.ObjectId().toString())
    ).rejects.toThrow(NotFoundError);
  });
});
