import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '../../graphql/typedefs';
import { resolvers } from '../../graphql/resolvers';
import { create_loaders } from '../../graphql/loaders';
import { merge_permissions } from '../../auth/permissions';
import type { ApolloContext } from '../../graphql/context';
import Deal from '../../models/deal';
import Customer from '../../models/customer';
import User from '../../models/user';
import Role from '../../models/role';
import type { IUser } from '../../models/user';
import type { IRole } from '../../models/role';

/**
 * Counts queries by entity so the batching claim is measured, not asserted by
 * hand. Every list query used to `.populate()` a relation and then re-fetch the
 * same documents in a field resolver — 1 + 2N round trips for N rows.
 */
const counts: Record<string, number> = {};

const record = (event: { commandName: string; command: Record<string, unknown> }) => {
  if (!['find', 'aggregate', 'count'].includes(event.commandName)) return;
  const collection = String(event.command[event.commandName] ?? 'unknown');
  counts[collection] = (counts[collection] ?? 0) + 1;
};

let manager: IUser;
let manager_role: IRole;
const schema = makeExecutableSchema({ typeDefs, resolvers });

const ROW_COUNT = 12;

beforeAll(async () => {
  manager_role = await Role.create({ name: 'NPlusOneManager', permissions: { '*': true } });
  manager = await User.create({
    name: 'NPlusOne Manager',
    email: 'nplusone@example.com',
    password: 'password123',
    role_ids: [manager_role._id],
  });

  // Distinct owners and customers per row, so batching cannot be mistaken for
  // the DataLoader cache simply de-duplicating one repeated id.
  for (let i = 0; i < ROW_COUNT; i += 1) {
    const owner = await User.create({
      name: `Owner ${i}`,
      email: `owner${i}@nplusone.test`,
      password: 'password123',
      role_ids: [manager_role._id],
    });
    const customer = await Customer.create({
      name: `Customer ${i}`,
      email: `customer${i}@nplusone.test`,
      phone: '555-0000',
    });
    await Deal.create({
      title: `Deal ${i}`,
      customer_id: customer._id,
      owner_id: owner._id,
      value: 1000 + i,
      stage: 'Proposal',
    });
  }
});

beforeEach(() => {
  for (const key of Object.keys(counts)) delete counts[key];
  mongoose.connection.getClient().on('commandStarted', record);
});

afterEach(() => {
  mongoose.connection.getClient().off('commandStarted', record);
});

const run = (query: string) => {
  const context: ApolloContext = {
    user: manager,
    roles: [manager_role],
    permissions: merge_permissions([manager_role.permissions]),
    loaders: create_loaders(),
    req: {} as ApolloContext['req'],
    res: {} as ApolloContext['res'],
  };
  return graphql({ schema, source: query, contextValue: context });
};

describe('relation batching', () => {
  it('resolves a deal list with a constant number of queries', async () => {
    const result = await run(`
      query {
        deals(limit: ${ROW_COUNT}) {
          total
          items { id title customer { id name } owner { id name } }
        }
      }
    `);

    expect(result.errors).toBeUndefined();
    const page = result.data?.deals as { items: unknown[] };
    expect(page.items).toHaveLength(ROW_COUNT);

    // One find for the deals page, one countDocuments, then exactly one
    // batched find per relation regardless of row count.
    expect(counts.deals).toBe(2);
    expect(counts.customers).toBe(1);
    expect(counts.users).toBe(1);

    // The previous implementation issued 1 + 2N. Pin the improvement.
    const total_queries = Object.values(counts).reduce((sum, n) => sum + n, 0);
    expect(total_queries).toBeLessThan(2 * ROW_COUNT);
    expect(total_queries).toBe(4);
  });

  it('does not grow the query count as rows are added', async () => {
    await run(`query { deals(limit: 4) { items { id customer { id } owner { id } } } }`);
    const small = Object.values(counts).reduce((sum, n) => sum + n, 0);

    for (const key of Object.keys(counts)) delete counts[key];

    await run(`query { deals(limit: ${ROW_COUNT}) { items { id customer { id } owner { id } } } }`);
    const large = Object.values(counts).reduce((sum, n) => sum + n, 0);

    expect(large).toBe(small);
  });

  it('caches repeated ids within a single request', async () => {
    // Asking for the same relation twice must not double the queries.
    await run(`
      query {
        deals(limit: ${ROW_COUNT}) {
          items { id customer { id name email } owner { id name email } }
        }
      }
    `);

    expect(counts.customers).toBe(1);
    expect(counts.users).toBe(1);
  });
});
