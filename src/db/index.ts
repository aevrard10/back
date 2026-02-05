import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

// Créer un pool de connexions à la base de données
const connection = mysql.createPool({
  host: process.env.MYSQLHOST, // Utilise le host de Railway
  user: process.env.MYSQLUSER, // Utilise l'utilisateur MySQL (root dans ton cas)
  password: process.env.MYSQL_ROOT_PASSWORD, // Mot de passe de la base de données
  database: process.env.MYSQL_DATABASE, // Le nom de ta base de données
  port: Number(process.env.MYSQLPORT ?? process.env.MYSQL_PORT ?? 28949), // Port MySQL
  connectTimeout: 20000, // Timeout de 20 secondes
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default connection;
