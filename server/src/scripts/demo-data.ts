import { Types } from 'mongoose';
import Lead from '../models/lead';
import Customer from '../models/customer';
import Deal from '../models/deal';
import Pipeline, { IPipeline } from '../models/pipeline';
import Activity, { ACTIVITY_TYPES } from '../models/activity';
import SupportTicket, {
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  TicketPriority,
  sla_due_from,
} from '../models/support-ticket';
import SupportNote from '../models/support-note';
import AuditLog from '../models/audit-log';

/**
 * Deterministic demo dataset.
 *
 * The previous seed created only roles and users, which meant a fresh install
 * showed an empty CRM — and, more importantly, meant that pages which crash on
 * their first record looked like they worked. Realistic volume is a
 * correctness tool here, not decoration.
 *
 * Everything below is generated from a fixed seed so runs are reproducible.
 */

// Mulberry32 — small deterministic PRNG so the dataset is identical every run.
const make_rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const rng = make_rng(20260924);

const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)];
const int_between = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const chance = (percent: number) => rng() * 100 < percent;

const FIRST_NAMES = [
  'Amara', 'Ben', 'Chloe', 'Dmitri', 'Elena', 'Farid', 'Grace', 'Hugo', 'Ines', 'Jonas',
  'Kavya', 'Liam', 'Maya', 'Noor', 'Omar', 'Priya', 'Quinn', 'Rosa', 'Sven', 'Tara',
  'Ugo', 'Vera', 'Wesley', 'Ximena', 'Yusuf', 'Zoe',
] as const;

const LAST_NAMES = [
  'Okafor', 'Whitfield', 'Nakamura', 'Volkov', 'Marchetti', 'Haddad', 'Lindqvist', 'Moreau',
  'Vasquez', 'Bergstrom', 'Iyer', 'Donnelly', 'Rahman', 'Castellanos', 'Novak', 'Fitzgerald',
] as const;

const COMPANIES = [
  'Northwind Logistics', 'Helios Materials', 'Cobalt Analytics', 'Veridian Health',
  'Marlow & Finch', 'Atlas Freight', 'Bluepeak Software', 'Corvus Energy',
  'Sundial Retail', 'Ironvale Manufacturing', 'Pelagic Shipping', 'Quarry Lane Capital',
  'Tessellate Design', 'Umbra Security', 'Wavelength Media', 'Yardstick Consulting',
] as const;

/** The default pipeline every demo deal moves through. */
export const DEFAULT_PIPELINE_STAGES = [
  { name: 'Prospecting', display_order: 0, probability: 10, outcome: 'open' as const },
  { name: 'Qualification', display_order: 1, probability: 25, outcome: 'open' as const },
  { name: 'Proposal', display_order: 2, probability: 50, outcome: 'open' as const },
  { name: 'Negotiation', display_order: 3, probability: 75, outcome: 'open' as const },
  { name: 'Closed Won', display_order: 4, probability: 100, outcome: 'won' as const },
  { name: 'Closed Lost', display_order: 5, probability: 0, outcome: 'lost' as const },
];

const LOST_REASONS = [
  'Price', 'Lost_to_competitor', 'No_budget', 'No_decision', 'Bad_timing', 'Missing_features',
] as const;

const TICKET_ISSUES = [
  'Cannot log in after the latest release',
  'Invoice totals do not match the purchase order',
  'Data export times out on large date ranges',
  'Requesting additional seats for the finance team',
  'Webhook deliveries stopped overnight',
  'Duplicate records created during bulk import',
  'Password reset email never arrives',
  'Dashboard charts render blank in Safari',
  'API returns 403 for a previously working key',
  'Need help migrating from the legacy plan',
] as const;

