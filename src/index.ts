import express, { Application } from "express";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./shemas";
import { authenticateUser, resolvers } from "./resolvers";
import cron from "node-cron";
// Configuration des middlewares globaux
import cors from "cors";
import { sendDailyNotifications } from "./notifications/notificationService";
import connection from "./db";

import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
const app: Application = express();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,
  integrations: [
    Sentry.expressIntegration(),
    nodeProfilingIntegration(),
  ],
});
app.use(express.json({ limit: "10mb" })); // Parser les requêtes JSON
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
    if (!req.user?.id) {
      return res.status(401).json({ error: "Non autorisé" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier reçu" });
    }
    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Format de fichier invalide" });
    }

    const reptileId = req.body.reptileId;
    const uploadType = (req.body.type || "profile").toString();
    if (!reptileId) {
      return res.status(400).json({ error: "ID du reptile requis" });
    }

    const [rows] = await connection
      .promise()
      .query("SELECT id FROM reptiles WHERE id = ? AND user_id = ?", [
        reptileId,
        req.user.id,
      ]);
    if ((rows as any[]).length === 0) {
      return res.status(403).json({ error: "Reptile non autorisé" });
    }

    // Upload de l'image sur Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "repti-track", // Nom du dossier Cloudinary
        public_id: Date.now().toString(), // Identifiant unique pour l'image
      },
      async (error, result) => {
        if (error) {
          return res.status(500).json({ error: "Erreur Cloudinary", details: error });
        }

        // Si l'upload est réussi, récupère l'URL de l'image
        const imageUrl = result?.secure_url;

        if (uploadType === "gallery") {
          const [result] = await connection
            .promise()
            .query(
              `INSERT INTO reptile_photos (reptile_id, url) VALUES (?, ?)`,
              [reptileId, imageUrl]
            );
          // Répondre avec l'URL + id de photo
          res.json({
            imageUrl,
            photoId: (result as any).insertId,
          });
        } else {
          // Enregistrer l'URL comme photo principale
          await connection.promise().query(
            `UPDATE reptiles SET image_url = ? WHERE id = ?`,
            [imageUrl, reptileId]
          );

          // Répondre avec l'URL de l'image
          res.json({ imageUrl });
        }
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
  cache: "bounded",
  context: ({ req }: { req: { user?: any } }) => {
    return { user: req.user || null };
  },
});

// Planifier l'exécution de la vérification tous les jours à 8h00 du matin: 0 8 * * *
cron.schedule("0 8 * * *", async () => {
  const parseDate = (value: string | null) => {
    if (!value) return null;
    const normalized = value.replace(/\//g, "-");
    const parts = normalized.split("-");
    if (parts.length < 3) return null;
    const [year, month, day] = parts.map((p) => Number(p));
    if (!year || !month || !day) return null;
    return new Date(Date.UTC(year, month - 1, day));
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate();

  const shouldNotifyToday = (event: any, today: Date) => {
    const baseDate = parseDate(event.event_date);
    if (!baseDate) return false;

    const untilDate = parseDate(event.recurrence_until);
    if (untilDate && today > untilDate) return false;

    const recurrenceType = (event.recurrence_type || "NONE").toUpperCase();
    const interval = Number(event.recurrence_interval || 1);

    if (recurrenceType === "NONE") {
      return isSameDay(baseDate, today);
    }

    if (today < baseDate) return false;

    const diffMs = today.getTime() - baseDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (recurrenceType === "DAILY") {
      return diffDays % interval === 0;
    }

    if (recurrenceType === "WEEKLY") {
      return diffDays % (7 * interval) === 0;
    }

    if (recurrenceType === "MONTHLY") {
      const monthsDiff =
        (today.getUTCFullYear() - baseDate.getUTCFullYear()) * 12 +
        (today.getUTCMonth() - baseDate.getUTCMonth());
      return (
        monthsDiff % interval === 0 &&
        today.getUTCDate() === baseDate.getUTCDate()
      );
    }

    return false;
  };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // * * * * * pour tester toutes les minutes
  // Récupérer tous les utilisateurs avec leurs tokens Expo
  const [users] = await connection.promise().query(`
    SELECT id, expo_token FROM users WHERE expo_token IS NOT NULL
  `);

  // Pour chaque utilisateur, envoyer des notifications
  for (const user of users as any[]) {
    // Récupérer les événements (ponctuels + récurrents)
    const [events] = (await connection.promise().query(
      `
      SELECT * FROM reptile_events WHERE user_id = ?
    `,
      [user.id]
    )) as any[];

    const todaysEvents = (events as any[]).filter((event) =>
      shouldNotifyToday(event, today)
    );

    // Si des événements sont trouvés pour cet utilisateur aujourd'hui, envoyer une notification
    if (todaysEvents.length > 0) {
      const message = {
        body: `Vous avez ${todaysEvents.length} événement(s) aujourd'hui !`,
        data: { events: todaysEvents }, // Ajoutez des données supplémentaires si nécessaire
      };
      const notificationMessage = `Vous avez ${todaysEvents.length} événement(s) aujourd'hui !`;

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

  app.use(Sentry.expressErrorHandler());

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
