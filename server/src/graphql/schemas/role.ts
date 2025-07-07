import { gql } from 'graphql-tag';

export default gql`
  scalar JSON

  type Role {
    id: ID!
    name: String!
    permissions: JSON
  }

  input PermissionInput {
    key: String!
    value: Boolean!
  }

  input CreateRoleInput {
    name: String!
    permissions: [PermissionInput!]
  }

  input UpdateRoleInput {
    name: String
    permissions: [PermissionInput!]
  }

  type Query {
    roles: [Role!]!
    role(id: ID!): Role
  }

  type Mutation {
    createRole(input: CreateRoleInput!): Role!
    updateRole(id: ID!, input: UpdateRoleInput!): Role!
    deleteRole(id: ID!): Boolean!
  }
`;
