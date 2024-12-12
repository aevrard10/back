import { gql } from "apollo-server-express";

export const typeDefs = gql`
  type Reptile {
    id: ID!
    name: String!
    species: String!
    age: Int!
    last_fed: String!
  }

  type Query {
    reptiles: [Reptile]
  }

  type Mutation {
    addReptile(
      name: String!
      species: String!
      age: Int!
      last_fed: String!
    ): Reptile
  }
`;
