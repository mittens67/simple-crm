import { gql } from 'graphql-tag';

export default gql`
  enum StageOutcome {
    open
    won
    lost
  }

  type Stage {
    id: ID!
    name: String!
    display_order: Int!
    "Win probability 0-100, used for weighted pipeline value."
    probability: Int!
    outcome: StageOutcome!
  }

  type Pipeline {
    id: ID!
    name: String!
    is_default: Boolean!
    stages: [Stage!]!
    created_at: String
    updated_at: String
  }

  input StageInput {
    name: String!
    display_order: Int!
    probability: Int!
    outcome: StageOutcome
  }

  input CreatePipelineInput {
    name: String!
    is_default: Boolean
    stages: [StageInput!]!
  }

  input UpdatePipelineInput {
    name: String
    is_default: Boolean
    stages: [StageInput!]
  }

  type Query {
    pipelines: [Pipeline!]!
    pipeline(id: ID!): Pipeline
    defaultPipeline: Pipeline
  }

  type Mutation {
    createPipeline(input: CreatePipelineInput!): Pipeline!
    updatePipeline(id: ID!, input: UpdatePipelineInput!): Pipeline!
    deletePipeline(id: ID!): Boolean!
  }
`;
