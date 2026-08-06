import { GraphQLError } from 'graphql';
import { ApolloContext } from '../graphql/context';
import { format_error } from './errors';

type Resolver = (parent: any, args: any, context: ApolloContext, info: any) => Promise<any> | any;

export function wrap_resolver(resolver: Resolver): Resolver {
  return async (parent: any, args: any, context: ApolloContext, info: any) => {
    try {
      return await resolver(parent, args, context, info);
    } catch (error) {
      throw format_error(error);
    }
  };
}

export function create_query_resolver<T extends Record<string, Resolver>>(resolvers: T): T {
  const wrapped: any = {};
  for (const [key, resolver] of Object.entries(resolvers)) {
    wrapped[key] = wrap_resolver(resolver);
  }
  return wrapped;
}

export function create_mutation_resolver<T extends Record<string, Resolver>>(resolvers: T): T {
  const wrapped: any = {};
  for (const [key, resolver] of Object.entries(resolvers)) {
    wrapped[key] = wrap_resolver(resolver);
  }
  return wrapped;
}
