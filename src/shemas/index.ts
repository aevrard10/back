import { gql } from "apollo-server-express";

export const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    email: String!
  }

  type AuthPayload {
    success: Boolean!
    message: String!
    token: String
    user: User
  }

  input RegisterInput {
    username: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  type Reptile {
    id: ID!
    name: String!
    species: String!
    age: Int!
    last_fed: String!
    notes: String
  }

  input AddReptileInput {
    name: String!
    species: String!
    age: Int!
    last_fed: String!
  }

  type DeleteReptileResponse {
    success: Boolean!
    message: String!
  }
  type AddNotesResponse {
    success: Boolean!
    message: String!
  }

  type LogoutResponse {
    success: Boolean!
    message: String!
  }
  type Mutation {
    addReptile(input: AddReptileInput!): Reptile
    addNotes(id: ID!, notes: String!): AddNotesResponse!
    deleteReptile(id: ID!): DeleteReptileResponse!
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: LogoutResponse!
  }

  type Query {
    reptile(id: ID!): Reptile
    reptiles: [Reptile]
  }
`;
