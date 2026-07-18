import { gql } from 'graphql-tag';

export default gql`
  type Customer {
    id: ID!
    name: String!
    email: String!
    phone: String!
    assigned_rep: User
    created_at: String
    updated_at: String
  }

  input CreateCustomerInput {
    name: String!
    email: String!
    phone: String!
    assigned_rep_id: ID
  }

  input UpdateCustomerInput {
    name: String
    email: String
    phone: String
    assigned_rep_id: ID
  }

  type Query {
    customers: [Customer!]!
    customer(id: ID!): Customer
  }

  type Mutation {
    createCustomer(input: CreateCustomerInput!): Customer!
    updateCustomer(id: ID!, input: UpdateCustomerInput!): Customer!
    deleteCustomer(id: ID!): Boolean!
  }
`;
