import { gql } from 'graphql-tag';

export default gql`
  enum DealStatus {
    Open
    Won
    Lost
    Pending
  }

  type Deal {
    id: ID!
    title: String!
    customer: Customer!
    owner: User
    value: Float!
    status: DealStatus!
    stage: String!
    created_at: String
    updated_at: String
  }

  input CreateDealInput {
    title: String!
    customer_id: ID!
    owner_id: ID
    value: Float!
    status: DealStatus
    stage: String!
  }

  input UpdateDealInput {
    title: String
    customer_id: ID
    owner_id: ID
    value: Float
    status: DealStatus
    stage: String
  }

  type Query {
    deals: [Deal!]!
    deal(id: ID!): Deal
    dealsByOwner(owner_id: ID!): [Deal!]!
  }

  type Mutation {
    createDeal(input: CreateDealInput!): Deal!
    updateDeal(id: ID!, input: UpdateDealInput!): Deal!
    deleteDeal(id: ID!): Boolean!
  }
`;
