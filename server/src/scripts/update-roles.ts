import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env';
import Role from '../models/role';

const update_roles = async () => {
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Add users.read to Sales role
  const sales = await Role.findOne({ name: 'Sales' });
  if (sales) {
    sales.permissions['users.read'] = true;
    await sales.save();
    console.log('Updated Sales role with users.read');
  }

  // Add users.read to Support role
  const support = await Role.findOne({ name: 'Support' });
  if (support) {
    support.permissions['users.read'] = true;
    await support.save();
    console.log('Updated Support role with users.read');
  }

  await mongoose.disconnect();
  console.log('Update complete');
};

update_roles().catch((err) => {
  console.error('Update failed:', err);
  process.exit(1);
});
