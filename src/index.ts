import express, { Application } from "express";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./shemas";
import { authenticateUser, resolvers } from "./resolvers";
import bodyParser from "body-parser";
import path from "path";
import cron from "node-cron";
// Configuration des middlewares globaux
import cors from "cors";
import { sendDailyNotifications } from "./notifications/notificationService";
import connection from "./db";

import multer from "multer";
import db from "./db";

const app: Application = express();
app.use(authenticateUser);
app.use(bodyParser.json()); // Parser les requêtes JSON
app.use(cors()); // Autoriser les requêtes cross-origin
const port = 3030;
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "uploads")); // Le dossier où les fichiers sont stockés
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Ajout de l'extension du fichier
  },
});

const upload = multer({ storage: storage });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.post("/api/file-upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const id = req.body.id; // Envoyé depuis le frontend
    console.log("file", file);
    console.log("id", id);
    if (!file || !id) {
      return res.status(400).send("Fichier ou reptileId manquant.");
    }
    const image_url = `http://192.168.1.20:${port}/uploads/${file.filename}`;

    // const image_url = `/uploads/${file.filename}`;
    const query = "UPDATE reptiles SET image_url = ? WHERE id = ?";
    const values = [image_url, id];
    // Sauvegarder l'image_url dans la table reptiles
    await db.query(query, values);

    res.status(200).json({ url: image_url });
  } catch (error) {
    console.error("Erreur lors de l'upload :", error);
    res.status(500).send("Erreur lors de l'upload.");
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
  const [users] = await connection.promise().query(`
    SELECT id, expo_token FROM users WHERE expo_token IS NOT NULL
  `);

  // Pour chaque utilisateur, envoyer des notifications
  for (const user of users as any[]) {
    console.log(`Envoi des notifications à l'utilisateur ${user.id}`);

    // Récupérer les événements du jour pour cet utilisateur
    const [events] = (await connection.promise().query(
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
        .promise()
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