const NOTE_BODIES = [
  'Walked through the reporting module on a 30-minute call. They want per-region breakdowns.',
  'Renewal is up next quarter. Finance wants a multi-year discount before committing.',
  'Escalated to engineering; root cause looks like a stale cache on their tenant.',
  'Champion is moving teams. Need to build a relationship with their replacement.',
  'Sent the security questionnaire back. Procurement expects an answer within a week.',
  'They are evaluating a competitor. Price is not the blocker, onboarding time is.',
] as const;

const ACTIVITY_SUBJECTS: Record<string, readonly string[]> = {
  Call: ['Discovery call', 'Follow-up call', 'Check-in call', 'Pricing discussion'],
  Email: ['Sent proposal', 'Shared case study', 'Chased for a decision', 'Intro email'],
  Meeting: ['Product demo', 'Technical deep dive', 'Quarterly review', 'Stakeholder meeting'],
  Note: ['Call summary', 'Account background', 'Competitor intel', 'Budget context'],
  Task: ['Send revised quote', 'Book the demo', 'Chase procurement', 'Prepare the renewal pack'],
};

const days_ago = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const days_ahead = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const full_name = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

const email_for = (name: string, domain: string) =>
  `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@${domain}`;

const domain_for = (company: string) =>
  `${company.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`;

const phone = () => `+1 ${int_between(200, 989)} ${int_between(200, 999)} ${int_between(1000, 9999)}`;

/**
 * Creates a document with an explicit `created_at`, spreading records across
 * time so that time-series charts have a range instead of one vertical bar.
 *
 * The timestamps plugin owns `created_at`, so it has to be written on the
 * document and saved with `timestamps: false`. A post-hoc `updateOne` with
 * `$set` does not work — Mongoose ignores writes to the timestamp fields.
 *
 * SupportNote and AuditLog are append-only and carry no updated_at, hence the
 * optional second timestamp.
 */
const create_backdated = async <T extends { created_at: Date; updated_at?: Date }>(
  model: { new (doc: unknown): T & { save(opts: object): Promise<unknown> } },
  doc: Record<string, unknown>,
  created: Date
): Promise<T> => {
  const instance = new model(doc);
  instance.created_at = created;
  if ('updated_at' in instance) instance.updated_at = created;
  await instance.save({ timestamps: false });
  return instance;
};

interface SeedActors {
  sales_rep_ids: Types.ObjectId[];
  support_agent_ids: Types.ObjectId[];
}

export const has_demo_data = async () => (await Customer.countDocuments()) > 0;

