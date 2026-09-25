import { gql } from 'graphql-tag';

export default gql`
  enum TicketPriority {
    Low
    Medium
    High
    Urgent
  }

  enum TicketCategory {
    Billing
    Bug
    Feature_Request
    Onboarding
    Account
    Other
  }

  enum SupportStatus {
    Open
    InProgress
    Resolved
    Closed
  }

  type SupportTicket {
    id: ID!
    customer: Customer!
    assigned_agent: User
    status: SupportStatus!
    issue_summary: String!
    internal_notes: String
    priority: TicketPriority!
    category: TicketCategory!
    "Deadline for the first response, derived from priority at creation."
    sla_due_at: String!
    first_response_at: String
    resolved_at: String
    "True when the first response is outstanding past its deadline."
    is_sla_breached: Boolean!
    created_at: String
    updated_at: String
  }

  input CreateSupportTicketInput {
    customer_id: ID!
    assigned_agent: ID!
    issue_summary: String!
    status: SupportStatus
    internal_notes: String
    priority: TicketPriority
    category: TicketCategory
  }

  input UpdateSupportTicketInput {
    customer_id: ID
    issue_summary: String
    status: SupportStatus
    internal_notes: String
    assigned_agent: ID
    priority: TicketPriority
    category: TicketCategory
  }

  type SupportTicketPage {
    items: [SupportTicket!]!
    total: Int!
    has_more: Boolean!
  }

  type Query {
    supportTickets(search: String, limit: Int, offset: Int): SupportTicketPage!
    supportTicket(id: ID!): SupportTicket
  }

  type Mutation {
    createSupportTicket(input: CreateSupportTicketInput!): SupportTicket!
    updateSupportTicket(id: ID!, input: UpdateSupportTicketInput!): SupportTicket!
    deleteSupportTicket(id: ID!): Boolean!
  }
`;
