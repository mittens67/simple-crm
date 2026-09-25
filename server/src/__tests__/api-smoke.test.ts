import { describe, it, expect, beforeAll } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../graphql/typedefs';
import { resolvers } from '../graphql/resolvers';
import { format_error } from '../utils/errors';
import { create_loaders } from '../graphql/loaders';
import { merge_permissions } from '../auth/permissions';
import type { ApolloContext } from '../graphql/context';
import User from '../models/user';
import Role from '../models/role';
import Customer from '../models/customer';
import Lead from '../models/lead';
import Pipeline from '../models/pipeline';
import type { IUser } from '../models/user';
import type { IRole } from '../models/role';

/**
 * Drives the real ApolloServer, including formatError, so the wiring between
 * schema, resolvers and the error hierarchy is exercised end to end.
 */
let server: ApolloServer<ApolloContext>;
let rep: IUser;
let rep_role: IRole;

const context_for = (user: IUser | null, role: IRole | null): ApolloContext => ({
  user,
  roles: role ? [role] : [],
  permissions: role ? merge_permissions([role.permissions]) : {},
  loaders: create_loaders(),
  req: {} as ApolloContext['req'],
  res: {} as ApolloContext['res'],
});

const run = (query: string, ctx: ApolloContext, variables?: Record<string, unknown>) =>
  server.executeOperation({ query, variables }, { contextValue: ctx });

const body = (res: Awaited<ReturnType<typeof run>>) => {
  if (res.body.kind !== 'single') throw new Error('expected a single result');
  return res.body.singleResult;
};

beforeAll(async () => {
  server = new ApolloServer<ApolloContext>({
    typeDefs,
    resolvers,
    formatError: (formatted, thrown) => {
      const mapped = format_error(thrown);
      return { ...formatted, message: mapped.message, extensions: { ...formatted.extensions, ...mapped.extensions } };
    },
  });
  await server.start();

  rep_role = await Role.create({
    name: 'SmokeRep',
    permissions: { 'leads.read': true, 'leads.create': true, 'customers.read': true },
  });
  rep = await User.create({
    name: 'Smoke Rep',
    email: 'smoke@example.com',
    password: 'password123',
    role_ids: [rep_role._id],
  });
  await Customer.create({ name: 'Smoke Co', email: 'smoke@co.com', phone: '1' });
});

describe('API smoke', () => {
  it('returns UNAUTHENTICATED for an anonymous query', async () => {
    const res = body(await run('{ leads { total } }', context_for(null, null)));

    expect(res.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
  });

  it('returns FORBIDDEN when the permission is missing', async () => {
    const res = body(await run('{ deals { total } }', context_for(rep, rep_role)));

    expect(res.errors?.[0].extensions?.code).toBe('FORBIDDEN');
  });

  it('serves a paginated page shape', async () => {
    const res = body(await run('{ leads(limit: 5) { items { id name } total has_more } }', context_for(rep, rep_role)));

    expect(res.errors).toBeUndefined();
    expect(res.data?.leads).toMatchObject({ total: expect.any(Number), has_more: expect.any(Boolean) });
  });

  it('maps a validation failure to VALIDATION_ERROR, not INTERNAL_SERVER_ERROR', async () => {
    const res = body(
      await run(
        'mutation ($input: CreateLead!) { createLead(input: $input) { id } }',
        context_for(rep, rep_role),
        { input: { name: 'Bad', email: 'not-an-email', phone: '1' } }
      )
    );

    expect(res.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
  });

  it('caps an absurd page size instead of honouring it', async () => {
    const res = body(await run('{ leads(limit: 100000) { items { id } } }', context_for(rep, rep_role)));

    expect(res.errors).toBeUndefined();
    const items = (res.data?.leads as { items: unknown[] }).items;
    expect(items.length).toBeLessThanOrEqual(100);
  });

  it('serves the pipeline board and analytics through the real schema', async () => {
    const admin_role = await Role.create({ name: 'SmokeBoardAdmin', permissions: { '*': true } });
    const admin = await User.create({
      name: 'Smoke Board Admin',
      email: 'smokeboard@example.com',
      password: 'password123',
      role_ids: [admin_role._id],
    });
    const ctx = context_for(admin, admin_role);
    await Pipeline.create({
      name: 'Smoke Pipeline',
      is_default: true,
      stages: [
        { name: 'Open', display_order: 0, probability: 50, outcome: 'open' },
        { name: 'Won', display_order: 1, probability: 100, outcome: 'won' },
        { name: 'Lost', display_order: 2, probability: 0, outcome: 'lost' },
      ],
    });

    const board = body(
      await run('{ pipelineBoard { stage { id name } deal_count total_value } }', ctx)
    );
    expect(board.errors).toBeUndefined();
    expect((board.data?.pipelineBoard as unknown[]).length).toBe(3);

    const analytics = body(
      await run(
        '{ dashboardSummary { total_leads open_deal_value weighted_pipeline_value } slaSummary { compliance_rate } }',
        ctx
      )
    );
    expect(analytics.errors).toBeUndefined();
  });

  it('resolves an activity timeline through the polymorphic union', async () => {
    const admin_role = await Role.create({ name: 'SmokeActivityAdmin', permissions: { '*': true } });
    const admin = await User.create({
      name: 'Smoke Activity Admin',
      email: 'smokeactivity@example.com',
      password: 'password123',
      role_ids: [admin_role._id],
    });
    const ctx = context_for(admin, admin_role);

    const lead = await Lead.create({
      name: 'Smoke Lead',
      email: 'smokelead@example.com',
      phone: '1',
    });

    const created = body(
      await run(
        'mutation ($input: CreateActivityInput!) { createActivity(input: $input) { id subject } }',
        ctx,
        {
          input: {
            type: 'Note',
            subject: 'Logged a call',
            target_type: 'Lead',
            target_id: String(lead._id),
          },
        }
      )
    );
    expect(created.errors).toBeUndefined();

    // The union must resolve to the concrete type via __resolveType.
    const timeline = body(
      await run(
        `{ activities(target_type: Lead, target_id: "${String(lead._id)}") {
             items { subject target { ... on Lead { id name } } }
             total
           } }`,
        ctx
      )
    );
    expect(timeline.errors).toBeUndefined();
    const page = timeline.data?.activities as { total: number; items: Array<{ target: { name: string } }> };
    expect(page.total).toBe(1);
    expect(page.items[0].target.name).toBe('Smoke Lead');
  });

  it('exposes the activity log that used to be unreachable', async () => {
    const admin_role = await Role.create({ name: 'SmokeAdmin', permissions: { '*': true } });
    const admin = await User.create({
      name: 'Smoke Admin',
      email: 'smokeadmin@example.com',
      password: 'password123',
      role_ids: [admin_role._id],
    });

    const res = body(await run('{ auditLogs { id action } }', context_for(admin, admin_role)));
    expect(res.errors).toBeUndefined();
  });
});
