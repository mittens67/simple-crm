import { Types } from 'mongoose';
import Lead from '../models/lead';
import Customer from '../models/customer';
import Deal from '../models/deal';
import SupportTicket from '../models/support-ticket';
import SupportNote from '../models/support-note';
import ActivityLog from '../models/activity-log';

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

const DEAL_STAGES = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closing'] as const;

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

const days_ago = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

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
 */
// SupportNote and ActivityLog are append-only and carry no updated_at, hence
// the optional second timestamp.
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
    SupportTicket.deleteMany({}),
    SupportNote.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);
};

export const create_demo_data = async ({ sales_rep_ids, support_agent_ids }: SeedActors) => {
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

  let converted_cursor = 0;
  for (const status of lead_statuses) {
    const name = full_name();
    const company = pick(COMPANIES);
    const created = days_ago(int_between(1, 180));
    const assigned = status === 'Open' ? undefined : pick(sales_rep_ids);

    await create_backdated(
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
  }

  // --- Deals ---------------------------------------------------------------
  const deal_plan = [
    ...Array(11).fill('Open'),
    ...Array(9).fill('Won'),
    ...Array(6).fill('Lost'),
    ...Array(6).fill('Pending'),
  ] as const;

  for (const status of deal_plan) {
    const customer = pick(customers);
    const created = days_ago(int_between(5, 300));
    await create_backdated(
      Deal,
      {
        title: `${customer.company} — ${pick(['platform licence', 'annual renewal', 'expansion', 'pilot programme', 'support upgrade'])}`,
        customer_id: customer.id,
        owner_id: pick(sales_rep_ids),
        value: int_between(4, 240) * 1000,
        status,
        // Closed deals sit at the end of the pipeline; live ones are spread.
        stage: status === 'Won' || status === 'Lost' ? 'Closing' : pick(DEAL_STAGES),
      },
      created
    );
  }

  // --- Support tickets -----------------------------------------------------
  const ticket_plan = [
    ...Array(8).fill('Open'),
    ...Array(6).fill('InProgress'),
    ...Array(7).fill('Resolved'),
    ...Array(4).fill('Closed'),
  ] as const;

  for (const status of ticket_plan) {
    const customer = pick(customers);
    const created = days_ago(int_between(0, 90));
    await create_backdated(
      SupportTicket,
      {
        customer_id: customer.id,
        assigned_agent: pick(support_agent_ids),
        status,
        issue_summary: pick(TICKET_ISSUES),
        internal_notes:
          status === 'Resolved' || status === 'Closed'
            ? 'Resolved after a config change on our side. Customer confirmed.'
            : undefined,
      },
      created
    );
  }

  // --- Support notes -------------------------------------------------------
  for (let i = 0; i < 24; i += 1) {
    const customer = pick(customers);
    const created = days_ago(int_between(0, 120));
    await create_backdated(
      SupportNote,
      {
        customer_id: customer.id,
        author_id: pick([...sales_rep_ids, ...support_agent_ids]),
        content: pick(NOTE_BODIES),
      },
      created
    );
  }

  // --- Activity log --------------------------------------------------------
  const actions = ['Lead created', 'Lead updated', 'Deal created', 'Deal updated', 'Ticket resolved'];
  for (let i = 0; i < 40; i += 1) {
    const created = days_ago(int_between(0, 60));
    await create_backdated(
      ActivityLog,
      {
        user_id: pick([...sales_rep_ids, ...support_agent_ids]),
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
    notes: 24,
    logs: 40,
  };
};
