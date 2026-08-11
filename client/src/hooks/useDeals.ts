import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  DEALS_QUERY,
  CREATE_DEAL_MUTATION,
  UPDATE_DEAL_MUTATION,
  DELETE_DEAL_MUTATION,
} from '../lib/graphql-queries';
import type { Deal, DealInput } from '../types/deal';

export const useDeals = () => {
  const [error, setError] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(DEALS_QUERY, {
    onError: (err) => setError(err.message),
  });

  const [createDealMutation] = useMutation(CREATE_DEAL_MUTATION, {
    onError: (err) => setError(err.message),
  });

  const [updateDealMutation] = useMutation(UPDATE_DEAL_MUTATION, {
    onError: (err) => setError(err.message),
  });

  const [deleteDealMutation] = useMutation(DELETE_DEAL_MUTATION, {
    onError: (err) => setError(err.message),
  });

  const create = useCallback(
    async (input: DealInput) => {
      try {
        const { data: result } = await createDealMutation({ variables: { input } });
        await refetch();
        return result.createDeal;
      } catch (err) {
        throw err;
      }
    },
    [createDealMutation, refetch]
  );

  const update = useCallback(
    async (id: string, input: DealInput) => {
      try {
        const { data: result } = await updateDealMutation({ variables: { id, input } });
        await refetch();
        return result.updateDeal;
      } catch (err) {
        throw err;
      }
    },
    [updateDealMutation, refetch]
  );

  const delete_ = useCallback(
    async (id: string) => {
      try {
        await deleteDealMutation({ variables: { id } });
        await refetch();
      } catch (err) {
        throw err;
      }
    },
    [deleteDealMutation, refetch]
  );

  return {
    deals: (data?.deals || []) as Deal[],
    loading,
    error,
    setError,
    create,
    update,
    delete: delete_,
    refetch,
  };
};
