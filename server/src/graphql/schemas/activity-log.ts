import { gql } from 'graphql-tag';

export default gql`
  type ActivityLog {
    id: ID!
    user: User!
    action: String!
    metadata: JSON
    created_at: String!
  }

  input LogActivityInput {
    user_id: ID!
    action: String!
    metadata: JSON
  }

  type Query {
    activityLogs(user_id: ID): [ActivityLog!]!
  }

  type Mutation {
    logActivity(input: LogActivityInput!): ActivityLog!
  }

  scalar JSON
`;
