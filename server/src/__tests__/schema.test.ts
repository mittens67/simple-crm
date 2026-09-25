import { describe, it, expect } from 'vitest';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLEnumType, GraphQLObjectType } from 'graphql';
import { typeDefs } from '../graphql/typedefs';
import { resolvers } from '../graphql/resolvers';
import SupportTicket from '../models/support-ticket';
import Deal from '../models/deal';
import Lead from '../models/lead';

// Every other test in this suite calls resolver functions directly, which means
// nothing verifies that the schema and the resolvers actually fit together, or
// that the enums the API exposes match the values the database stores. Those
// two gaps are what let the Deals and Support pages ship broken.
describe('GraphQL schema', () => {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  it('builds without errors', () => {
    expect(schema).toBeDefined();
    expect(schema.getQueryType()).toBeDefined();
    expect(schema.getMutationType()).toBeDefined();
  });

  it('exposes every resolver module through the schema', () => {
    const query_fields = schema.getQueryType()!.getFields();
    for (const field of [
      'users',
      'roles',
      'leads',
      'customers',
      'deals',
      'supportTickets',
      'supportNotes',
      'auditLogs',
    ]) {
      expect(query_fields[field], `Query.${field} is missing from the schema`).toBeDefined();
    }
  });

  it('has no resolver defined for a type the schema does not declare', () => {
    for (const type_name of Object.keys(resolvers)) {
      // Scalars and root types are checked separately above.
      if (type_name === 'JSON') continue;
      expect(schema.getType(type_name), `${type_name} has resolvers but no schema type`).toBeDefined();
    }
  });

  /**
   * Mongoose enums and GraphQL enums are declared in different files. When they
   * drift, reads fail at serialization time — which no direct resolver call
   * would ever surface.
   */
  const enum_matches_model = (graphql_enum: string, model_values: string[]) => {
    const type = schema.getType(graphql_enum) as GraphQLEnumType;
    const schema_values = type.getValues().map((v) => v.value);
    expect(new Set(schema_values)).toEqual(new Set(model_values));
  };

  it('SupportStatus matches the stored ticket status values', () => {
    enum_matches_model('SupportStatus', SupportTicket.schema.path('status').options.enum);
  });

  it('DealStatus matches the stored deal status values', () => {
    enum_matches_model('DealStatus', Deal.schema.path('status').options.enum);
  });

  it('LeadStatus matches the stored lead status values', () => {
    enum_matches_model('LeadStatus', Lead.schema.path('status').options.enum);
  });

  /**
   * A field that is required in Mongoose but optional in the GraphQL input
   * produces a raw Mongoose ValidationError that bypasses our error mapping.
   */
  it('required model refs are required in their create inputs', () => {
    const assert_matches = (
      input_name: string,
      input_field: string,
      model_required: boolean
    ) => {
      const input_type = schema.getType(input_name) as unknown as GraphQLObjectType;
      const field = input_type.getFields()[input_field];
      const graphql_required = String(field.type).endsWith('!');
      expect(
        graphql_required,
        `${input_name}.${input_field} required=${graphql_required} but model required=${model_required}`
      ).toBe(model_required);
    };

    const required_on = (path_options: { required?: unknown }) => Boolean(path_options.required);

    assert_matches('CreateDealInput', 'customer_id', required_on(Deal.schema.path('customer_id').options));
    assert_matches('CreateDealInput', 'owner_id', required_on(Deal.schema.path('owner_id').options));
    assert_matches(
      'CreateSupportTicketInput',
      'customer_id',
      required_on(SupportTicket.schema.path('customer_id').options)
    );
    assert_matches(
      'CreateSupportTicketInput',
      'assigned_agent',
      required_on(SupportTicket.schema.path('assigned_agent').options)
    );
  });
});
