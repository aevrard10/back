import { gql } from "apollo-server-express";

export const typeDefs = gql`
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
  type Mutation {
    addReptile(input: AddReptileInput!): Reptile
    addNotes(id: ID!, notes: String!): AddNotesResponse!
    deleteReptile(id: ID!): DeleteReptileResponse!
  }

  type Query {
    reptile(id: ID!): Reptile
    reptiles: [Reptile]
  }
`;
