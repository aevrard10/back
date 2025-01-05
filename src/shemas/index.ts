import { gql } from "apollo-server-express";
export const typeDefs = gql`
  scalar Upload
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
    image_url: String
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
    addReptileImage(id: ID!, image: Upload!): Reptile
    deleteReptileImage(id: ID!): Reptile
  }
  type ReptileEvent {
    id: ID!
    event_date: String!
    event_name: String!
    event_time: String!
  }

  type Query {
    reptile(id: ID!): Reptile
    reptiles: [Reptile]
    reptileEvent: [ReptileEvent]
    currentUser: User
  }
`;
