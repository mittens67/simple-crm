import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import Role from '../models/role';
import User from '../models/user';

// Idempotent bootstrap: default roles + first admin user.
// Run with: pnpm seed  (requires ADMIN_EMAIL and ADMIN_PASSWORD in .env)

const DEFAULT_ROLES: { name: string; permissions: Record<string, boolean> }[] = [
  {
    name: 'Admin',
    permissions: { '*': true },
  },
  {
    name: 'Sales',
    permissions: {
      'leads.*': true,
      'customers.*': true,
      'deals.*': true,
      'activity_logs.create': true,
    },
  },
  {
    name: 'Support',
    permissions: {
      'support_tickets.*': true,
      'support_notes.*': true,
      'customers.read': true,
      'activity_logs.create': true,
    },
  },
];

const seed = async () => {
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
      role_id: admin_role!._id,
      is_active: true,
    });
    console.log(`Created admin user ${admin_email}`);
  }

  await mongoose.disconnect();
  console.log('Seed complete');
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
