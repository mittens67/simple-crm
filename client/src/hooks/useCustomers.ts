import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  CUSTOMERS_QUERY,
  CREATE_CUSTOMER_MUTATION,
  UPDATE_CUSTOMER_MUTATION,
  DELETE_CUSTOMER_MUTATION,
} from '../lib/graphql-queries';
import type { Customer, CustomerInput } from '../types/customer';

export const useCustomers = () => {
  const [error, setError] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(CUSTOMERS_QUERY, {
    onError: (err) => setError(err.message),
  });

  const [createCustomerMutation] = useMutation(CREATE_CUSTOMER_MUTATION, {
    onError: (err) => setError(err.message),
  });

  const [updateCustomerMutation] = useMutation(UPDATE_CUSTOMER_MUTATION, {
    onError: (err) => setError(err.message),
  });

  const [deleteCustomerMutation] = useMutation(DELETE_CUSTOMER_MUTATION, {
    onError: (err) => setError(err.message),
  });

  const create = useCallback(
    async (input: CustomerInput) => {
      try {
        const { data: result } = await createCustomerMutation({ variables: { input } });
        await refetch();
        return result.createCustomer;
      } catch (err) {
        throw err;
      }
    },
    [createCustomerMutation, refetch]
  );

  const update = useCallback(
    async (id: string, input: CustomerInput) => {
      try {
        const { data: result } = await updateCustomerMutation({ variables: { id, input } });
        await refetch();
        return result.updateCustomer;
      } catch (err) {
        throw err;
      }
    },
    [updateCustomerMutation, refetch]
  );

  const delete_ = useCallback(
    async (id: string) => {
      try {
        await deleteCustomerMutation({ variables: { id } });
        await refetch();
      } catch (err) {
        throw err;
      }
    },
    [deleteCustomerMutation, refetch]
  );

  return {
    customers: (data?.customers || []) as Customer[],
    loading,
    error,
    setError,
    create,
    update,
    delete: delete_,
    refetch,
  };
};
