import { gql } from 'graphql-tag';

export default gql`
  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
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
    role_id: ID!
  }

  input UpdateUserInput {
    name: String
    email: String
    password: String
    role_id: ID
    is_active: Boolean
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
