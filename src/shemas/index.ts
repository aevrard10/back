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

type ReptileGenetics {
  id: ID!
  reptile_id: ID!
  morph: String
  mutations: String
  hets: String
  traits: String
  lineage: String
  breeder: String
  hatch_date: String
  sire_name: String
  dam_name: String
  notes: String
  created_at: String!
  updated_at: String!
}

input ReptileGeneticsInput {
  reptile_id: ID!
  morph: String
  mutations: String
  hets: String
  traits: String
  lineage: String
  breeder: String
  hatch_date: String
  sire_name: String
  dam_name: String
  notes: String
}

type ReptileFeeding {
  id: ID!
  reptile_id: ID!
  food_id: ID
  food_name: String
  quantity: Float
  unit: String
  fed_at: String!
  notes: String
  created_at: String!
}

input AddReptileFeedingInput {
  reptile_id: ID!
  food_id: ID
  food_name: String
  quantity: Float
  unit: String
  fed_at: String!
  notes: String
}

type ReptileShed {
  id: ID!
  reptile_id: ID!
  shed_date: String!
  notes: String
  created_at: String!
}

input AddReptileShedInput {
  reptile_id: ID!
  shed_date: String!
  notes: String
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
  recurrence_type: RecurrenceType
  recurrence_interval: Int
  recurrence_until: String
}

input UpdateReptileEventInput {
  event_name: String!
  event_date: String!
  event_time: String!
  notes: String
  recurrence_type: RecurrenceType
  recurrence_interval: Int
  recurrence_until: String
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
  recurrence_type: RecurrenceType
  recurrence_interval: Int
  recurrence_until: String
}

enum RecurrenceType {
  NONE
  DAILY
  WEEKLY
  MONTHLY
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

type DashboardSummary {
  reptiles_count: Int!
  events_today: Int!
  unread_notifications: Int!
  upcoming_events: [ReptileEvent!]!
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
input ReptileInput {
  name: String!
  species: String!
  sort_of_species: String
  sex: String
  age: Int
  last_fed: String
  feeding_schedule: String
  diet: String
  humidity_level: String
  temperature_range: String
  health_status: String
  acquired_date: String
  origin: String
  location: String
  notes: String
}

type ReptileUpdateResponse {
  success: Boolean!
  message: String!
  reptile: Reptile
}

type Mutation {
  addReptile(input: AddReptileInput!): Reptile
  addReptileEvent(input: AddReptileEventInput!): ReptileEvent
  updateReptileEvent(id: ID!, input: UpdateReptileEventInput!): ReptileEvent
  deleteReptileEvent(id: ID!): MutationResponse!
  excludeReptileEventOccurrence(id: ID!, date: String!): MutationResponse!
  deleteReptilePhoto(id: ID!): MutationResponse!
  upsertReptileGenetics(input: ReptileGeneticsInput!): ReptileGenetics!
  addReptileFeeding(input: AddReptileFeedingInput!): ReptileFeeding!
  deleteReptileFeeding(id: ID!): MutationResponse!
  addReptileShed(input: AddReptileShedInput!): ReptileShed!
  deleteReptileShed(id: ID!): MutationResponse!
  addNotes(id: ID!, notes: String!): AddNotesResponse!
  deleteReptile(id: ID!): DeleteReptileResponse!
  register(input: RegisterInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  logout: LogoutResponse!
  addMeasurement(input: AddMeasurementInput!): Measurement
  markNotificationAsRead(id: Int!): Notification!
  markAllNotificationsAsRead: [Notification!]!
  lastFedUpdate(id: ID!, last_fed: String!): LastFedUpdateResponse
    updateFoodStock(input: UpdateFoodStockInput!): MutationResponse!
  addFoodStock(input: AddFoodStockInput!): FoodStock!
    updateReptile(id: ID!, input: ReptileInput!): ReptileUpdateResponse!

}

type Query {
  measurements(reptile_id: ID!): [Measurement!]!
  getNotifications: [Notification!]!
  getUnreadNotificationsCount: Int!
  reptile(id: ID!): Reptile
  reptiles: [Reptile]
  reptileEvent: [ReptileEvent]
  reptilePhotos(reptile_id: ID!): [ReptilePhoto!]!
  reptileGenetics(reptile_id: ID!): ReptileGenetics
  reptileFeedings(reptile_id: ID!): [ReptileFeeding!]!
  reptileSheds(reptile_id: ID!): [ReptileShed!]!
  currentUser: User
    foodStock: [FoodStock!]!
  foodStockHistory: [FoodStockHistory!]!
  dashboardSummary: DashboardSummary!
}

type ReptilePhoto {
  id: ID!
  reptile_id: ID!
  url: String!
  created_at: String!
}

`;