export const clear_demo_data = async () => {
  await Promise.all([
    Lead.deleteMany({}),
    Customer.deleteMany({}),
    Deal.deleteMany({}),
    Pipeline.deleteMany({}),
    Activity.deleteMany({}),
    SupportTicket.deleteMany({}),
    SupportNote.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
};

/** Idempotent: the default pipeline is configuration, not demo data. */
export const ensure_default_pipeline = async (): Promise<IPipeline> => {
  const existing = await Pipeline.findOne({ is_default: true });
  if (existing) return existing;

  return Pipeline.create({
    name: 'Standard Sales Pipeline',
    is_default: true,
    stages: DEFAULT_PIPELINE_STAGES,
  });
};

export const create_demo_data = async ({ sales_rep_ids, support_agent_ids }: SeedActors) => {
  const pipeline = await ensure_default_pipeline();
  const open_stages = pipeline.stages.filter((s) => s.outcome === 'open');
  const won_stage = pipeline.stages.find((s) => s.outcome === 'won')!;
  const lost_stage = pipeline.stages.find((s) => s.outcome === 'lost')!;

  // --- Customers -----------------------------------------------------------
  const customers: { id: Types.ObjectId; name: string; company: string }[] = [];

  for (const company of COMPANIES) {
    const contact = full_name();
    const created = days_ago(int_between(40, 400));
    const customer = await create_backdated(
      Customer,
      {
        name: contact,
        email: email_for(contact, domain_for(company)),
        phone: phone(),
        assigned_rep_id: pick(sales_rep_ids),
      },
      created
    );
    customers.push({ id: customer._id as Types.ObjectId, name: contact, company });
  }

  // --- Leads ---------------------------------------------------------------
  // Weighted so the pipeline looks like a real one: mostly open/pending, with
  // a realistic tail of converted and archived.
  const lead_statuses = [
    ...Array(22).fill('Open'),
    ...Array(18).fill('Pending'),
    ...Array(12).fill('Converted'),
    ...Array(8).fill('Archived'),
  ] as const;

  const lead_ids: Types.ObjectId[] = [];
  let converted_cursor = 0;

  for (const status of lead_statuses) {
    const name = full_name();
    const company = pick(COMPANIES);
    const created = days_ago(int_between(1, 180));
    const assigned = status === 'Open' ? undefined : pick(sales_rep_ids);

    const lead = await create_backdated(
      Lead,
      {
        name,
        email: email_for(name, domain_for(company)),
        phone: phone(),
        status,
        ...(assigned && { assigned_rep_id: assigned }),
        ...(status === 'Converted' && customers[converted_cursor % customers.length]
          ? { customer_id: customers[converted_cursor++ % customers.length].id }
          : {}),
        sales_notes:
          status === 'Open'
            ? undefined
            : `Inbound enquiry from ${company}. Asked about pricing tiers and onboarding time.`,
        archive_notes:
          status === 'Archived' ? 'Went quiet after two follow-ups. Recycling next quarter.' : undefined,
      },
      created
    );
    lead_ids.push(lead._id as Types.ObjectId);
  }

  // --- Deals ---------------------------------------------------------------
  const deal_plan = [
    ...Array(14).fill('Open'),
    ...Array(11).fill('Won'),
    ...Array(7).fill('Lost'),
    ...Array(6).fill('Pending'),
  ] as const;

  const deal_ids: Types.ObjectId[] = [];

  for (const status of deal_plan) {
    const customer = pick(customers);
    const created = days_ago(int_between(5, 300));
    const is_closed = status === 'Won' || status === 'Lost';
    const stage = status === 'Won' ? won_stage : status === 'Lost' ? lost_stage : pick(open_stages);

    // Closed deals closed somewhere between creation and now, so revenue
    // over time has a spread rather than clustering on one date.
    const closed_at = is_closed
      ? new Date(created.getTime() + int_between(5, 90) * 24 * 60 * 60 * 1000)
      : undefined;

    const deal = await create_backdated(
      Deal,
      {
        title: `${customer.company} — ${pick(['platform licence', 'annual renewal', 'expansion', 'pilot programme', 'support upgrade'])}`,
        customer_id: customer.id,
        owner_id: pick(sales_rep_ids),
        value: int_between(4, 240) * 1000,
        status,
        pipeline_id: pipeline._id,
        stage_id: stage._id,
        // Spread across the stage so time-in-stage reporting varies.
        stage_entered_at: days_ago(int_between(0, 45)),
        expected_close_date: days_ahead(int_between(-30, 90)),
        ...(closed_at && { closed_at: closed_at > new Date() ? new Date() : closed_at }),
        ...(status === 'Lost' && { lost_reason: pick(LOST_REASONS) }),
      },
      created
    );
    deal_ids.push(deal._id as Types.ObjectId);
  }

  // --- Support tickets -----------------------------------------------------
  const ticket_plan = [
    ...Array(9).fill('Open'),
    ...Array(7).fill('InProgress'),
    ...Array(8).fill('Resolved'),
    ...Array(5).fill('Closed'),
  ] as const;

  const ticket_ids: Types.ObjectId[] = [];

  for (const status of ticket_plan) {
    const customer = pick(customers);
    const created = days_ago(int_between(0, 90));
    const priority = pick(TICKET_PRIORITIES) as TicketPriority;
    const answered = status !== 'Open';

    // Most tickets are answered in time; a minority breach, so SLA compliance
    // is a believable number rather than 100% or 0%.
    const response_offset_hours = chance(75)
      ? int_between(0, Math.max(1, Math.floor(SLA_HOURS[priority] * 0.8)))
      : SLA_HOURS[priority] + int_between(1, 48);

    const first_response_at = answered
      ? new Date(created.getTime() + response_offset_hours * 60 * 60 * 1000)
      : undefined;

    const ticket = await create_backdated(
      SupportTicket,
      {
        customer_id: customer.id,
        assigned_agent: pick(support_agent_ids),
        status,
        issue_summary: pick(TICKET_ISSUES),
        priority,
        category: pick(TICKET_CATEGORIES),
        sla_due_at: sla_due_from(priority, created),
        ...(first_response_at && { first_response_at }),
        ...((status === 'Resolved' || status === 'Closed') && {
          resolved_at: new Date(created.getTime() + int_between(2, 240) * 60 * 60 * 1000),
        }),
        internal_notes:
          status === 'Resolved' || status === 'Closed'
            ? 'Resolved after a config change on our side. Customer confirmed.'
            : undefined,
      },
      created
    );
    ticket_ids.push(ticket._id as Types.ObjectId);
  }

  // --- Activities ----------------------------------------------------------
  // The timeline is the point of the Activity entity, so every kind of target
  // gets some history, and a slice of tasks are left open and overdue.
  const all_actors = [...sales_rep_ids, ...support_agent_ids];
  const targets: Array<{ type: string; ids: Types.ObjectId[] }> = [
    { type: 'Lead', ids: lead_ids },
    { type: 'Customer', ids: customers.map((c) => c.id) },
    { type: 'Deal', ids: deal_ids },
    { type: 'SupportTicket', ids: ticket_ids },
  ];

  let activity_count = 0;
  for (const target of targets) {
    for (const target_id of target.ids) {
      for (let i = 0; i < int_between(0, 4); i += 1) {
        const type = pick(ACTIVITY_TYPES);
        const created = days_ago(int_between(0, 120));
        const is_task = type === 'Task';
        const completed = is_task ? chance(55) : true;

        await create_backdated(
          Activity,
          {
            type,
            subject: pick(ACTIVITY_SUBJECTS[type]),
            body: chance(60) ? pick(NOTE_BODIES) : undefined,
            target_type: target.type,
            target_id,
            owner_id: pick(all_actors),
            // Tasks have a due date; a third of the open ones are overdue.
            ...(is_task && { due_at: chance(35) ? days_ago(int_between(1, 20)) : days_ahead(int_between(1, 21)) }),
            ...(is_task && completed && { completed_at: created }),
            ...(!is_task && { completed_at: created }),
          },
          created
        );
        activity_count += 1;
      }
    }
  }

  // --- Support notes -------------------------------------------------------
  for (let i = 0; i < 24; i += 1) {
    const customer = pick(customers);
    const created = days_ago(int_between(0, 120));
    await create_backdated(
      SupportNote,
      {
        customer_id: customer.id,
        author_id: pick(all_actors),
        content: pick(NOTE_BODIES),
      },
      created
    );
  }

  // --- Audit log -----------------------------------------------------------
  const actions = ['Lead created', 'Lead updated', 'Deal created', 'Deal stage changed', 'Support ticket updated'];
  for (let i = 0; i < 40; i += 1) {
    const created = days_ago(int_between(0, 60));
    await create_backdated(
      AuditLog,
      {
        user_id: pick(all_actors),
        action: pick(actions),
        metadata: {},
      },
      created
    );
  }

  return {
    customers: customers.length,
    leads: lead_statuses.length,
    deals: deal_plan.length,
    tickets: ticket_plan.length,
    activities: activity_count,
    notes: 24,
    logs: 40,
  };
};

/** Mirrors SLA_RESPONSE_HOURS; kept local so the generator has no import cycle. */
const SLA_HOURS: Record<TicketPriority, number> = {
  Urgent: 1,
  High: 4,
  Medium: 24,
  Low: 72,
};
