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
    errorPolicy: 'all',
  });

  const [updateLeadMutation] = useMutation(UPDATE_LEAD_MUTATION, {
    errorPolicy: 'all',
  });

  const [deleteLeadMutation] = useMutation(DELETE_LEAD_MUTATION, {
    errorPolicy: 'all',
  });

  const create = useCallback(
    async (input: LeadInput) => {
      const response = await createLeadMutation({ variables: { input } });
      if (response?.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message);
      }
      if (response.data?.createLead) {
        await refetch();
        return response.data.createLead;
      }
      throw new Error('No data returned from server');
    },
    [createLeadMutation, refetch]
  );

  const update = useCallback(
    async (id: string, input: LeadInput) => {
      const response = await updateLeadMutation({ variables: { id, input } });
      if (response?.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message);
      }
      if (response.data?.updateLead) {
        await refetch();
        return response.data.updateLead;
      }
      throw new Error('No data returned from server');
    },
    [updateLeadMutation, refetch]
  );

  const delete_ = useCallback(
    async (id: string) => {
      const response = await deleteLeadMutation({ variables: { id } });
      if (response?.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message);
      }
      if (response.data?.deleteLead) {
        await refetch();
        return response.data.deleteLead;
      }
      throw new Error('No data returned from server');
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
