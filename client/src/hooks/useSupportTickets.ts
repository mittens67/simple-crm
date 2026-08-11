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
    onError: (err) => setError(err.message),
  });

  const [updateTicketMutation] = useMutation(UPDATE_SUPPORT_TICKET_MUTATION, {
    onError: (err) => setError(err.message),
  });

  const [deleteTicketMutation] = useMutation(DELETE_SUPPORT_TICKET_MUTATION, {
    onError: (err) => setError(err.message),
  });

  const create = useCallback(
    async (input: SupportTicketInput) => {
      try {
        const { data: result } = await createTicketMutation({ variables: { input } });
        await refetch();
        return result.createSupportTicket;
      } catch (err) {
        throw err;
      }
    },
    [createTicketMutation, refetch]
  );

  const update = useCallback(
    async (id: string, input: SupportTicketInput) => {
      try {
        const { data: result } = await updateTicketMutation({ variables: { id, input } });
        await refetch();
        return result.updateSupportTicket;
      } catch (err) {
        throw err;
      }
    },
    [updateTicketMutation, refetch]
  );

  const delete_ = useCallback(
    async (id: string) => {
      try {
        await deleteTicketMutation({ variables: { id } });
        await refetch();
      } catch (err) {
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
