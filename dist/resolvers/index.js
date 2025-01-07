"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = exports.resolvers = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const reptileResolvers_1 = require("./reptileResolvers");
const authResolvers_1 = require("./authResolvers");
dotenv_1.default.config();
exports.resolvers = {
    Query: Object.assign(Object.assign({}, reptileResolvers_1.reptileResolvers.Query), authResolvers_1.authResolvers.Query),
    Mutation: Object.assign(Object.assign({}, authResolvers_1.authResolvers.Mutation), reptileResolvers_1.reptileResolvers.Mutation),
};
const authenticateUser = (req, res, next) => {
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
        const decoded = jsonwebtoken_1.default.verify(token, process.env.SECRET_KEY);
        req.user = decoded; // Ajouter les données utilisateur au contexte de la requête
        next();
    }
    catch (err) {
        console.error("Erreur de validation du token :", err);
        res.status(401).json({ message: "Token invalide ou expiré" });
    }
};
exports.authenticateUser = authenticateUser;
