"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mysql2_1 = __importDefault(require("mysql2"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Créer une connexion à la base de données
const connection = mysql2_1.default.createConnection({
    host: process.env.DB_HOST, // Utilise 'localhost' ou '127.0.0.1'
    user: process.env.DB_USER, // Ton utilisateur MySQL
    password: "", // Ton mot de passe MySQL
    database: process.env.DB_NAME, // Le nom de ta base de données
    port: 3000,
});
// Tester la connexion
connection.connect((err) => {
    if (err) {
        console.error("Erreur de connexion à la base de données:", err);
        return;
    }
    console.log("Connecté à la base de données MySQL");
});
exports.default = connection;
