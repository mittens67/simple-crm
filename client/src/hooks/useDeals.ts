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
    errorPolicy: 'all',
  });

  const [updateDealMutation] = useMutation(UPDATE_DEAL_MUTATION, {
    errorPolicy: 'all',
  });

  const [deleteDealMutation] = useMutation(DELETE_DEAL_MUTATION, {
    errorPolicy: 'all',
  });

  const create = useCallback(
    async (input: DealInput) => {
      const response = await createDealMutation({ variables: { input } });
      if (response?.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message);
      }
      if (response.data?.createDeal) {
        await refetch();
        return response.data.createDeal;
      }
      throw new Error('No data returned from server');
    },
    [createDealMutation, refetch]
  );

  const update = useCallback(
    async (id: string, input: DealInput) => {
      try {
        const response = await updateDealMutation({ variables: { id, input } });
        if (response?.errors && response.errors.length > 0) {
          throw new Error(response.errors[0].message);
        }
        if (response.data?.updateDeal) {
          await refetch();
          return response.data.updateDeal;
        }
        throw new Error('No data returned from server');
      } catch (err) {
        if (err instanceof Error && 'graphQLErrors' in err && Array.isArray((err as any).graphQLErrors) && (err as any).graphQLErrors.length > 0) {
          throw new Error((err as any).graphQLErrors[0].message);
        }
        throw err;
      }
    },
    [updateDealMutation, refetch]
  );

  const delete_ = useCallback(
    async (id: string) => {
      try {
        const response = await deleteDealMutation({ variables: { id } });
        if (response?.errors && response.errors.length > 0) {
          throw new Error(response.errors[0].message);
        }
        if (response.data?.deleteDeal) {
          await refetch();
          return response.data.deleteDeal;
        }
        throw new Error('No data returned from server');
      } catch (err) {
        if (err instanceof Error && 'graphQLErrors' in err && Array.isArray((err as any).graphQLErrors) && (err as any).graphQLErrors.length > 0) {
          throw new Error((err as any).graphQLErrors[0].message);
        }
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
