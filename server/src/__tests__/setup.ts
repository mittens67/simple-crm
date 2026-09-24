import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, inject } from 'vitest';

// Set test env vars before any code imports them
process.env.MONGO_URI = 'mongodb://test:test@localhost:27017/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

// Every test file gets its own database inside the shared mongod (started once
// in global-setup.ts), so files stay isolated from each other while running in
// parallel without paying for a server boot each.
const db_name = `test-${randomUUID()}`;

beforeAll(async () => {
  const mongo_uri = inject('mongo_uri');
  process.env.MONGO_URI = mongo_uri;
  await mongoose.connect(mongo_uri, { dbName: db_name });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
