import { gql } from 'graphql-tag';

export default gql`
  enum DealStatus {
    Open
    Won
    Lost
    Pending
  }

  enum LostReason {
    Price
    Lost_to_competitor
    No_budget
    No_decision
    Bad_timing
    Missing_features
    Other
  }

  type Deal {
    id: ID!
    title: String!
    customer: Customer!
    owner: User
    value: Float!
    status: DealStatus!
    pipeline: Pipeline
    stage: Stage
    "When the deal entered its current stage — the basis for time-in-stage."
    stage_entered_at: String!
    "Whole days the deal has sat in its current stage."
    days_in_stage: Int!
    expected_close_date: String
    closed_at: String
    lost_reason: LostReason
    "value scaled by the current stage's probability."
    weighted_value: Float!
    created_at: String
    updated_at: String
  }

  input CreateDealInput {
    title: String!
    customer_id: ID!
    owner_id: ID!
    value: Float!
    status: DealStatus
    "Defaults to the default pipeline when omitted."
    pipeline_id: ID
    "Defaults to the first stage of the pipeline when omitted."
    stage_id: ID
    expected_close_date: String
  }

  input UpdateDealInput {
    title: String
    customer_id: ID
    owner_id: ID
    value: Float
    status: DealStatus
    expected_close_date: String
    lost_reason: LostReason
  }

  type DealPage {
    items: [Deal!]!
    total: Int!
    has_more: Boolean!
  }

  "Deals grouped by stage, for rendering a pipeline board."
  type PipelineBoardColumn {
    stage: Stage!
    deals: [Deal!]!
    total_value: Float!
    deal_count: Int!
  }

  type Query {
    deals(search: String, limit: Int, offset: Int): DealPage!
    deal(id: ID!): Deal
    dealsByOwner(owner_id: ID!): [Deal!]!
    "Every open deal in a pipeline, grouped into its stages."
    pipelineBoard(pipeline_id: ID): [PipelineBoardColumn!]!
  }

  type Mutation {
    createDeal(input: CreateDealInput!): Deal!
    updateDeal(id: ID!, input: UpdateDealInput!): Deal!
    "Moves a deal to another stage, stamping stage_entered_at."
    moveDealToStage(id: ID!, stage_id: ID!): Deal!
    deleteDeal(id: ID!): Boolean!
  }
`;
