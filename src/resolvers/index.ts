import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { NextFunction } from "express";
import { reptileResolvers } from "./reptileResolvers";
import { authResolvers } from "./authResolvers";
dotenv.config();

export const resolvers = {
  Query: {
    ...reptileResolvers.Query,
    ...authResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...reptileResolvers.Mutation,
  },
};

export const authenticateUser = (req: any, res: any, next: NextFunction) => {
  const authHeader = req.headers.token || req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return next(); // Laisser les requêtes publiques passer
  }

  const token = authHeader; // Récupère le jeton après "Bearer"

  if (!token) {
    console.error("Jeton manquant dans l'en-tête Authorization");
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY!);
    req.user = decoded; // Ajouter les données utilisateur au contexte de la requête
    next();
  } catch (err) {
    console.error("Erreur de validation du token :", err);
    res.status(401).json({ message: "Token invalide ou expiré" });
  }
};
