import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  LEADS_QUERY,
  CREATE_LEAD_MUTATION,
  UPDATE_LEAD_MUTATION,
  DELETE_LEAD_MUTATION,
} from '../lib/graphql-queries';
import type { Lead, LeadInput } from '../types/lead';

interface UseLeadsOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

export const useLeads = (options: UseLeadsOptions = {}) => {
  const [search, setSearch] = useState(options.search || '');
  const [limit] = useState(options.limit || 20);
  const [offset, setOffset] = useState(options.offset || 0);
  const [error, setError] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(LEADS_QUERY, {
    variables: { search: search || undefined, limit, offset },
    onError: (err) => setError(err.message),
  });

  const [createLeadMutation] = useMutation(CREATE_LEAD_MUTATION, {
    onError: (err) => setError(err.message),
  });

  const [updateLeadMutation] = useMutation(UPDATE_LEAD_MUTATION, {
    onError: (err) => setError(err.message),
  });

  const [deleteLeadMutation] = useMutation(DELETE_LEAD_MUTATION, {
    onError: (err) => setError(err.message),
  });

  const create = useCallback(
    async (input: LeadInput) => {
      try {
        const { data: result } = await createLeadMutation({ variables: { input } });
        await refetch();
        return result.createLead;
      } catch (err) {
        throw err;
      }
    },
    [createLeadMutation, refetch]
  );

  const update = useCallback(
    async (id: string, input: LeadInput) => {
      try {
        const { data: result } = await updateLeadMutation({ variables: { id, input } });
        await refetch();
        return result.updateLead;
      } catch (err) {
        throw err;
      }
    },
    [updateLeadMutation, refetch]
  );

  const delete_ = useCallback(
    async (id: string) => {
      try {
        await deleteLeadMutation({ variables: { id } });
        await refetch();
      } catch (err) {
        throw err;
      }
    },
    [deleteLeadMutation, refetch]
  );

  return {
    leads: (data?.leads?.data || []) as Lead[],
    total: data?.leads?.total || 0,
    loading,
    error,
    setError,
    setSearch,
    setOffset,
    search,
    offset,
    limit,
    create,
    update,
    delete: delete_,
    refetch,
  };
};
