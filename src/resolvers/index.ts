import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { NextFunction } from "express";
import { reptileResolvers } from "./reptileResolvers";
import { authResolvers } from "./authResolvers";
import { notificationsResolvers } from "./notificationsResolvers";
import { measurementResolvers } from "./measurementResolvers";
import { foodResolvers } from "./foodResolvers";
dotenv.config();

export const resolvers = {
  Query: {
    ...reptileResolvers.Query,
    ...authResolvers.Query,
    ...notificationsResolvers.Query,
    ...measurementResolvers.Query,
    ...foodResolvers.Query,
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
  const authHeader = req.headers.authorization || req.headers.token;
  
  console.log("req.headers", req.headers);
  console.log("authHeader", authHeader);

  if (!authHeader) {
    req.user = null;
    return next(); // Laisser passer les requêtes publiques
  }

  // Vérifier si le token commence par "Bearer " et l'extraire
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

  if (!token) {
    console.error("Jeton manquant dans l'en-tête Authorization");
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY!) as any;
    req.user = decoded; // Ajouter les infos utilisateur à la requête
  } catch (err) {
    console.error("Erreur de validation du token :", err);
    req.user = null; // Ne pas bloquer, juste invalider l'utilisateur
  }

  next(); // Passer au middleware suivant
};