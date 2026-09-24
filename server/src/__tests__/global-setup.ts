import { MongoMemoryServer } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

// One mongod for the whole run. Previously every test file started its own,
// which meant ~11 concurrent mongod boots — on a cold machine they contend for
// CPU and exceed the driver's 10s startup timeout, failing the suite for
// reasons that have nothing to do with the code under test.
let mongo_server: MongoMemoryServer;

export async function setup(project: TestProject) {
  mongo_server = await MongoMemoryServer.create();
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
