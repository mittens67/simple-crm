import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  SUPPORT_TICKETS_QUERY,
  CREATE_SUPPORT_TICKET_MUTATION,
  UPDATE_SUPPORT_TICKET_MUTATION,
  DELETE_SUPPORT_TICKET_MUTATION,
} from '../lib/graphql-queries';
import type { SupportTicket, SupportTicketInput } from '../types/support-ticket';

export const useSupportTickets = () => {
  const [error, setError] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(SUPPORT_TICKETS_QUERY, {
    onError: (err) => setError(err.message),
  });

  const [createTicketMutation] = useMutation(CREATE_SUPPORT_TICKET_MUTATION, {
    errorPolicy: 'all',
  });

  const [updateTicketMutation] = useMutation(UPDATE_SUPPORT_TICKET_MUTATION, {
    errorPolicy: 'all',
  });

  const [deleteTicketMutation] = useMutation(DELETE_SUPPORT_TICKET_MUTATION, {
    errorPolicy: 'all',
  });

  const create = useCallback(
    async (input: SupportTicketInput) => {
      const response = await createTicketMutation({ variables: { input } });
      if (response?.errors && response.errors.length > 0) {
        throw new Error(response.errors[0].message);
      }
      if (response.data?.createSupportTicket) {
        await refetch();
        return response.data.createSupportTicket;
      }
      throw new Error('No data returned from server');
    },
    [createTicketMutation, refetch]
  );

  const update = useCallback(
    async (id: string, input: SupportTicketInput) => {
      try {
        const response = await updateTicketMutation({ variables: { id, input } });
        if (response?.errors && response.errors.length > 0) {
          throw new Error(response.errors[0].message);
        }
        if (response.data?.updateSupportTicket) {
          await refetch();
          return response.data.updateSupportTicket;
        }
        throw new Error('No data returned from server');
      } catch (err: any) {
        if (err?.graphQLErrors?.length > 0) {
          throw new Error(err.graphQLErrors[0].message);
        }
        throw err;
      }
    },
    [updateTicketMutation, refetch]
  );

  const delete_ = useCallback(
    async (id: string) => {
      try {
        const response = await deleteTicketMutation({ variables: { id } });
        if (response?.errors && response.errors.length > 0) {
          throw new Error(response.errors[0].message);
        }
        if (response.data?.deleteSupportTicket) {
          await refetch();
          return response.data.deleteSupportTicket;
        }
        throw new Error('No data returned from server');
      } catch (err: any) {
        if (err?.graphQLErrors?.length > 0) {
          throw new Error(err.graphQLErrors[0].message);
        }
        throw err;
      }
    },
    [deleteTicketMutation, refetch]
  );

  return {
    tickets: (data?.supportTickets || []) as SupportTicket[],
    loading,
    error,
    setError,
    create,
    update,
    delete: delete_,
    refetch,
  };
};
