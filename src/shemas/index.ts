import { gql } from "apollo-server-express";
export const typeDefs = gql`
scalar Upload

type User {
  id: ID!
  username: String!
  email: String!
  expo_token: String
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

type Notification {
  id: Int!
  user_id: Int!
  message: String!
  sent: Boolean!
  read: Boolean
  created_at: String!
  sent_at: String
}

input LoginInput {
  email: String!
  password: String!
  expo_token: String
}

type Reptile {
  id: ID!
  name: String!
  species: String!
  sort_of_species: String
  sex: String
  age: Int!
  last_fed: String!
  feeding_schedule: String
  diet: String
  humidity_level: Int
  temperature_range: String
  health_status: String
  acquired_date: String
  origin: String
  location: String
  gallery: [String]
  documents: [String]
  notes: String
  image_url: String
}

input AddMeasurementInput {
  reptile_id: ID!
  date: String!
  weight: Float!
  size: Float!
  size_mesure: String!
  weight_mesure: String!
}

type Measurement {
  id: ID!
  reptile_id: ID!
  date: String!
  weight: Float!
  size: Float!
  size_mesure: String!
  weight_mesure: String!
}

input AddReptileInput {
  name: String!
  species: String!
  sort_of_species: String
  sex: String
  age: Int!
  last_fed: String
  feeding_schedule: String
  diet: String
  humidity_level: Int
  temperature_range: String
  health_status: String
  acquired_date: String
  origin: String
  location: String
  notes: String
}

input AddReptileEventInput {
  event_name: String!
  event_date: String!
  event_time: String!
  notes: String
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

type ReptileEvent {
  id: ID!
  event_date: String!
  event_name: String!
  event_time: String!
  notes: String
}
type LastFedUpdateResponse {
  success: Boolean!
  message: String!
}
  type FoodStock {
  id: ID!
  name: String!
  quantity: Int!
  unit: String!
 last_updated: String!
 type: String!
}

type FoodStockHistory {
  id: ID!
  food_id: ID!
  quantity_change: Int!
  reason: String
  date: String!
}

input UpdateFoodStockInput {
  food_id: ID!
  quantity_change: Int!
  reason: String
}

input AddFoodStockInput {
  name: String!
  quantity: Int!
  type: String!
}



type MutationResponse {
  success: Boolean!
  message: String!
}

type Mutation {
  addReptile(input: AddReptileInput!): Reptile
  addReptileEvent(input: AddReptileEventInput!): ReptileEvent
  addNotes(id: ID!, notes: String!): AddNotesResponse!
  deleteReptile(id: ID!): DeleteReptileResponse!
  register(input: RegisterInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  logout: LogoutResponse!
  addMeasurement(input: AddMeasurementInput!): Measurement
  markNotificationAsRead(id: Int!): Notification!
  markAllNotificationsAsRead(user_id: Int!): [Notification!]!
  lastFedUpdate(id: ID!, last_fed: String!): LastFedUpdateResponse
    updateFoodStock(input: UpdateFoodStockInput!): MutationResponse!
  addFoodStock(input: AddFoodStockInput!): FoodStock!
}

type Query {
  measurements(reptile_id: ID!): [Measurement!]!
  getNotifications: [Notification!]!
  getUnreadNotificationsCount(user_id: Int!): Int!
  reptile(id: ID!): Reptile
  reptiles: [Reptile]
  reptileEvent: [ReptileEvent]
  currentUser: User
    foodStock: [FoodStock!]!
  foodStockHistory: [FoodStockHistory!]!
}

`;
