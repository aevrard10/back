import mysql from "mysql2";

// Créer une connexion à la base de données
const connection = mysql.createConnection({
  host: "localhost", // Utilise 'localhost' ou '127.0.0.1'
  user: "root", // Ton utilisateur MySQL
  password: "", // Ton mot de passe MySQL
  database: "reptiles_db", // Le nom de ta base de données
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

export default connection;
