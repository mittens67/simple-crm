import { MongoMemoryReplSet } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

/**
 * One mongod for the whole run. Previously every test file started its own,
 * which meant ~11 concurrent boots — on a cold machine they contend for CPU
 * and exceed the driver's startup timeout, failing the suite for reasons that
 * have nothing to do with the code under test.
 *
 * A single-node *replica set* rather than a standalone, so that transactional
 * code paths are genuinely exercised here instead of silently taking the
 * non-transactional fallback in core/transaction.ts.
 */
let mongo_server: MongoMemoryReplSet;

export async function setup(project: TestProject) {
  mongo_server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  project.provide('mongo_uri', mongo_server.getUri());
}

export async function teardown() {
  await mongo_server?.stop();
}

declare module 'vitest' {
  interface ProvidedContext {
    mongo_uri: string;
  }
}
