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
    errorPolicy: 'all',
  });

  const [updateCustomerMutation] = useMutation(UPDATE_CUSTOMER_MUTATION, {
    errorPolicy: 'all',
  });

  const [deleteCustomerMutation] = useMutation(DELETE_CUSTOMER_MUTATION, {
    errorPolicy: 'all',
  });

  const create = useCallback(
    async (input: CustomerInput) => {
      const response = await createCustomerMutation({ variables: { input } });
      if (response?.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message);
      }
      if (response.data?.createCustomer) {
        await refetch();
        return response.data.createCustomer;
      }
      throw new Error('No data returned from server');
    },
    [createCustomerMutation, refetch]
  );

  const update = useCallback(
    async (id: string, input: CustomerInput) => {
      try {
        const response = await updateCustomerMutation({ variables: { id, input } });
        if (response?.errors && response.errors.length > 0) {
          throw new Error(response.errors[0].message);
        }
        if (response.data?.updateCustomer) {
          await refetch();
          return response.data.updateCustomer;
        }
        throw new Error('No data returned from server');
      } catch (err: any) {
        if (err?.graphQLErrors?.length > 0) {
          throw new Error(err.graphQLErrors[0].message);
        }
        throw err;
      }
    },
    [updateCustomerMutation, refetch]
  );

  const delete_ = useCallback(
    async (id: string) => {
      try {
        const response = await deleteCustomerMutation({ variables: { id } });
        if (response?.errors && response.errors.length > 0) {
          throw new Error(response.errors[0].message);
        }
        if (response.data?.deleteCustomer) {
          await refetch();
          return response.data.deleteCustomer;
        }
        throw new Error('No data returned from server');
      } catch (err: any) {
        if (err?.graphQLErrors?.length > 0) {
          throw new Error(err.graphQLErrors[0].message);
        }
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
