import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, type DocumentNode } from '@apollo/client';

/**
 * One implementation of the list + create/update/delete cycle.
 *
 * useLeads, useCustomers, useDeals, useSupportTickets and useUsers were five
 * near-identical ~100-line files that differed only in the entity noun and the
 * imported document names. The same twelve-line "check errors, refetch, throw
 * 'No data returned from server'" block appeared twelve times.
 */

export interface EntityPage<T> {
  items: T[];
  total: number;
  has_more: boolean;
}

interface EntityDocuments {
  list: DocumentNode;
  create?: DocumentNode;
  update?: DocumentNode;
  remove?: DocumentNode;
}

interface EntityCrudOptions {
  /** Root field of the list query, e.g. 'leads'. */
  list_field: string;
  /** Root fields of the mutations, e.g. 'createLead'. */
  create_field?: string;
  update_field?: string;
  remove_field?: string;
  documents: EntityDocuments;
  page_size?: number;
}

export const DEFAULT_PAGE_SIZE = 20;

/**
 * Apollo reports GraphQL errors in two shapes depending on whether the
 * operation threw or returned an errors array under `errorPolicy: 'all'`.
 * Both were previously unwrapped by hand, inconsistently, in each hook.
 */
const message_from = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    const graphql_errors = (error as { graphQLErrors?: Array<{ message: string }> }).graphQLErrors;
    if (graphql_errors?.length) return graphql_errors[0].message;
    return error.message;
  }
  return fallback;
};

export const useEntityCrud = <T, TInput>({
  list_field,
  create_field,
  update_field,
  remove_field,
  documents,
  page_size = DEFAULT_PAGE_SIZE,
}: EntityCrudOptions) => {
  const [search, set_search] = useState('');
  const [offset, set_offset] = useState(0);
  const [error, set_error] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(documents.list, {
    variables: { search: search || undefined, limit: page_size, offset },
    onError: (err) => set_error(err.message),
    // Keeps the previous page on screen while the next one loads instead of
    // blanking the table.
    notifyOnNetworkStatusChange: true,
  });

  const page = useMemo<EntityPage<T>>(() => {
    const raw = data?.[list_field];
    // users is still a bare list; everything else is paginated.
    if (Array.isArray(raw)) {
      return { items: raw as T[], total: raw.length, has_more: false };
    }
    return {
      items: (raw?.items ?? []) as T[],
      total: raw?.total ?? 0,
      has_more: raw?.has_more ?? false,
    };
  }, [data, list_field]);

  const [create_mutation] = useMutation(documents.create ?? documents.list, {
    errorPolicy: 'all',
  });
  const [update_mutation] = useMutation(documents.update ?? documents.list, {
    errorPolicy: 'all',
  });
  const [remove_mutation] = useMutation(documents.remove ?? documents.list, {
    errorPolicy: 'all',
  });

  const run = useCallback(
    async <R>(
      mutate: () => Promise<{ data?: Record<string, unknown>; errors?: readonly { message: string }[] }>,
      field: string,
      action: string
    ): Promise<R> => {
      try {
        const response = await mutate();
        if (response?.errors?.length) {
          throw new Error(response.errors[0].message);
        }
        const result = response.data?.[field];
        if (result === undefined || result === null) {
          throw new Error(`Failed to ${action}`);
        }
        await refetch();
        return result as R;
      } catch (err) {
        throw new Error(message_from(err, `Failed to ${action}`));
      }
    },
    [refetch]
  );

  const create = useCallback(
    (input: TInput) =>
      run<T>(() => create_mutation({ variables: { input } }), create_field!, 'create'),
    [create_mutation, create_field, run]
  );

  const update = useCallback(
    (id: string, input: TInput) =>
      run<T>(() => update_mutation({ variables: { id, input } }), update_field!, 'update'),
    [update_mutation, update_field, run]
  );

  const remove = useCallback(
    (id: string) => run<boolean>(() => remove_mutation({ variables: { id } }), remove_field!, 'delete'),
    [remove_mutation, remove_field, run]
  );

  const next_page = useCallback(() => set_offset((current) => current + page_size), [page_size]);
  const previous_page = useCallback(
    () => set_offset((current) => Math.max(0, current - page_size)),
    [page_size]
  );

  // A new search must return to the first page, or the results can look empty.
  const search_for = useCallback((term: string) => {
    set_search(term);
    set_offset(0);
  }, []);

  return {
    items: page.items,
    total: page.total,
    has_more: page.has_more,
    loading,
    error,
    set_error,
    search,
    set_search: search_for,
    offset,
    limit: page_size,
    next_page,
    previous_page,
    create,
    update,
    remove,
    refetch,
  };
};
