import { gql } from 'graphql-tag';

export default gql`
  type AiStatus {
    "Which backend is answering: mock, gemini or mistral."
    provider: String!
    "False when the deterministic mock is answering, so the UI can say so."
    is_live: Boolean!
    model: String
  }

  enum AiTargetType {
    Lead
    Customer
    Deal
    SupportTicket
  }

  enum AiSearchEntity {
    leads
    customers
    deals
    support_tickets
  }

  """
  What the model understood, returned alongside the results so the user can
  see how their question was read rather than trusting it blindly.
  """
  type AiSearchPlan {
    entity: AiSearchEntity!
    explanation: String
    "The validated filter, as JSON, for display and debugging."
    filters: JSON!
  }

  type AiSearchResult {
    plan: AiSearchPlan!
    total: Int!
    has_more: Boolean!
    leads: [Lead!]
    customers: [Customer!]
    deals: [Deal!]
    supportTickets: [SupportTicket!]
  }

  extend type Lead {
    "0-100 likelihood this lead converts. Null until scored."
    ai_score: Int
    ai_rationale: String
    ai_next_action: String
    ai_confidence: Float
    ai_scored_at: String
    ai_provider: String
  }

  type Query {
    aiStatus: AiStatus!
    "Answers a natural-language question by compiling it to a validated filter."
    aiSearch(question: String!, limit: Int): AiSearchResult!
    "Summarises a record's activity timeline."
    aiSummary(target_type: AiTargetType!, target_id: ID!): String!
  }

  type Mutation {
    "Scores a lead and caches the result. Reuses a fresh score unless refresh is true."
    scoreLead(id: ID!, refresh: Boolean): Lead!
    "Scores up to \`limit\` of the caller's unscored open leads."
    scoreLeadsBulk(limit: Int): [Lead!]!
    "Drafts a follow-up email from the record's history."
    draftEmail(target_type: AiTargetType!, target_id: ID!, instruction: String): String!
  }
`;
