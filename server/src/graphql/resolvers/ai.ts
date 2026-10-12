import { ApolloContext } from '../context';
import { ai_service } from '../../services/ai';
import { ILead } from '../../models/lead';

type TargetType = 'Lead' | 'Customer' | 'Deal' | 'SupportTicket';

export default {
  Query: {
    aiStatus: () => ai_service.status(),

    aiSearch: async (
      _: unknown,
      { question, limit }: { question: string; limit?: number },
      context: ApolloContext
    ) => {
      const { plan, entity, results } = await ai_service.search(context, question, limit);

      // Results are returned under the field matching the entity the model
      // chose, so each is properly typed rather than a union the client has
      // to unpick.
      return {
        plan: { entity, explanation: plan.explanation, filters: plan.filters },
        total: results.total,
        has_more: results.has_more,
        leads: entity === 'leads' ? results.items : null,
        customers: entity === 'customers' ? results.items : null,
        deals: entity === 'deals' ? results.items : null,
        supportTickets: entity === 'support_tickets' ? results.items : null,
      };
    },

    aiSummary: (
      _: unknown,
      { target_type, target_id }: { target_type: TargetType; target_id: string },
      context: ApolloContext
    ) => ai_service.summarise(context, target_type, target_id),
  },

  Mutation: {
    scoreLead: (
      _: unknown,
      { id, refresh }: { id: string; refresh?: boolean },
      context: ApolloContext
    ) => ai_service.score_lead(context, id, refresh ?? false),

    scoreLeadsBulk: (_: unknown, { limit }: { limit?: number }, context: ApolloContext) =>
      ai_service.score_leads_bulk(context, limit ?? 5),

    draftEmail: (
      _: unknown,
      {
        target_type,
        target_id,
        instruction,
      }: { target_type: TargetType; target_id: string; instruction?: string },
      context: ApolloContext
    ) => ai_service.draft_email(context, target_type, target_id, instruction),
  },

  Lead: {
    // Dates serialize as ISO strings for the client.
    ai_scored_at: (lead: ILead) => lead.ai_scored_at?.toISOString() ?? null,
  },
};
