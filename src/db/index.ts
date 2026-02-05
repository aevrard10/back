import mysql from "mysql2";
import dotenv from "dotenv";

dotenv.config();

const buildConfigFromUrl = (url: string) => {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, "");

  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
  };
};

const getDbConfig = () => {
  const url =
    process.env.MYSQLPUBLICURL ??
    process.env.MYSQL_URL ??
    process.env.DATABASE_URL;

  if (url) {
    return buildConfigFromUrl(url);
  }

  return {
    host: process.env.MYSQLHOST, // Utilise le host de Railway
    user: process.env.MYSQLUSER, // Utilise l'utilisateur MySQL (root dans ton cas)
    password:
      process.env.MYSQL_ROOT_PASSWORD ?? process.env.MYSQLPASSWORD, // Mot de passe de la base de données
    database: process.env.MYSQL_DATABASE ?? process.env.MYSQLDATABASE, // Le nom de ta base de données
    port: Number(process.env.MYSQLPORT ?? process.env.MYSQL_PORT ?? 28949), // Port MySQL
  };
};

// Créer un pool de connexions à la base de données
const connection = mysql.createPool({
  ...getDbConfig(),
  connectTimeout: 20000, // Timeout de 20 secondes
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default connection;
