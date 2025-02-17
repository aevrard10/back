import express, { Application } from "express";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./shemas";
import { authenticateUser, resolvers } from "./resolvers";
import bodyParser from "body-parser";
import cron from "node-cron";
import cors from "cors";
import { sendDailyNotifications } from "./notifications/notificationService";
import connection from "./db";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const app: Application = express();
app.use(authenticateUser);
app.use(bodyParser.json());
app.use(cors());
const port = process.env.PORT || 3030;

const upload = multer({ dest: "uploads/" });

/**
 * Upload une image sur Txipics et retourne l'URL de l'image hébergée
 */
const uploadToTxipics = async (filePath: string): Promise<string | null> => {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    const response = await axios.post("https://txipics.com/api/upload", formData, {
      headers: { ...formData.getHeaders() },
    });

    return response.data.url;
  } catch (error) {
    console.error("Erreur lors de l'upload sur Txipics :", error);
    return null;
  }
};

// ✅ Endpoint d'upload qui utilise Txipics
app.post("/api/file-upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const id = req.body.id;

    if (!file || !id) {
      return res.status(400).send("Fichier ou reptileId manquant.");
    }

    const imageUrl = await uploadToTxipics(file.path);

    if (!imageUrl) {
      return res.status(500).send("Erreur lors de l'upload sur Txipics.");
    }

    // Supprimer le fichier temporaire après l'upload
    fs.unlinkSync(file.path);

    // Sauvegarder l'image_url dans la table reptiles
    const query = "UPDATE reptiles SET image_url = ? WHERE id = ?";
    await connection.promise().query(query, [imageUrl, id]);

    res.status(200).json({ url: imageUrl });
  } catch (error) {
    console.error("Erreur lors de l'upload :", error);
    res.status(500).send("Erreur lors de l'upload.");
  }
});

// ✅ Configurer Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }: { req: { user?: any } }) => {
    return { user: req.user || null };
  },
});

// ✅ Planification des notifications
cron.schedule("0 8 * * *", async () => {
  console.log("Vérification des événements du jour...");
  const [users] = await connection.promise().query(`
    SELECT id, expo_token FROM users WHERE expo_token IS NOT NULL
  `);

  for (const user of users as any[]) {
    const [events] = (await connection.promise().query(
      "SELECT * FROM reptile_events WHERE user_id = ? AND DATE(event_date) = CURDATE()",
      [user.id]
    )) as any[];

    if (events.length > 0) {
      const message = {
        body: `Vous avez ${events.length} événement(s) aujourd'hui !`,
        data: { events },
      };

      const notificationQuery = `
        INSERT INTO notifications (user_id, message, sent, \`read\`) 
        VALUES (?, ?, ?, ?)
      `;
      await connection.promise().query(notificationQuery, [user.id, message.body, false, false]);

      sendDailyNotifications(user.expo_token, message)?.catch(console.error);
    }
  }
});

// ✅ Démarrage du serveur
async function startServer() {
  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });

  app.listen(port, () => {
    console.log(`🚀 Serveur sur http://localhost:${port}${server.graphqlPath}`);
  });
}

startServer().catch(console.error);
