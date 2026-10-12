import { gql } from 'graphql-tag';

export default gql`
  type AuditLog {
    id: ID!
    user: User!
    action: String!
    metadata: JSON
    created_at: String!
  }

  input LogAuditInput {
    action: String!
    metadata: JSON
  }

  type Query {
    auditLogs(user_id: ID): [AuditLog!]!
  }

  type Mutation {
    logAudit(input: LogAuditInput!): AuditLog!
  }

  scalar JSON
`;
