import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  SCORE_LEAD_MUTATION,
  SCORE_LEADS_BULK_MUTATION,
  AI_STATUS_QUERY,
} from '../lib/graphql-queries';

/**
 * Scoring is always an explicit action.
 *
 * Nothing here runs on render or on list load: free-tier request ceilings are
 * low, and scoring a page of leads automatically would exhaust the quota
 * before anyone clicked anything. The server caches results on the document,
 * so an already-scored lead costs nothing to display.
 */
export const useLeadScoring = () => {
  const [scoring_ids, set_scoring_ids] = useState<Set<string>>(new Set());
  const [error, set_error] = useState<string | null>(null);

  const { data: status_data } = useQuery(AI_STATUS_QUERY);
  const [score_mutation] = useMutation(SCORE_LEAD_MUTATION, { errorPolicy: 'all' });
  const [bulk_mutation, { loading: bulk_loading }] = useMutation(SCORE_LEADS_BULK_MUTATION, {
    errorPolicy: 'all',
  });

  const mark = useCallback((id: string, active: boolean) => {
    set_scoring_ids((current) => {
      const next = new Set(current);
      if (active) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const score_lead = useCallback(
    async (id: string, refresh = false) => {
      set_error(null);
      mark(id, true);
      try {
        const response = await score_mutation({ variables: { id, refresh } });
        if (response.errors?.length) throw new Error(response.errors[0].message);
        // The mutation returns the full Lead, so Apollo's normalized cache
        // updates the row in place — no refetch needed.
        return response.data?.scoreLead;
      } catch (err) {
        set_error(err instanceof Error ? err.message : 'Failed to score lead');
        return null;
      } finally {
        mark(id, false);
      }
    },
    [mark, score_mutation]
  );

  const score_batch = useCallback(
    async (limit = 5) => {
      set_error(null);
      try {
        const response = await bulk_mutation({ variables: { limit } });
        if (response.errors?.length) throw new Error(response.errors[0].message);
        return (response.data?.scoreLeadsBulk ?? []).length;
      } catch (err) {
        set_error(err instanceof Error ? err.message : 'Failed to score leads');
        return 0;
      }
    },
    [bulk_mutation]
  );

  return {
    score_lead,
    score_batch,
    is_scoring: (id: string) => scoring_ids.has(id),
    bulk_loading,
    error,
    clear_error: () => set_error(null),
    /** False when the deterministic demo model is answering. */
    is_live: Boolean(status_data?.aiStatus?.is_live),
    provider: status_data?.aiStatus?.provider ?? 'mock',
  };
};
