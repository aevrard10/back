import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { NextFunction } from "express";
import { reptileResolvers } from "./reptileResolvers";
import { authResolvers } from "./authResolvers";
import { notificationsResolvers } from "./notificationsResolvers";
import { measurementResolvers } from "./measurementResolvers";
import { foodResolvers } from "./foodResolvers";
import { dashboardResolvers } from "./dashboardResolvers";
import { sensorResolvers } from "./sensorResolvers";
dotenv.config();

export const resolvers = {
  Query: {
    ...reptileResolvers.Query,
    ...authResolvers.Query,
    ...notificationsResolvers.Query,
    ...measurementResolvers.Query,
    ...foodResolvers.Query,
    ...dashboardResolvers.Query,
    ...sensorResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...reptileResolvers.Mutation,
    ...notificationsResolvers.Mutation,
    ...measurementResolvers.Mutation,
    ...foodResolvers.Mutation,
  },
};

export const authenticateUser = (req: any, res: any, next: NextFunction) => {
  const rawHeader = req.headers.authorization || req.headers.token;

  if (!rawHeader) {
    req.user = null;
    return next(); // Laisser passer les requêtes publiques
  }

  const headerValue = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
  const token = headerValue.startsWith("Bearer ")
    ? headerValue.split(" ")[1]
    : headerValue;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY!) as any;
    req.user = decoded; // Ajouter les infos utilisateur à la requête
  } catch {
    req.user = null; // Ne pas bloquer, juste invalider l'utilisateur
  }

  next(); // Passer au middleware suivant
};
