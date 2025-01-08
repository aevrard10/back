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
  type MedicalRecord {
    date: String!
    diagnosis: String
    treatment: String
    vet_name: String
    notes: String
  }

  type Enclosure {
    id: ID!
    type: String!
    dimensions: String!
    temperature: String
    humidity: Int
    lighting: String
    notes: String
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
    lighting_requirements: String
    health_status: String
    last_vet_visit: String
    next_vet_visit: String
    medical_history: [MedicalRecord]
    behavior_notes: String
    handling_notes: String
    acquired_date: String
    origin: String
    location: String
    enclosure: Enclosure
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
  }

  type Measurement {
    id: ID!
    reptile_id: ID!
    date: String!
    weight: Float!
    size: Float!
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
    lighting_requirements: String
    health_status: String
    acquired_date: String
    origin: String
    location: String
    notes: String
    next_vet_visit: String!
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
  }

  type Query {
    measurements(reptile_id: ID!): [Measurement!]!
    getNotifications: [Notification!]!
    getUnreadNotificationsCount(user_id: Int!): Int!
    reptile(id: ID!): Reptile
    reptiles: [Reptile]
    reptileEvent: [ReptileEvent]
    currentUser: User
  }
`;
