import { gql } from 'graphql-tag';

export default gql`
  enum SupportStatus {
    Open
    InProgress
    Resolved
    Closed
  }

  type SupportTicket {
    id: ID!
    customer: Customer!
    assigned_agent: User!
    status: SupportStatus!
    issue_summary: String!
    internal_notes: String
    created_at: String
    updated_at: String
  }

  input CreateSupportTicketInput {
    customer_id: ID!
    assigned_agent: ID!
    issue_summary: String!
    status: SupportStatus
    internal_notes: String
  }

  input UpdateSupportTicketInput {
    status: SupportStatus
    internal_notes: String
  }

  type Query {
    supportTickets: [SupportTicket!]!
    supportTicket(id: ID!): SupportTicket
  }

  type Mutation {
    createSupportTicket(input: CreateSupportTicketInput!): SupportTicket!
    updateSupportTicket(id: ID!, input: UpdateSupportTicketInput!): SupportTicket!
    deleteSupportTicket(id: ID!): Boolean!
  }
`;
