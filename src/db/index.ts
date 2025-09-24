import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

// Créer une connexion à la base de données
const connection = mysql.createConnection({
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

export default connection;
