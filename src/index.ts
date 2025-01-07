import express, { Application } from "express";
import { ApolloServer } from "apollo-server-express";
import { typeDefs } from "./shemas";
import { authenticateUser, resolvers } from "./resolvers";
import bodyParser from "body-parser";
import path from "path";
import cron from "node-cron";
const app: Application = express();
// Configuration des middlewares globaux
import cors from "cors";
import { sendDailyNotifications } from "./notifications/notificationService";
import connection from "./db";

app.use(authenticateUser);
app.use(bodyParser.json()); // Parser les requêtes JSON
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(cors()); // Autoriser les requêtes cross-origin
// Configurer Apollo Server

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }: { req: { user?: any } }) => {
    console.log("Utilisateur authentifié :", req.user);
    return { user: req.user || null };
  },
});
// Planifier l'exécution de la vérification tous les jours à 8h00 du matin
cron.schedule("0 8 * * *", async () => {
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

      // Appeler la fonction sendDailyNotifications pour envoyer la notification
      sendDailyNotifications(user.expo_token, message);
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
  const port = 3030;
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
