import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import Role from '../models/role';
import User from '../models/user';
import { create_demo_data, clear_demo_data, has_demo_data } from './demo-data';

// Idempotent bootstrap: default roles, the first admin user, a small team, and
// a realistic demo dataset.
//
//   pnpm seed            bootstrap; leaves existing demo data alone
//   pnpm seed --reset    wipe and regenerate the demo business records
//
// Requires ADMIN_EMAIL and ADMIN_PASSWORD in .env.

const DEFAULT_ROLES: { name: string; permissions: Record<string, boolean> }[] = [
  {
    name: 'Admin',
    permissions: { '*': true },
  },
  // A rep works their own book of business: no `.all` scopes, so lists are
  // filtered to the records assigned to them.
  {
    name: 'Sales',
    permissions: {
      'users.read': true,
      'leads.read': true,
      'leads.create': true,
      'leads.update': true,
      'leads.delete': true,
      'customers.read': true,
      'customers.create': true,
      'customers.update': true,
      'deals.read': true,
      'deals.create': true,
      'deals.update': true,
      'deals.delete': true,
      'audit_logs.create': true,
    },
  },
  // A manager sees and edits the whole team's pipeline via the `.all` scopes.
  {
    name: 'Sales Manager',
    permissions: {
      'users.read': true,
      'leads.*': true,
      'customers.*': true,
      'deals.*': true,
      'audit_logs.read': true,
      'audit_logs.create': true,
    },
  },
  {
    name: 'Support',
    permissions: {
      'users.read': true,
      'support_tickets.read': true,
      'support_tickets.create': true,
      'support_tickets.update': true,
      'support_tickets.delete': true,
      'support_notes.read': true,
      'support_notes.create': true,
      'support_notes.update': true,
      'support_notes.delete': true,
      'customers.read': true,
      'customers.read.all': true,
      'audit_logs.create': true,
    },
  },
];

// The demo password is read from the environment so it is not a credential
// committed to the repository. The fallback only applies outside production.
const demo_password = () => {
  const from_env = process.env.DEMO_PASSWORD;
  if (from_env) return from_env;
  if (env.NODE_ENV === 'production') {
    throw new Error('DEMO_PASSWORD must be set when seeding a production database');
  }
  return 'Demo123!';
};

interface TeamMember {
  email: string;
  name: string;
  role: 'Sales' | 'Sales Manager' | 'Support';
}

const TEAM: TeamMember[] = [
  { email: 'demo-sales@example.com', name: 'Demo Sales Rep', role: 'Sales' },
  { email: 'demo-support@example.com', name: 'Demo Support Agent', role: 'Support' },
  // Demonstrates the `.all` scopes: the manager sees every rep's records
  // where a rep sees only their own.
  { email: 'demo-manager@example.com', name: 'Demo Sales Manager', role: 'Sales Manager' },
  // Colleagues so ownership is distributed and per-rep reporting has more
  // than one bar to draw.
  { email: 'priya.iyer@example.com', name: 'Priya Iyer', role: 'Sales' },
  { email: 'tom.bergstrom@example.com', name: 'Tom Bergstrom', role: 'Sales' },
  { email: 'ana.moreau@example.com', name: 'Ana Moreau', role: 'Support' },
];

const upsert_user = async (member: TeamMember, password: string): Promise<Types.ObjectId> => {
  const existing = await User.findOne({ email: member.email });
  if (existing) {
    console.log(`User ${member.email} already exists — skipping`);
    return existing._id as Types.ObjectId;
  }
  const role = await Role.findOne({ name: member.role });
  const created = await User.create({
    name: member.name,
    email: member.email,
    password: await bcrypt.hash(password, 10),
    role_ids: [role!._id],
    is_active: true,
  });
  console.log(`Created ${member.role} user ${member.email}`);
  return created._id as Types.ObjectId;
};

const seed = async () => {
  const reset = process.argv.includes('--reset');

  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const role_def of DEFAULT_ROLES) {
    const existing = await Role.findOne({ name: role_def.name });
    if (existing) {
      console.log(`Role "${role_def.name}" already exists — skipping`);
    } else {
      await Role.create(role_def);
      console.log(`Created role "${role_def.name}"`);
    }
  }

  const admin_email = process.env.ADMIN_EMAIL;
  const admin_password = process.env.ADMIN_PASSWORD;
  if (!admin_email || !admin_password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  }

  const existing_admin = await User.findOne({ email: admin_email });
  if (existing_admin) {
    console.log(`Admin user ${admin_email} already exists — skipping`);
  } else {
    const admin_role = await Role.findOne({ name: 'Admin' });
    await User.create({
      name: 'Admin',
      email: admin_email,
      password: await bcrypt.hash(admin_password, 10),
      role_ids: [admin_role!._id],
      is_active: true,
    });
    console.log(`Created admin user ${admin_email}`);
  }

  const password = demo_password();
  const sales_rep_ids: Types.ObjectId[] = [];
  const support_agent_ids: Types.ObjectId[] = [];

  for (const member of TEAM) {
    const id = await upsert_user(member, password);
    // Managers see everything through the `.all` scopes rather than owning
    // records, so they are deliberately excluded from both ownership pools.
    if (member.role === 'Sales') sales_rep_ids.push(id);
    else if (member.role === 'Support') support_agent_ids.push(id);
  }

  if (reset) {
    console.log('Clearing existing demo business records…');
    await clear_demo_data();
  }

  if (await has_demo_data()) {
    console.log('Demo business records already present — skipping (use --reset to regenerate)');
  } else {
    console.log('Generating demo business records…');
    const counts = await create_demo_data({ sales_rep_ids, support_agent_ids });
    console.log(
      `Created ${counts.customers} customers, ${counts.leads} leads, ${counts.deals} deals, ` +
        `${counts.tickets} tickets, ${counts.activities} activities, ${counts.notes} notes, ${counts.logs} audit entries`
    );
  }

  await mongoose.disconnect();
  console.log('Seed complete');
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
