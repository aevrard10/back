import { gql } from "apollo-server-express";

export const typeDefs = gql`
  type Reptile {
    id: ID!
    name: String!
    species: String!
    age: Int!
    last_fed: String!
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
  type Mutation {
    addReptile(input: AddReptileInput!): Reptile

    deleteReptile(id: ID!): DeleteReptileResponse!
  }

  type Query {
    reptiles: [Reptile]
  }
`;
