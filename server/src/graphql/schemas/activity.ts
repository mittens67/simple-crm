import { gql } from 'graphql-tag';

export default gql`
  enum ActivityType {
    Call
    Email
    Meeting
    Note
    Task
  }

  enum ActivityTargetType {
    Lead
    Customer
    Deal
    SupportTicket
  }

  """
  Any record an activity can be attached to. A union rather than four nullable
  fields, so the schema makes it impossible to attach an activity to two
  things at once.
  """
  union ActivityTarget = Lead | Customer | Deal | SupportTicket

  type Activity {
    id: ID!
    type: ActivityType!
    subject: String!
    body: String
    target_type: ActivityTargetType!
    target_id: ID!
    target: ActivityTarget
    owner: User!
    due_at: String
    completed_at: String
    "True for a task that is due and not yet completed."
    is_overdue: Boolean!
    created_at: String
    updated_at: String
  }

  type ActivityPage {
    items: [Activity!]!
    total: Int!
    has_more: Boolean!
  }

  input CreateActivityInput {
    type: ActivityType!
    subject: String!
    body: String
    target_type: ActivityTargetType!
    target_id: ID!
    due_at: String
  }

  input UpdateActivityInput {
    type: ActivityType
    subject: String
    body: String
    due_at: String
  }

  type Query {
    "Timeline for one record, newest first."
    activities(
      target_type: ActivityTargetType!
      target_id: ID!
      limit: Int
      offset: Int
    ): ActivityPage!

    "Task list. Defaults to the caller's own open tasks."
    tasks(owner_id: ID, include_completed: Boolean, limit: Int, offset: Int): ActivityPage!

    activity(id: ID!): Activity
  }

  type Mutation {
    createActivity(input: CreateActivityInput!): Activity!
    updateActivity(id: ID!, input: UpdateActivityInput!): Activity!
    completeActivity(id: ID!): Activity!
    reopenActivity(id: ID!): Activity!
    deleteActivity(id: ID!): Boolean!
  }
`;
