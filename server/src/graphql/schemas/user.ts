import { gql } from 'graphql-tag';

export default gql`
  type User {
    id: ID!
    name: String!
    email: String!
    roles: [Role!]!
    is_active: Boolean!
    created_at: String
    updated_at: String
  }

  type AuthPayload {
    accessToken: String!
    user: User!
  }

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
    role_ids: [ID!]!
  }

  input UpdateUserInput {
    name: String
    email: String
    password: String
    role_ids: [ID!]
    is_active: Boolean
  }

  type UserRole {
    id: ID!
    name: String!
    permissions: JSON
  }

  input AddUserRoleInput {
    role_id: ID!
  }

  input RemoveUserRoleInput {
    role_id: ID!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input ChangePasswordInput {
    oldPassword: String!
    newPassword: String!
  }

  type Mutation {
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!
    addUserRole(user_id: ID!, role_id: ID!): User!
    removeUserRole(user_id: ID!, role_id: ID!): User!

    login(input: LoginInput!): AuthPayload!
    refreshToken: AuthPayload!
    logout: Boolean!
    changePassword(input: ChangePasswordInput!): Boolean!
  }

  type Query {
    users: [User!]!
    user(id: ID!): User
    me: User
  }
`;
