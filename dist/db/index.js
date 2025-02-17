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
    host: process.env.MYSQLHOST, // Utilise le host de Railway
    user: process.env.MYSQLUSER, // Utilise l'utilisateur MySQL (root dans ton cas)
    password: process.env.MYSQL_ROOT_PASSWORD, // Mot de passe de la base de données
    database: process.env.MYSQL_DATABASE, // Le nom de ta base de données
    port: 28949, // Port MySQL
    connectTimeout: 20000, // Timeout de 20 secondes
});
connection.connect((err) => {
    if (err) {
        console.error("Erreur de connexion à la base de données:", err);
        return;
    }
    console.log("Connecté à la base de données MySQL");
});
exports.default = connection;
