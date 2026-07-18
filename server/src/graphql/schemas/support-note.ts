import { gql } from 'graphql-tag';

export default gql`
  type SupportNote {
    id: ID!
    customer: Customer!
    author: User!
    content: String!
    created_at: String!
  }

  input CreateSupportNoteInput {
    customer_id: ID!
    content: String!
  }

  input UpdateSupportNoteInput {
    content: String!
  }

  type Query {
    supportNotes(customer_id: ID!): [SupportNote!]!
    supportNote(id: ID!): SupportNote
  }

  type Mutation {
    createSupportNote(input: CreateSupportNoteInput!): SupportNote!
    updateSupportNote(id: ID!, input: UpdateSupportNoteInput!): SupportNote!
    deleteSupportNote(id: ID!): Boolean!
  }
`;
