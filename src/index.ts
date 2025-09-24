import express, { Application } from "express";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./shemas";
import { authenticateUser, resolvers } from "./resolvers";
import bodyParser from "body-parser";
import cron from "node-cron";
// Configuration des middlewares globaux
import cors from "cors";
import { sendDailyNotifications } from "./notifications/notificationService";
import connection from "./db";

import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
const app: Application = express();
app.use(bodyParser.json()); // Parser les requêtes JSON
app.use(cors()); // Autoriser les requêtes cross-origin
app.use(authenticateUser);

const port = process.env.PORT || 3030;
// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Configuration de Multer pour gérer l'upload
const storage = multer.memoryStorage(); // Utilise la mémoire pour stocker les fichiers temporairement
const upload = multer({ storage: storage });

// Route d'upload d'image
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier reçu" });
    }

    // Upload de l'image sur Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "repti-track", // Nom du dossier Cloudinary
        public_id: Date.now().toString(), // Identifiant unique pour l'image
      },
      async (error, result) => {
        if (error) {
          return res
            .status(500)
            .json({ error: "Erreur Cloudinary", details: error });
        }

        // Si l'upload est réussi, récupère l'URL de l'image
        const imageUrl = result?.secure_url;

        // Enregistrer l'URL dans la base de données
        const reptileId = req.body.reptileId; // ID du reptile que tu veux mettre à jour
        await connection.query(
          `UPDATE reptiles SET image_url = ? WHERE id = ?`,
          [imageUrl, reptileId]
        );

        // Répondre avec l'URL de l'image
        res.json({ imageUrl });
      }
    );

    // Convertir l'image en stream et l'envoyer à Cloudinary
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    console.error("Erreur lors de l'upload :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Configurer Apollo Server

// @ts-nocheck
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }: { req: { user?: any } }) => {
    console.log("Utilisateur authentifié :", req.user);
    return { user: req.user || null };
  },
});

// Planifier l'exécution de la vérification tous les jours à 8h00 du matin: 0 8 * * *
cron.schedule("0 8 * * *", async () => {
  // * * * * * pour tester toutes les minutes
  console.log("Vérification des événements du jour...");

  // Récupérer tous les utilisateurs avec leurs tokens Expo
  const [users] = await connection.query(`
    SELECT id, expo_token FROM users WHERE expo_token IS NOT NULL
  `);

  // Pour chaque utilisateur, envoyer des notifications
  for (const user of users as any[]) {
    console.log(`Envoi des notifications à l'utilisateur ${user.id}`);

    // Récupérer les événements du jour pour cet utilisateur
    const [events] = (await connection.query(
      `
      SELECT * FROM reptile_events WHERE user_id = ? AND DATE(event_date) = CURDATE()
    `,
      [user.id]
    )) as any[];

    // Si des événements sont trouvés pour cet utilisateur aujourd'hui, envoyer une notification
    if (events.length > 0) {
      const message = {
        body: `Vous avez ${events.length} événement(s) aujourd'hui !`,
        data: { events }, // Ajoutez des données supplémentaires si nécessaire
      };
      const notificationMessage = `Vous avez ${events.length} événement(s) aujourd'hui !`;

      const notificationQuery = `
        INSERT INTO notifications (user_id, message, sent, \`read\`) 
        VALUES (?, ?, ?, ?)
      `;
      await connection
        .query(notificationQuery, [user.id, notificationMessage, false, false])
        .catch((error) => {
          console.error(
            "Erreur lors de l'insertion de la notification :",
            error
          );
        });

      // Appeler la fonction sendDailyNotifications pour envoyer la notification
      sendDailyNotifications(user.expo_token, message)?.catch((error) => {
        console.error("Erreur lors de l'envoi de la notification :", error);
      });
    }
  }
});
// Fonction pour démarrer le serveur
async function startServer() {
  // Démarrage d'Apollo Server
  await server.start();

  // Lier Apollo Server avec Express via le middleware
  server.applyMiddleware({ app, path: "/graphql" });

  // Démarrage du serveur Express
  app.listen(port, () => {
    console.log(
      `🚀 Serveur démarré sur http://localhost:${port}${server.graphqlPath}`
    );
  });
}

// Lancer le serveur
startServer().catch((error) => {
  console.error("Erreur lors du démarrage du serveur :", error);
});
